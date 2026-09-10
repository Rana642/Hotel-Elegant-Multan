'use client';

import { AnchorHTMLAttributes } from 'react';
import { trackEvent } from '@/lib/analytics';
import { fbqTrack } from '@/lib/metaPixel';
import { EVENT_TO_META_STANDARD } from '@/lib/metaEventMap';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  event: string;
  eventParams?: Record<string, unknown>;
}

/**
 * Plain <a> that also pushes a GTM dataLayer event on click. A client
 * component "leaf" so it can be dropped into server-rendered pages (Footer,
 * static pages) without converting the whole page to a client component.
 * Also fires the matching Meta Pixel event directly (see metaEventMap) for
 * the handful of `event` names that used to only reach Meta via a GTM tag.
 */
export default function TrackedLink({ event, eventParams, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        trackEvent(event, eventParams);
        const metaEvent = EVENT_TO_META_STANDARD[event];
        if (metaEvent) fbqTrack(metaEvent, eventParams);
        onClick?.(e);
      }}
    />
  );
}
