'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Check, MessageCircle, Phone as PhoneIcon } from 'lucide-react';
import { createInquiry } from '@/app/actions/inquiry';
import { trackEvent } from '@/lib/analytics';
import { fireGoogleAdsConversionDirect, GADS_SEND_TO } from '@/lib/googleAdsPixel';
import { readGuestProfile, saveGuestProfile } from '@/lib/guestProfile';

// Post-contact callback capture. <ContactIntentButton /> already opened
// WhatsApp / the dialer the instant the guest tapped — this card shows up
// right after, floating and dismissible, never blocking the chat/call that
// already happened. It asks for a callback number in case the chat drops
// or the call is missed; a guest who ignores it has lost nothing.
//
// This replaced a full-screen form that guests had to complete BEFORE
// reaching WhatsApp/the dialer. That gate was the direct cause of a 99.8%
// drop-off between "tapped WhatsApp" and "reached us" in the Meta/GA4
// funnel audit (1,950 taps -> 4 completed forms) — guests who just want to
// message or call were being asked to fill in a name + required phone
// number first. Removing the gate is the fix; this card is what's left of
// the lead-capture value, offered for free instead of charged as a toll.

export type ContactChannel = 'whatsapp' | 'call';

export interface ContactFollowupCardProps {
  channel: ContactChannel;
  open: boolean;
  onClose: () => void;
  /** Optional room context — not shown here, kept for future use / parity
   *  with the button's props. */
  roomName?: string;
}

/** Pulls the first-touch attribution JSON that <UtmCapture /> put in sessionStorage. */
function readAttribution(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem('he_ad_attribution');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function pageUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.href;
}

export default function ContactFollowupCard({
  channel,
  open,
  onClose,
}: ContactFollowupCardProps) {
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Hydrate from the browser-local guest profile once, on first client
  // mount — same convenience the old modal had. Doesn't overwrite anything
  // the guest has already typed.
  useEffect(() => {
    setMounted(true);
    const profile = readGuestProfile();
    let hydrated = false;
    if (profile.name && !name) { setName(profile.name); hydrated = true; }
    if (profile.phone && !phone) { setPhone(profile.phone); hydrated = true; }
    if (hydrated) setPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset transient state whenever the card is (re)opened for a fresh tap.
  useEffect(() => {
    if (open) { setError(''); setSaved(false); }
  }, [open]);

  // Auto-dismiss a few seconds after a successful save — nothing left for
  // the guest to do once they see the confirmation.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [saved, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (trimmedPhone.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    // Remember for next visit, same as before.
    saveGuestProfile({ name: trimmedName || undefined, phone: trimmedPhone });

    const [guestFirstName, ...rest] = trimmedName ? trimmedName.split(/\s+/) : [];
    const guestLastName = rest.join(' ') || undefined;
    // Fallback label only for guests who skip the name field — every
    // submission here came from an active WhatsApp/Call tap, so "booking"
    // intent is a safe default without asking them to pick.
    const fallbackName = channel === 'whatsapp' ? 'WhatsApp Guest' : 'Call Guest';

    startTransition(async () => {
      const result = await createInquiry({
        guestName: trimmedName || fallbackName,
        guestFirstName: guestFirstName || undefined,
        guestLastName,
        guestPhone: trimmedPhone,
        preferredChannel: channel,
        intent: 'booking',
        attribution: readAttribution(),
        sourceUrl: pageUrl(),
      });
      trackEvent('contact_intent_submitted', { channel, intent: 'booking' });

      fireGoogleAdsConversionDirect({
        sendTo: GADS_SEND_TO.bookingLead,
        transactionId: result.inquiryId || undefined,
        userData: { phone: trimmedPhone },
      });

      if (!result.success) {
        setError(result.error || 'Could not save — please try again.');
        return;
      }
      setSaved(true);
    });
  }

  if (!mounted || !open) return null;

  const isWhatsApp = channel === 'whatsapp';
  const Icon = isWhatsApp ? MessageCircle : PhoneIcon;
  const themeColor = isWhatsApp ? '#25D366' : '#E30613';

  const inputClass = 'w-full min-w-0 border border-gray-200 px-3 py-2 text-sm font-montserrat outline-none focus:border-[#1A0B2E] transition-colors rounded';

  return createPortal(
    <div
      className="fixed z-[90] left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:left-auto md:right-5 md:bottom-5 md:w-[340px] animate-[slideUp_0.25s_ease-out]"
      role="complementary"
      aria-label="Leave a callback number"
    >
      <style>{`@keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-4 relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-700 p-1"
          type="button"
        >
          <X size={16} />
        </button>

        {saved ? (
          <div className="flex items-start gap-2.5 pr-4 py-1">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <Check size={16} className="text-green-600" />
            </div>
            <div>
              <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Got it, thank you!</p>
              <p className="font-montserrat text-xs text-gray-500 mt-0.5">
                We&apos;ll call you back if the {isWhatsApp ? 'chat' : 'call'} doesn&apos;t go through.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 pr-4 mb-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${themeColor}15` }}
              >
                <Icon size={15} style={{ color: themeColor }} />
              </div>
              <div className="min-w-0">
                <p className="font-montserrat font-semibold text-sm text-[#1A0B2E] leading-tight">
                  Opened {isWhatsApp ? 'WhatsApp' : 'the dialer'} for you
                </p>
                <p className="font-montserrat text-[11px] text-gray-500 leading-tight">
                  Didn&apos;t go through? Leave your number
                </p>
              </div>
            </div>

            {prefilled && (
              <div className="rounded bg-green-50 border border-green-100 px-2.5 py-1.5 text-[10px] text-green-700 font-montserrat mb-2">
                ✓ Auto-filled from your last visit
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className={inputClass}
                maxLength={80}
              />
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className={inputClass}
                  maxLength={30}
                  inputMode="tel"
                  autoComplete="tel"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="shrink-0 px-4 text-white font-semibold text-xs uppercase tracking-wide rounded transition-opacity disabled:opacity-70"
                  style={{ backgroundColor: themeColor }}
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
              </div>
              {error && (
                <p className="text-[11px] text-[#E30613] font-montserrat">{error}</p>
              )}
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
