'use client';

// Google Ads native conversion tracking — via GTM. Pushes rich, structured
// dataLayer events that GTM converts into `Google Ads Conversion Tracking`
// tags configured in the GTM UI. This is the "GTM-managed" path: the
// conversion IDs live in GTM (not in code / env vars), so marketing can add
// or change conversion actions without a redeploy.
//
// Each fire pushes ONE distinctive event name (gads_purchase / gads_lead /
// etc.) — GTM triggers key on those names alone, so no misfires from GA4's
// own recommended events. All extra fields sit at the top level of the push
// so GTM data-layer variables can read them directly.
//
// Enhanced Conversions: raw email/phone go into conversion_user_data. The
// GTM tag references those DL variables in its `user_provided_data` config
// and Google's client hashes them before send — we NEVER pre-hash here.
// Kept separate from lib/analytics.ts (the plain GTM helper for GA4 events)
// so it's obvious at the call-site that this fire is for Google Ads.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type GoogleAdsEvent =
  | 'gads_purchase'         // completed booking (thank-you page)
  | 'gads_lead'             // modal submit — booking intent (strong)
  | 'gads_booking_start'    // modal submit — info intent (weak)
  | 'gads_contact_whatsapp' // opened WhatsApp (submit or skip)
  | 'gads_contact_call';    // opened dialer (submit or skip)

export type GoogleAdsUserData = {
  email?: string | null;
  phone?: string | null;
};

interface FireConversionInput {
  event: GoogleAdsEvent;
  /** Monetary value — sent for Purchase only; Contact/Lead have no revenue. */
  value?: number;
  /** ISO-4217 currency code. Defaults to PKR (this account's currency). */
  currency?: string;
  /** Stable per-event id (booking_ref, inquiry id). Google dedupes on it. */
  transactionId?: string;
  /** Raw email / phone for Enhanced Conversions. gtag hashes them
   *  client-side inside the GTM tag — do NOT pre-hash. */
  userData?: GoogleAdsUserData;
}

export function fireGoogleAdsConversion(input: FireConversionInput): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: input.event,
    conversion_value: typeof input.value === 'number' ? input.value : undefined,
    conversion_currency: input.currency || 'PKR',
    conversion_transaction_id: input.transactionId,
    conversion_user_data: input.userData
      ? {
          email: input.userData.email || undefined,
          phone: input.userData.phone || undefined,
        }
      : undefined,
  });
}
