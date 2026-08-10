'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { fireGoogleAdsConversion } from '@/lib/googleAdsClient';

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
 *      view. NOT imported to Google Ads any more, so no double-count risk.
 *
 *   2. Google Ads native gtag `conversion` — fires directly to Google Ads
 *      in near-real-time (< 3h vs. the 24-48h delay we used to get from
 *      importing the GA4 key event). This is what Smart Bidding now
 *      optimises against, alongside the completion-time server-side event
 *      in app/actions/ga4.ts (which stays as authoritative revenue truth).
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

    fireGoogleAdsConversion({
      event: 'gads_purchase',
      value,
      currency: 'PKR',
      transactionId: bookingRef,
      userData: { email: guestEmail, phone: guestPhone },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingRef]);

  return null;
}
