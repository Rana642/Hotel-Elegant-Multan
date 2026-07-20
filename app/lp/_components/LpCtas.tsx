'use client';

import { useEffect, useState, ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';
import {
  HOTEL_TEL,
  HOTEL_WHATSAPP_LINK,
  type LpVariantKey,
} from '@/lib/lpConfig';
import { buildBookingHref } from './UtmCapture';

interface CtaProps {
  variant: LpVariantKey;
  /** Where on the page this CTA sits (for analytics granularity). */
  location: string;
  className?: string;
  children: ReactNode;
}

/** 🟢 WhatsApp CTA — fires `whatsapp_click`. */
export function WhatsAppCta({ variant, location, className, children }: CtaProps) {
  return (
    <a
      href={HOTEL_WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() =>
        trackEvent('whatsapp_click', {
          lp_variant: variant,
          source: 'landing_page',
          location,
        })
      }
    >
      {children}
    </a>
  );
}

/** 📞 Call CTA — fires `call_click`. */
export function CallCta({ variant, location, className, children }: CtaProps) {
  return (
    <a
      href={HOTEL_TEL}
      className={className}
      onClick={() =>
        trackEvent('call_click', { lp_variant: variant, source: 'landing_page', location })
      }
    >
      {children}
    </a>
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
