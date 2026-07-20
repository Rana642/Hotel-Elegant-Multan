'use client';

import Link, { LinkProps } from 'next/link';
import { AnchorHTMLAttributes, ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';

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
 * inside Server Component pages as a client leaf.
 */
export default function TrackedNavLink({ event, eventParams, onClick, children, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        trackEvent(event, eventParams);
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
