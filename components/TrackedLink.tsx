'use client';

import { AnchorHTMLAttributes } from 'react';
import { trackEvent } from '@/lib/analytics';
import { fbqTrack } from '@/lib/metaPixel';
import { fireGoogleAdsConversionDirect } from '@/lib/googleAdsPixel';
import { EVENT_TO_META_STANDARD, EVENT_TO_GADS_SEND_TO } from '@/lib/metaEventMap';
import { addRefToWhatsAppHref } from '@/lib/attributionRef';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  event: string;
  eventParams?: Record<string, unknown>;
}

/**
 * Plain <a> that also fires a GA4 event on click. A client component "leaf"
 * so it can be dropped into server-rendered pages (Footer, static pages)
 * without converting the whole page to a client component. Also fires the
 * matching Meta Pixel event and Google Ads conversion directly (see
 * metaEventMap) for the `event` names that have one, and stamps WhatsApp
 * links with the visitor's source code (see lib/attributionRef.ts).
 */
export default function TrackedLink({ event, eventParams, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        trackEvent(event, eventParams);
        const metaEvent = EVENT_TO_META_STANDARD[event];
        if (metaEvent) fbqTrack(metaEvent, eventParams);
        const gadsSendTo = EVENT_TO_GADS_SEND_TO[event];
        if (gadsSendTo) fireGoogleAdsConversionDirect({ sendTo: gadsSendTo });
        // Rewriting href inside the click handler, before the browser's
        // default navigation, is enough — the new URL is the one followed.
        if (rest.href) e.currentTarget.href = addRefToWhatsAppHref(rest.href);
        onClick?.(e);
      }}
    />
  );
}
