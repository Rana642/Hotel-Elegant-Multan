'use client';

import { useState } from 'react';
import ReservationModal from './ReservationModal';

/**
 * Room-card "Check Availability": opens the dates/occupancy popup for this
 * room, then lands on /reservations with the room listed first (deals
 * visible) and the guest form one tap away — instead of detouring through
 * the room detail page. "View Room" is a separate link on the card.
 */
export default function CheckAvailabilityButton({
  roomSlug,
  roomName,
  className,
  onClick,
  children,
}: {
  roomSlug: string;
  roomName: string;
  className?: string;
  /** Extra analytics fired on tap (e.g. the LP's booking_start). */
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          onClick?.();
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open && <ReservationModal roomSlug={roomSlug} roomName={roomName} onClose={() => setOpen(false)} />}
    </>
  );
}
