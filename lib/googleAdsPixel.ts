'use client';

// Google Ads native conversion tracking — fired directly via gtag.js
// (loaded in app/layout.tsx). Mirrors lib/metaPixel.ts's pattern: one thin
// wrapper per destination.
//
// send_to values pulled straight from each conversion action's
// tag_snippets via the Google Ads API (customer 6223250696) — update the
// map below if an action is ever recreated (new label).

import { isInternalTraffic } from './trackingGuard';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Each conversion is sent to BOTH Google Ads accounts: the original one (AW-18370206861, customer 6223250696) and the
// account that runs the Elegant campaigns (AW-18202393540, customer 6684011164; actions "Site - ..." created 17 Nov 2026).
// gtag accepts an array in send_to and fires them together.
export const GADS_SEND_TO = {
  purchase:       ['AW-18370206861/_Ku1CIumit8cEI25zLdE', 'AW-18202393540/EpUTCObz-bkdEMT3yedD'], // Hotel Booking Purchase / Site - Booking Submit
  bookingLead:    ['AW-18370206861/hAXRCODG-94cEI25zLdE', 'AW-18202393540/yA_9CKHRg7odEMT3yedD'], // Booking Lead
  bookingStarted: ['AW-18370206861/nfXdCJOmi98cEI25zLdE', 'AW-18202393540/W4S0CJ7Rg7odEMT3yedD'], // Booking Started
  contactWhatsapp:['AW-18370206861/4OZpCMavi98cEI25zLdE', 'AW-18202393540/tfVuCJjRg7odEMT3yedD'], // WhatsApp Contact
  contactCall:    ['AW-18370206861/ZTTnCJzx-94cEI25zLdE', 'AW-18202393540/8j50CJvRg7odEMT3yedD'], // Call Contact
} as const;

export interface GoogleAdsConversionInput {
  /** One of GADS_SEND_TO's values — "AW-XXXXXXXXX/label". */
  sendTo: string | readonly string[];
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
  if (isInternalTraffic()) return;

  // Enhanced Conversions — must be set immediately before the conversion
  // event it should attach to.
  if (input.userData?.email || input.userData?.phone) {
    window.gtag('set', 'user_data', {
      email: input.userData.email || undefined,
      phone_number: input.userData.phone || undefined,
    });
  }

  window.gtag('event', 'conversion', {
    send_to: Array.isArray(input.sendTo) ? [...input.sendTo] : input.sendTo,
    value: typeof input.value === 'number' ? input.value : undefined,
    currency: input.currency || 'PKR',
    transaction_id: input.transactionId,
  });
}
