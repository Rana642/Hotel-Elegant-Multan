'use client';

import { useEffect } from 'react';

/** Query-string keys we preserve for ad attribution. */
export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'kw',
];

/**
 * Read UTM / click-id params from the landing URL and stash them in
 * sessionStorage so the booking form (a separate page) can attribute the
 * booking to the right ad source. Runs once on mount; only writes when at
 * least one relevant param is present so it never clobbers an earlier value.
 */
export default function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const captured: Record<string, string> = {};
      for (const key of UTM_KEYS) {
        const val = params.get(key);
        if (val) captured[key] = val;
      }
      if (Object.keys(captured).length > 0) {
        captured.lp_landing_path = window.location.pathname;
        captured.captured_at = new Date().toISOString();
        sessionStorage.setItem('he_ad_attribution', JSON.stringify(captured));
      }
    } catch {
      /* sessionStorage unavailable (private mode) — non-critical */
    }
  }, []);

  return null;
}

/**
 * Build a "/booking" href that carries the current UTM params through, so
 * attribution survives the click from the landing page to the booking page.
 * Returns just "/booking" during SSR / before mount.
 */
export function buildBookingHref(): string {
  if (typeof window === 'undefined') return '/booking';
  try {
    const src = new URLSearchParams(window.location.search);
    const out = new URLSearchParams();
    for (const key of UTM_KEYS) {
      if (key === 'kw') continue; // kw is a headline hint, not booking attribution
      const val = src.get(key);
      if (val) out.set(key, val);
    }
    const qs = out.toString();
    return qs ? `/booking?${qs}` : '/booking';
  } catch {
    return '/booking';
  }
}
