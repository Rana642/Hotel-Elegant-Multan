'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

// GA4's automatic page_view is disabled (send_page_view: false, see
// app/layout.tsx), so this is the only source of page_view events — one
// fire on mount (initial load) and one per pathname change, covering
// client-side route transitions too. Reads the query string from
// window.location directly rather than useSearchParams() so this never
// needs a Suspense boundary (same trick UtmCapture uses).
export default function GA4PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackEvent('page_view', {
      page_path: pathname + window.location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
