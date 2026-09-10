'use client';

// Google Ads native conversion tracking — fired DIRECTLY via gtag.js (loaded
// in app/layout.tsx), not through GTM. Mirrors lib/metaPixel.ts's pattern:
// one thin wrapper per destination, called at the same funnel points GTM's
// "GAds - *" tags used to cover.
//
// send_to values pulled straight from each conversion action's
// tag_snippets via the Google Ads API (customer 6223250696) — update the
// map below if an action is ever recreated (new label).

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GADS_SEND_TO = {
  purchase:       'AW-18370206861/_Ku1CIumit8cEI25zLdE', // Hotel Booking Purchase
  bookingLead:    'AW-18370206861/hAXRCODG-94cEI25zLdE', // Booking Lead
  bookingStarted: 'AW-18370206861/nfXdCJOmi98cEI25zLdE', // Booking Started
  contactWhatsapp:'AW-18370206861/4OZpCMavi98cEI25zLdE', // WhatsApp Contact
  contactCall:    'AW-18370206861/ZTTnCJzx-94cEI25zLdE', // Call Contact
} as const;

export interface GoogleAdsConversionInput {
  /** One of GADS_SEND_TO's values — "AW-XXXXXXXXX/label". */
  sendTo: string;
  value?: number;
  currency?: string;
  /** Booking ref — lets Google Ads dedupe if this fires more than once for
   *  the same booking. */
  transactionId?: string;
  /** Raw email / phone for Enhanced Conversions. gtag hashes them
   *  client-side before sending — do NOT pre-hash. */
  userData?: { email?: string | null; phone?: string | null };
}

export function fireGoogleAdsConversionDirect(input: GoogleAdsConversionInput): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  // Enhanced Conversions — must be set immediately before the conversion
  // event it should attach to.
  if (input.userData?.email || input.userData?.phone) {
    window.gtag('set', 'user_data', {
      email: input.userData.email || undefined,
      phone_number: input.userData.phone || undefined,
    });
  }

  window.gtag('event', 'conversion', {
    send_to: input.sendTo,
    value: typeof input.value === 'number' ? input.value : undefined,
    currency: input.currency || 'PKR',
    transaction_id: input.transactionId,
  });
}
