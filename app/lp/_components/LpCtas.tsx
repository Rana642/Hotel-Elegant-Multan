'use client';

import { useEffect, useState, ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';
import { type LpVariantKey } from '@/lib/lpConfig';
import { buildBookingHref } from './UtmCapture';
import ContactIntentButton from '@/app/_components/ContactIntentButton';

interface CtaProps {
  variant: LpVariantKey;
  /** Where on the page this CTA sits (for analytics granularity). */
  location: string;
  className?: string;
  children: ReactNode;
}

/** 🟢 WhatsApp CTA — routes through the intent-capture modal so ad-driven
 *  clicks produce a named lead (+ hashed Meta CAPI Lead event) instead of
 *  a cookie-only browser event Meta can't match to a booking later.
 *  The legacy whatsapp_click GA4 event still fires on the initial tap so
 *  paid-traffic dashboards keep the lp_variant dimension we've been
 *  tracking against. */
export function WhatsAppCta({ variant, location, className, children }: CtaProps) {
  return (
    <ContactIntentButton
      channel="whatsapp"
      className={className}
      ariaLabel="WhatsApp the hotel"
      onClick={() =>
        trackEvent('whatsapp_click', {
          lp_variant: variant,
          source: 'landing_page',
          location,
        })
      }
    >
      {children}
    </ContactIntentButton>
  );
}

/** 📞 Call CTA — same modal wrap as WhatsApp. */
export function CallCta({ variant, location, className, children }: CtaProps) {
  return (
    <ContactIntentButton
      channel="call"
      className={className}
      ariaLabel="Call the hotel"
      onClick={() =>
        trackEvent('call_click', {
          lp_variant: variant,
          source: 'landing_page',
          location,
        })
      }
    >
      {children}
    </ContactIntentButton>
  );
}

/**
 * 🔴 "Check Availability" / Book CTA — fires `booking_start` and links to
 * /booking with UTM params preserved. The href is resolved on the client after
 * mount so the current query string can be read; it defaults to /booking.
 */
export function BookCta({ variant, location, className, children }: CtaProps) {
  const [href, setHref] = useState('/booking');

  useEffect(() => {
    setHref(buildBookingHref());
  }, []);

  return (
    <a
      href={href}
      className={className}
      onClick={() =>
        trackEvent('booking_start', { lp_variant: variant, source: 'landing_page', location })
      }
    >
      {children}
    </a>
  );
}
