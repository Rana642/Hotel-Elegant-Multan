'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, MessageCircle, Phone as PhoneIcon } from 'lucide-react';
import { createInquiry } from '@/app/actions/inquiry';
import { buildWhatsAppLink, WHATSAPP_NUMBER, formatDate } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

// Pre-contact intent capture. Wraps any WhatsApp / Call CTA on the site:
// when the guest clicks, they see this modal, fill in Name (+ optional
// phone/email/dates + intent), and only then land on wa.me / tel:. The
// submit path saves a row in the `inquiries` table and fires a hashed
// Meta CAPI Lead event so staff-closed WhatsApp bookings can be
// attributed back to the ad that drove the click. A prominent "Skip"
// link never traps guests who refuse the form — they hop straight
// through to the original chat/call URL.

export type ContactChannel = 'whatsapp' | 'call';

export interface ContactIntentModalProps {
  channel: ContactChannel;
  open: boolean;
  onClose: () => void;
  /** Optional room context — appears in the WhatsApp message so reception
   *  can see which room the guest was browsing when they clicked. */
  roomName?: string;
  /** Overrides the default `tel:` / `wa.me` destination if provided. */
  targetOverride?: string;
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

/** Build the WhatsApp message reception will see. Front-loads the intent
 *  ("BOOKING" vs "INQUIRY") in bold so staff can triage the message with
 *  one glance — the biggest UX complaint from front-desk staff is having
 *  to read the whole message to figure out whether it's a real booking. */
function buildWhatsAppMessage(fields: {
  intent: 'booking' | 'info';
  name: string;
  phone?: string;
  email?: string;
  roomName?: string;
  checkIn?: string;
  checkOut?: string;
}): string {
  const isBooking = fields.intent === 'booking';
  const lines: string[] = [];
  lines.push(
    isBooking
      ? '*BOOKING REQUEST*'
      : '*INQUIRY / Rates Check*'
  );
  lines.push('');
  lines.push(
    isBooking
      ? 'Hi Hotel Elegant Executive Suites Multan! I\'d like to book a room. Details:'
      : 'Hi Hotel Elegant Executive Suites Multan! I\'d like to check availability and rates:'
  );
  lines.push('');
  lines.push(`• *Name:* ${fields.name}`);
  if (fields.phone) lines.push(`• *Phone:* ${fields.phone}`);
  if (fields.email) lines.push(`• *Email:* ${fields.email}`);
  if (fields.roomName) lines.push(`• *Interested in:* ${fields.roomName}`);
  if (fields.checkIn && fields.checkOut) {
    lines.push(`• *Dates:* ${formatDate(fields.checkIn)} → ${formatDate(fields.checkOut)}`);
  } else if (fields.checkIn) {
    lines.push(`• *Check-in:* ${formatDate(fields.checkIn)}`);
  }
  lines.push('');
  lines.push('_Sent from elegant-suite.com_');
  return lines.join('\n');
}

export default function ContactIntentModal({
  channel,
  open,
  onClose,
  roomName,
  targetOverride,
}: ContactIntentModalProps) {
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [intent, setIntent]     = useState<'booking' | 'info'>('booking');
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [error, setError]       = useState('');
  const [mounted, setMounted]   = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) {
      setError('');
      setCheckIn('');
      setCheckOut('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function destinationUrl(customMessage?: string): string {
    if (targetOverride) return targetOverride;
    if (channel === 'whatsapp') {
      const msg = customMessage ?? 'Hello Hotel Elegant Executive Suites Multan!';
      return buildWhatsAppLink(msg);
    }
    return `tel:+${WHATSAPP_NUMBER}`;
  }

  function openChat(customMessage?: string) {
    const url = destinationUrl(customMessage);
    if (channel === 'whatsapp') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  function handleSkip() {
    trackEvent('contact_modal_skipped', { channel });
    // Skip path — no user data collected, so send a generic message. If a
    // room was in context, mention it so reception has at least SOME clue.
    const genericMsg = roomName
      ? `Hi Hotel Elegant! I'm interested in the ${roomName}.`
      : 'Hello Hotel Elegant Executive Suites Multan!';
    openChat(genericMsg);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      setError('Check-out must be after check-in.');
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email or leave it blank.');
      return;
    }

    // Build the WhatsApp message NOW from what the guest entered so
    // reception immediately sees whether this is a booking or an inquiry.
    const waMsg = buildWhatsAppMessage({
      intent,
      name: trimmedName,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      roomName,
      checkIn:  checkIn  || undefined,
      checkOut: checkOut || undefined,
    });

    startTransition(async () => {
      const result = await createInquiry({
        guestName: trimmedName,
        guestPhone: phone.trim() || undefined,
        guestEmail: email.trim() || undefined,
        preferredChannel: channel,
        intent,
        checkIn:  checkIn  || undefined,
        checkOut: checkOut || undefined,
        attribution: readAttribution(),
        sourceUrl: pageUrl(),
      });
      trackEvent('contact_intent_submitted', { channel, intent });
      if (!result.success) {
        setError(result.error || 'Save failed, but we\'ll still connect you.');
      }
      openChat(waMsg);
      onClose();
    });
  }

  if (!mounted || !open) return null;

  const isWhatsApp = channel === 'whatsapp';
  const Icon = isWhatsApp ? MessageCircle : PhoneIcon;
  const themeColor = isWhatsApp ? '#25D366' : '#E30613';
  const actionLabel = isWhatsApp ? 'Open WhatsApp' : 'Call now';

  const inputClass = 'w-full min-w-0 border border-gray-200 px-3 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E] transition-colors rounded';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 overflow-x-hidden overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cim-title"
    >
      {/* max-w-full on top of md:max-w-md so no child (long word, wide
          input) can ever push this past the phone's right edge. w-full +
          max-w-full together are redundant on paper but survive
          contradictory parent widths in the wild. */}
      <div
        className="w-full max-w-full md:max-w-md bg-white rounded-t-2xl md:rounded-lg shadow-xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — kept compact on mobile so form area gets max real estate. */}
        <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Icon size={18} style={{ color: themeColor }} />
            </div>
            <div className="min-w-0">
              <h2 id="cim-title" className="font-playfair font-semibold text-[#1A0B2E] text-base md:text-lg leading-tight truncate">
                Quick details 👋
              </h2>
              <p className="text-[11px] text-gray-500 font-montserrat leading-tight">
                So we can serve you faster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 p-1 shrink-0"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body — content taller than the viewport (esp. on
            small phones with a dropped keyboard) scrolls inside the modal
            rather than pushing the whole page. */}
        <form onSubmit={handleSubmit} className="px-4 md:px-5 py-4 space-y-3.5 overflow-y-auto overflow-x-hidden flex-1 w-full max-w-full">
          {/* Intent — top so it steers everything below it. */}
          <div>
            <p className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1.5 font-montserrat">
              You want to
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'booking', label: 'Book a room' },
                { value: 'info',    label: 'Check rates' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 border rounded cursor-pointer transition-all font-montserrat text-xs md:text-sm min-w-0 ${
                    intent === opt.value
                      ? 'border-[#1A0B2E] bg-[#1A0B2E] text-white font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="intent"
                    value={opt.value}
                    checked={intent === opt.value}
                    onChange={() => setIntent(opt.value as 'booking' | 'info')}
                    className="sr-only"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1.5 font-montserrat">
              Your name <span className="text-[#E30613]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ali Ahmed"
              className={inputClass}
              maxLength={80}
              autoFocus
              required
            />
          </div>

          {/* Phone + email — both optional. Kept small; adding them costs
              only 2 fields but saves reception when a call is missed. */}
          <div>
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1.5 font-montserrat">
              Phone <span className="text-gray-400 normal-case font-normal tracking-normal">(optional — helps if call is missed)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0317-XXX-XXXX"
              className={inputClass}
              maxLength={30}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1.5 font-montserrat">
              Email <span className="text-gray-400 normal-case font-normal tracking-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
              maxLength={120}
              inputMode="email"
              autoComplete="email"
            />
          </div>

          {/* Dates only shown for booking intent — reduces friction when
              guest just wants a rate. Flex column on mobile / two columns
              on sm+ so date pickers don't get squished on narrow screens. */}
          {intent === 'booking' && (
            <div className="rounded-md bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-2 font-montserrat">
                Dates <span className="text-gray-400 normal-case font-normal tracking-normal">— optional, ok to skip</span>
              </p>
              <div className="flex flex-col md:grid md:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className={inputClass + ' text-xs'}
                  aria-label="Check-in"
                />
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || undefined}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={inputClass + ' text-xs'}
                  aria-label="Check-out"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-[#E30613] bg-red-50 border border-red-200 px-3 py-2 rounded font-montserrat">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 text-white font-semibold text-sm uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
            style={{ backgroundColor: themeColor }}
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Icon size={16} />
                {actionLabel}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-xs text-gray-400 hover:text-gray-700 font-montserrat underline underline-offset-2"
          >
            Skip, open {isWhatsApp ? 'WhatsApp' : 'dialer'} directly
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
