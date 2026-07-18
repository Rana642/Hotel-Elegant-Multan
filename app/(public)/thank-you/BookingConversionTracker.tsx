'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

interface Props {
  bookingRef: string;
  roomName: string;
  value: number;
}

/**
 * Fires the real booking conversion event once, on the confirmation page
 * only (this page only renders after a booking is successfully created).
 * Renders nothing — a tracking-only client leaf inside the server page.
 */
export default function BookingConversionTracker({ bookingRef, roomName, value }: Props) {
  useEffect(() => {
    trackEvent('booking_submitted', {
      booking_ref: bookingRef,
      room: roomName,
      value,
      currency: 'PKR',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingRef]);

  return null;
}
