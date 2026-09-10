'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { fbqTrack } from '@/lib/metaPixel';

// Fires Meta's standard ViewContent event when a guest lands on a room
// detail page. ViewContent is the "showed interest in a specific product"
// signal — Meta uses it for retargeting audiences ("people who viewed
// Executive King but didn't book") and for optimising ads.

interface Props {
  slug: string;
  name: string;
  price: number;
}

export default function ViewContentTracker({ slug, name, price }: Props) {
  useEffect(() => {
    // GA4 dataLayer push (GTM reads this for GA4 reporting only now — the
    // Meta side fires directly below, no GTM hop).
    trackEvent('view_room', {
      content_ids: [slug],
      content_name: name,
      content_type: 'product',
      content_category: 'Hotel Room',
      currency: 'PKR',
      value: price || 0,
    });
    // Meta Pixel — direct, not via GTM.
    fbqTrack('ViewContent', {
      content_ids: [slug],
      content_name: name,
      content_type: 'product',
      content_category: 'Hotel Room',
      currency: 'PKR',
      value: price || 0,
    });
    // Deliberate one-shot — depends only on which page loaded, not on re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return null;
}
