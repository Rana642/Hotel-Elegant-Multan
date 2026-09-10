'use client';

import Link, { LinkProps } from 'next/link';
import { AnchorHTMLAttributes, ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';
import { fbqTrack } from '@/lib/metaPixel';
import { EVENT_TO_META_STANDARD } from '@/lib/metaEventMap';

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
    event: string;
    eventParams?: Record<string, unknown>;
  };

/**
 * next/link that also pushes a GTM dataLayer event on click. Unlike
 * TrackedLink (a plain <a>), this keeps client-side route transitions for
 * internal links (e.g. "Book Now" -> /booking) while still being usable
 * inside Server Component pages as a client leaf. Also fires the matching
 * Meta Pixel event directly (see metaEventMap) for the handful of `event`
 * names that used to only reach Meta via a GTM tag.
 */
export default function TrackedNavLink({ event, eventParams, onClick, children, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        trackEvent(event, eventParams);
        const metaEvent = EVENT_TO_META_STANDARD[event];
        if (metaEvent) fbqTrack(metaEvent, eventParams);
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
