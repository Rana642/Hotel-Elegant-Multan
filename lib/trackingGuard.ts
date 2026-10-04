'use client';

// Shared "should this event leave the browser?" checks for the tracking
// wrappers (lib/analytics.ts, lib/googleAdsPixel.ts, lib/metaPixel.ts).
// The tracking-init script in app/layout.tsx sets window.__heInternal for
// browsers that have opened /admin; this covers client-side navigation too,
// where that script doesn't re-run.

declare global {
  interface Window {
    __heInternal?: boolean;
  }
}

export function onAdminPage(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
}

/** Staff browser or admin page — never send ad-platform events from here. */
export function isInternalTraffic(): boolean {
  if (typeof window === 'undefined') return true;
  if (onAdminPage()) {
    window.__heInternal = true;
    try { localStorage.setItem('he_internal', '1'); } catch { /* non-critical */ }
    return true;
  }
  return window.__heInternal === true;
}
