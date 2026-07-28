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
  /** Optional pre-filled WhatsApp message. Falls back to the modal default. */
  waMessage?: string;
  /** Explicit destination override (rare — usually let the modal build it). */
  href?: string;
  /** Passed through to the button for a11y / test hooks. */
  ariaLabel?: string;
}

export default function ContactIntentButton({
  channel,
  className,
  children,
  waMessage,
  href,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </button>
      <ContactIntentModal
        channel={channel}
        open={open}
        onClose={() => setOpen(false)}
        waMessage={waMessage}
        targetOverride={href}
      />
    </>
  );
}
