'use client';

import { AnchorHTMLAttributes } from 'react';
import { trackEvent } from '@/lib/analytics';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  event: string;
  eventParams?: Record<string, unknown>;
}

/**
 * Plain <a> that also pushes a GTM dataLayer event on click. A client
 * component "leaf" so it can be dropped into server-rendered pages (Footer,
 * static pages) without converting the whole page to a client component.
 */
export default function TrackedLink({ event, eventParams, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        trackEvent(event, eventParams);
        onClick?.(e);
      }}
    />
  );
}
