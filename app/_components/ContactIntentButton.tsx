'use client';

import { useState } from 'react';
import ContactIntentModal, { ContactChannel } from './ContactIntentModal';

// Drop-in wrapper around any WhatsApp / Call CTA. Instead of the child being
// an <a href="wa.me/..."> that hops the guest away directly, the child is
// rendered as a button that opens the pre-contact modal — the actual hop
// happens after the modal collects Name + intent (or the guest skips).
// Existing styling is preserved: pass whatever className / children you
// already had, and this component just adds the modal behaviour on top.

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
   *  modal opens). Useful for legacy GA4/GTM analytics that measure raw
   *  click intent — the modal's own contact_intent_submitted event fires
   *  after the form is filled, so both signals are captured. */
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
      <ContactIntentModal
        channel={channel}
        open={open}
        onClose={() => setOpen(false)}
        roomName={roomName}
        targetOverride={href}
      />
    </>
  );
}
