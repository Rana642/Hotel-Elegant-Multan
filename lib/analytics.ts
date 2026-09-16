'use client';

// GA4 event tracking — fired DIRECTLY via gtag.js (loaded in app/layout.tsx),
// not through GTM. Mirrors lib/googleAdsPixel.ts / lib/metaPixel.ts's
// pattern: one thin wrapper per destination, called at the same funnel
// points GTM's dataLayer-based GA4 tag used to cover.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Keep in sync with the server-side GA4_MEASUREMENT_ID env var
// (lib/ga4Mp.ts) — same property, just the client-safe NEXT_PUBLIC_ copy.
const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || 'G-43MJRNXTDB';

/** Fire a GA4 event directly via gtag.js. Safe to call before gtag.js has
 *  finished loading — window.gtag is defined synchronously (queues on
 *  window.dataLayer internally) as soon as app/layout.tsx's init script runs. */
export function trackEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event, { ...params, send_to: GA4_MEASUREMENT_ID });
}
