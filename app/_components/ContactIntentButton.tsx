'use client';

import { useState } from 'react';
import ContactIntentModal, { ContactChannel } from './ContactIntentModal';
import { buildWhatsAppLink, WHATSAPP_NUMBER } from '@/lib/utils';

// Drop-in wrapper around any WhatsApp / Call CTA. When the pre-contact
// inquiry modal is enabled, the child is rendered as a button that opens
// the modal — the actual hop to wa.me / tel: happens after the modal
// collects Name + intent (or the guest skips). When disabled, the button
// hops the guest straight to WhatsApp / dialer, mirroring the original
// plain-link behaviour. Existing styling is preserved: pass whatever
// className / children you already had.
//
// Flip INQUIRY_MODAL_ENABLED to re-enable the capture flow — no other
// file needs to change, callers already pass channel + roomName + onClick.
const INQUIRY_MODAL_ENABLED = false;

interface Props {
  channel: ContactChannel;
  className?: string;
  children: React.ReactNode;
  /** Optional room context — shown in the WhatsApp message so reception
   *  knows which room the guest was browsing when they clicked. */
  roomName?: string;
  /** Explicit destination override (rare — usually let the modal build it). */
  href?: string;
  /** Passed through to the button for a11y / test hooks. */
  ariaLabel?: string;
  /** Extra callback fired the moment the button is clicked (before the
   *  modal opens or the direct hop). Useful for GA4/GTM analytics that
   *  measure raw click intent. */
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

    if (INQUIRY_MODAL_ENABLED) {
      setOpen(true);
      return;
    }

    // Modal disabled — direct hop, same as the original plain link.
    // Uses the same helpers ContactIntentModal would use internally.
    if (href) {
      if (channel === 'whatsapp') {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = href;
      }
      return;
    }
    if (channel === 'whatsapp') {
      const msg = roomName
        ? `Hi Hotel Elegant! I'm interested in the ${roomName}.`
        : 'Hello Hotel Elegant Executive Suites Multan!';
      window.open(buildWhatsAppLink(msg), '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = `tel:+${WHATSAPP_NUMBER}`;
    }
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
      {INQUIRY_MODAL_ENABLED && (
        <ContactIntentModal
          channel={channel}
          open={open}
          onClose={() => setOpen(false)}
          roomName={roomName}
          targetOverride={href}
        />
      )}
    </>
  );
}
