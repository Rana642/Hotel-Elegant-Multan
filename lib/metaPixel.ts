'use client';

// Meta Pixel — fired directly from the page, so there's no extra
// script-load / trigger-evaluation hop between the user action and the
// event reaching Meta. The base snippet lives in app/layout.tsx; this file
// is just a thin, safe wrapper around window.fbq for the rest of the app
// to call.
//
// Every event that also has a server-side Conversions API counterpart
// (see lib/metaCapi.ts) MUST pass the SAME eventID here as the server
// sends — that's what lets Meta deduplicate the browser + server copies
// of the same real-world action into one counted event, instead of
// double-counting it.
//
// Debugging note: events with product params (ViewContent, Purchase) are
// sent by fbevents.js as a hidden-form POST to facebook.com/tr, which does
// NOT show up in performance.getEntriesByType('resource') — only small GET
// events (PageView) do. Use Meta Events Manager → Test events to verify.

import { isInternalTraffic } from './trackingGuard';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function fbqTrack(
  eventName: string,
  params: Record<string, unknown> = {},
  eventID?: string,
) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (isInternalTraffic()) return;
  if (eventID) {
    window.fbq('track', eventName, params, { eventID });
  } else {
    window.fbq('track', eventName, params);
  }
}
