'use client';

// Short source code appended to every pre-filled WhatsApp message, e.g.
// "Hello Hotel Elegant! (Ref: FB)". WhatsApp chats leave no click id behind,
// so this is the only way reception can tell which channel a WhatsApp guest
// came from — and pick the matching "Ad source" in Admin → New booking.
//
//   GA  = Google Ads click          FB  = Facebook / Instagram ad
//   GS  = Google organic search     WEB = anything else (direct, referral…)
//
// When an ad's URL carries its own code in utm_content (e.g. utm_content=MW1),
// it is appended so a specific campaign can be traced: "Ref: FB-MW1".

interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
}

function readAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem('he_ad_attribution');
    if (raw) return JSON.parse(raw) as Attribution;
  } catch {
    /* sessionStorage unavailable — fall through to the current URL */
  }
  // UtmCapture may not have run yet on the very first tick — read the URL.
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get('utm_source') || undefined,
      utm_medium: p.get('utm_medium') || undefined,
      utm_content: p.get('utm_content') || undefined,
      gclid: p.get('gclid') || undefined,
      fbclid: p.get('fbclid') || undefined,
      referrer: document.referrer ? new URL(document.referrer).hostname : '',
    };
  } catch {
    return {};
  }
}

export function getAttributionRef(): string {
  if (typeof window === 'undefined') return 'WEB';
  const a = readAttribution();
  const src = (a.utm_source || '').toLowerCase();
  const medium = (a.utm_medium || '').toLowerCase();
  const paid = /cpc|paid|ppc|ads?$/.test(medium);

  let code = 'WEB';
  if (a.gclid || (src === 'google' && paid)) code = 'GA';
  else if (a.fbclid || ['facebook', 'fb', 'ig', 'instagram', 'an', 'meta'].includes(src)) code = 'FB';
  else if (src === 'google' || /(^|\.)google\./.test(a.referrer || '')) code = 'GS';

  const campaignCode = (a.utm_content || '').toUpperCase();
  if (/^[A-Z]{1,3}\d{1,3}$/.test(campaignCode)) code += `-${campaignCode}`;
  return code;
}

/** Message text with the source code appended. */
export function withAttributionRef(message: string): string {
  return `${message} (Ref: ${getAttributionRef()})`;
}

/** Rewrite a wa.me / api.whatsapp.com link so its pre-filled text carries the
 *  source code. Links without text get a default greeting. Non-WhatsApp
 *  links are returned unchanged. */
export function addRefToWhatsAppHref(href: string): string {
  try {
    const url = new URL(href);
    if (!/(^|\.)wa\.me$|whatsapp\.com$/.test(url.hostname)) return href;
    const text = url.searchParams.get('text') || 'Hello Hotel Elegant Executive Suites Multan!';
    if (/\(Ref: [A-Z]/.test(text)) return href;
    url.searchParams.set('text', withAttributionRef(text));
    return url.toString();
  } catch {
    return href;
  }
}
