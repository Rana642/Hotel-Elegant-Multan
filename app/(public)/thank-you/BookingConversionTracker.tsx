'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { fireGoogleAdsConversionDirect, GADS_SEND_TO } from '@/lib/googleAdsPixel';
import { fbqTrack } from '@/lib/metaPixel';
import { clearBookingIntent } from '@/lib/bookingIntent';

interface Props {
  bookingRef: string;
  roomName: string;
  value: number;
  /** Optional guest email/phone → sent as Enhanced Conversion user_data so
   *  Google can match this booking back to the ad click even when the
   *  gclid/cookie was lost. Raw values; gtag hashes them client-side. */
  guestEmail?: string | null;
  guestPhone?: string | null;
}

/**
 * Client-side conversion signal fired once on the confirmation page. Two
 * things happen here now:
 *
 *   1. GA4 dataLayer push (`booking_created`) — kept for GA4's own funnel
 *      view (still goes through GTM for that; unrelated to the direct
 *      Ads/Meta fires below).
 *
 *   2. Google Ads native gtag `conversion` — fired DIRECTLY (see
 *      lib/googleAdsPixel.ts), not via GTM, so there's no extra hop
 *      between page load and the conversion reaching Ads. Near-real-time
 *      signal (< 3h) for Smart Bidding, alongside the completion-time
 *      server-side event in app/actions/ga4.ts (authoritative revenue
 *      truth).
 *
 * Purchase value is the submitted grand_total. It can still shift before
 * check-out (stay extension, cancellation) — the server-side completion
 * event is the reconciled source; this one just gives Ads a fast signal
 * to start bidding on the campaign that produced the click.
 */
export default function BookingConversionTracker({
  bookingRef,
  roomName,
  value,
  guestEmail,
  guestPhone,
}: Props) {
  useEffect(() => {
    trackEvent('booking_created', {
      booking_ref: bookingRef,
      room: roomName,
      value,
      currency: 'PKR',
    });

    fireGoogleAdsConversionDirect({
      sendTo: GADS_SEND_TO.purchase,
      value,
      currency: 'PKR',
      transactionId: bookingRef,
      userData: { email: guestEmail, phone: guestPhone },
    });

    // Meta Pixel Purchase — direct, not via GTM. eventID MUST match the
    // server-side CAPI event_id (`booking-completed-${bookingRef}`, see
    // lib/metaCapi.ts / fireBookingSubmittedCapi) so Meta deduplicates the
    // browser + server copies of this same booking into one conversion
    // instead of counting it twice.
    fbqTrack(
      'Purchase',
      {
        value,
        currency: 'PKR',
        content_ids: [bookingRef],
        content_name: roomName,
        content_type: 'product',
        content_category: 'Hotel Booking',
      },
      `booking-completed-${bookingRef}`,
    );

    // Meta Pixel CompleteRegistration — mirrors GTM's "Meta -
    // CompleteRegistration - Booking" tag (also keyed on booking_created).
    // Separate signal from Purchase — some campaigns optimise for "booking
    // request submitted" specifically rather than the revenue event.
    fbqTrack('CompleteRegistration', {
      content_name: roomName,
      status: true,
    });

    // Booking is done — drop the saved intent so the "Continue your booking"
    // prompt doesn't keep nagging a guest who already finished.
    clearBookingIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingRef]);

  return null;
}
