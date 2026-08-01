'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

interface Props {
  bookingRef: string;
  roomName: string;
  value: number;
}

/**
 * Fires a client-side signal once, on the confirmation page only (this page
 * only renders after a booking is successfully created). Renders nothing —
 * a tracking-only client leaf inside the server page.
 *
 * Named 'booking_created' — NOT 'booking_submitted' — on purpose. Google
 * Ads' "Purchase" conversion action imports the GA4 key event named
 * 'booking_submitted', and that event is now sent exclusively server-side
 * (app/actions/ga4.ts) when the booking is marked Completed, with the true
 * final value. If this early, unconfirmed-booking client event still used
 * the same name, Google Ads would double-count every booking (once here at
 * submission with no reliable value, once again server-side at completion)
 * and the whole point of moving to completion-time tracking would be lost.
 * This event still carries the `value` param for GA4's own funnel view
 * (submitted vs. actually-completed), it just isn't the one Ads imports.
 */
export default function BookingConversionTracker({ bookingRef, roomName, value }: Props) {
  useEffect(() => {
    trackEvent('booking_created', {
      booking_ref: bookingRef,
      room: roomName,
      value,
      currency: 'PKR',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingRef]);

  return null;
}
