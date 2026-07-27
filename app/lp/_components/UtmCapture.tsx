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
 * First-touch attribution capture: on the visitor's very first page in this
 * session, save UTMs + click ids + referrer + landing path to sessionStorage.
 * The booking form reads this later, so a booking that came from a Facebook
 * ad (utm_source=facebook) or Google organic (referrer=google.com) can be
 * distinguished from a "direct" one. Never overwrites an earlier capture in
 * the same session — first touch wins, as it should for attribution.
 */
export default function UtmCapture() {
  useEffect(() => {
    try {
      // First-touch: if we've already captured this session, do nothing
      if (sessionStorage.getItem('he_ad_attribution')) return;

      const params = new URLSearchParams(window.location.search);
      const captured: Record<string, string> = {};
      for (const key of UTM_KEYS) {
        const val = params.get(key);
        if (val) captured[key] = val;
      }

      // Always record landing context — even for organic/direct visitors
      // where no UTMs are present. Referrer host lets us tell "google.com"
      // (organic search) vs "" (direct/typed URL) apart in reports.
      captured.landing_path = window.location.pathname;
      try {
        captured.referrer = document.referrer
          ? new URL(document.referrer).hostname
          : '';
      } catch {
        captured.referrer = '';
      }
      captured.captured_at = new Date().toISOString();

      sessionStorage.setItem('he_ad_attribution', JSON.stringify(captured));
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
