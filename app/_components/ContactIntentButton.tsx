'use client';

import { useState } from 'react';
import ContactFollowupCard, { ContactChannel } from './ContactIntentModal';
import { buildWhatsAppLink, WHATSAPP_NUMBER } from '@/lib/utils';
import { fireGoogleAdsConversionDirect, GADS_SEND_TO } from '@/lib/googleAdsPixel';
import { fbqTrack } from '@/lib/metaPixel';

// Drop-in wrapper around any WhatsApp / Call CTA. Tapping it does two
// things, in order:
//
//   1. Opens WhatsApp / the dialer IMMEDIATELY — never gated behind a form.
//      A guest who taps "WhatsApp" expects the chat to open now; that's
//      the whole point of the button, and every hour spent on this funnel
//      the previous form-first version lost ~99.8% of taps at that gate
//      (1,950 taps -> 4 completed forms, per the Meta/GA4 audit).
//   2. Shows a small, non-blocking "leave your number" follow-up card —
//      entirely optional, never traps the guest, only captures a callback
//      number for reception + a stronger Lead signal for the ad platforms
//      if the guest chooses to fill it in.
export type { ContactChannel };

interface Props {
  channel: ContactChannel;
  className?: string;
  children: React.ReactNode;
  /** Optional room context — shown in the WhatsApp message so reception
   *  knows which room the guest was browsing when they clicked. */
  roomName?: string;
  /** Explicit destination override (rare — usually let the button build it). */
  href?: string;
  /** Passed through to the button for a11y / test hooks. */
  ariaLabel?: string;
  /** Extra callback fired the moment the button is clicked. Useful for
   *  analytics that measure raw click intent. */
  onClick?: () => void;
}

export default function ContactIntentButton({
  channel,
  className,
  children,
  roomName,
  href,
  ariaLabel,
  onClick,
}: Props) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (onClick) onClick();

    // Contact goal — fires unconditionally on every tap, whether or not
    // the guest later fills the follow-up card. This is the Contacts KPI
    // Google Ads/Meta optimise for.
    fireGoogleAdsConversionDirect({
      sendTo: channel === 'whatsapp' ? GADS_SEND_TO.contactWhatsapp : GADS_SEND_TO.contactCall,
    });
    fbqTrack('Contact', { content_name: roomName || 'General enquiry', channel });

    // Open WhatsApp / the dialer right now — no form in the way.
    const target = href
      ? href
      : channel === 'whatsapp'
        ? buildWhatsAppLink(
            roomName
              ? `Hi Hotel Elegant! I'm interested in the ${roomName}.`
              : 'Hello Hotel Elegant Executive Suites Multan!',
          )
        : `tel:+${WHATSAPP_NUMBER}`;

    if (channel === 'whatsapp') {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = target;
    }

    // Then, separately, offer the optional callback-number card.
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </button>
      <ContactFollowupCard
        channel={channel}
        open={open}
        onClose={() => setOpen(false)}
        roomName={roomName}
      />
    </>
  );
}
