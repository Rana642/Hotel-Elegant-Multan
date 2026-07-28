'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, MessageCircle, Phone as PhoneIcon } from 'lucide-react';
import { createInquiry } from '@/app/actions/inquiry';
import { buildWhatsAppLink, WHATSAPP_NUMBER } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

// Pre-contact intent capture. Wraps any WhatsApp / Call CTA on the site:
// when the guest clicks, they see this modal, fill in Name + intent (dates
// optional), and only then land on wa.me / tel:. The submit path saves a
// row in the `inquiries` table and fires a hashed Meta CAPI Lead event so
// staff-closed WhatsApp bookings can be attributed back to the ad that
// drove the click. A prominent "Skip" link never traps guests who refuse
// the form — they hop straight through to the original chat/call URL.

export type ContactChannel = 'whatsapp' | 'call';

export interface ContactIntentModalProps {
  channel: ContactChannel;
  open: boolean;
  onClose: () => void;
  /** Message pre-filled into the WhatsApp chat when channel='whatsapp'. */
  waMessage?: string;
  /** Overrides the default `tel:` / `wa.me` destination if provided. */
  targetOverride?: string;
}

const DEFAULT_WA_MESSAGE = `Hello Hotel Elegant Executive Suites Multan! I'd like to check room availability and pricing.`;

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

/** Where the click happened, used as event_source_url for CAPI. */
function pageUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.href;
}

export default function ContactIntentModal({
  channel,
  open,
  onClose,
  waMessage = DEFAULT_WA_MESSAGE,
  targetOverride,
}: ContactIntentModalProps) {
  const [name, setName]         = useState('');
  const [intent, setIntent]     = useState<'booking' | 'info'>('booking');
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [error, setError]       = useState('');
  const [mounted, setMounted]   = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setMounted(true); }, []);

  // Reset error / dates when the modal closes so a re-open feels fresh, but
  // keep the name — repeat visitors shouldn't have to retype it.
  useEffect(() => {
    if (!open) {
      setError('');
      setCheckIn('');
      setCheckOut('');
    }
  }, [open]);

  // Close on Esc — same UX convention as every dismissible modal on the web.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Build the destination URL for this channel. Skip and successful submit
  // both open the same URL — only difference is whether we saved a row first.
  function destinationUrl(): string {
    if (targetOverride) return targetOverride;
    if (channel === 'whatsapp') return buildWhatsAppLink(waMessage);
    return `tel:+${WHATSAPP_NUMBER}`;
  }

  function openChat() {
    const url = destinationUrl();
    // Same-tab for tel:, new tab for wa.me — matches how real users expect
    // both channels to behave on mobile.
    if (channel === 'whatsapp') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  function handleSkip() {
    // GA4-friendly event so we can measure how many people bail on the
    // modal. Deliberately a NEW event name (not whatsapp_click / call_click)
    // so no Meta Pixel Lead tag fires from this path — the CAPI Lead is
    // our single source of truth for named leads.
    trackEvent('contact_modal_skipped', { channel });
    openChat();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      setError('Check-out must be after check-in.');
      return;
    }
    startTransition(async () => {
      // Fire-and-hop: we call the action, but don't gate the chat open on
      // its success — a slow DB shouldn't feel like the site is broken.
      const result = await createInquiry({
        guestName: trimmed,
        preferredChannel: channel,
        intent,
        checkIn:  checkIn  || undefined,
        checkOut: checkOut || undefined,
        attribution: readAttribution(),
        sourceUrl: pageUrl(),
      });
      // GA4-only event for funnel measurement — the CAPI Lead has already
      // fired server-side (see createInquiry), so we deliberately DON'T
      // use whatsapp_click/call_click here (those would double-fire Meta).
      trackEvent('contact_intent_submitted', { channel, intent });
      if (!result.success) {
        // Save failed — still open chat, but tell them we couldn't log it.
        // Never block the primary action.
        setError(result.error || 'Save failed, but we\'ll still connect you.');
      }
      openChat();
      onClose();
    });
  }

  if (!mounted || !open) return null;

  const isWhatsApp = channel === 'whatsapp';
  const Icon = isWhatsApp ? MessageCircle : PhoneIcon;
  const themeColor = isWhatsApp ? '#25D366' : '#E30613';
  const actionLabel = isWhatsApp ? 'Open WhatsApp' : 'Call now';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cim-title"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Icon size={18} style={{ color: themeColor }} />
            </div>
            <div>
              <h2 id="cim-title" className="font-playfair font-semibold text-[#1A0B2E] text-lg leading-tight">
                Just your name 👋
              </h2>
              <p className="text-[11px] text-gray-500 font-montserrat">
                Takes 5 seconds, helps us serve you faster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 p-1"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-wider uppercase text-gray-500 mb-1.5 font-montserrat">
              Your name <span className="text-[#E30613]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ali Ahmed"
              className="w-full border border-gray-200 px-3.5 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E] transition-colors rounded"
              maxLength={80}
              autoFocus
              required
            />
          </div>

          <div>
            <p className="block text-[11px] font-semibold tracking-wider uppercase text-gray-500 mb-2 font-montserrat">
              You want to
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'booking', label: 'Book a room' },
                { value: 'info',    label: 'Check rates only' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 border rounded cursor-pointer transition-all font-montserrat text-sm ${
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
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Dates only relevant if they said Book — hide to reduce clutter otherwise. */}
          {intent === 'booking' && (
            <div className="rounded-md bg-gray-50 border border-gray-100 p-3">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-2 font-montserrat">
                Dates <span className="text-gray-400 normal-case font-normal tracking-normal">— optional, ok to skip</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  placeholder="Check-in"
                  className="w-full border border-gray-200 px-2.5 py-2 text-xs font-montserrat outline-none focus:border-[#1A0B2E] transition-colors rounded"
                />
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || undefined}
                  onChange={(e) => setCheckOut(e.target.value)}
                  placeholder="Check-out"
                  className="w-full border border-gray-200 px-2.5 py-2 text-xs font-montserrat outline-none focus:border-[#1A0B2E] transition-colors rounded"
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
