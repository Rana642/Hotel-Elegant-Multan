import { GADS_SEND_TO } from './googleAdsPixel';

// Maps this site's internal GA4 event names to Meta's standard Pixel
// events, for the handful of TrackedLink / TrackedNavLink click sites
// (About, Contact, Home, Policy, Footer, Privacy, Terms — plain tel:/wa.me
// links, not routed through ContactIntentButton). Kept as one small lookup
// so both components share it instead of duplicating the mapping inline.
export const EVENT_TO_META_STANDARD: Record<string, string> = {
  call_click: 'Contact',
  whatsapp_click: 'Contact',
  book_now_click: 'InitiateCheckout',
};

// Same click sites → Google Ads conversion actions. Without this, every
// WhatsApp/Call tap on a TrackedLink (LP, home, footer, contact…) reached
// GA4 and Meta but never Google Ads, which is why the "WhatsApp Contact" and
// "Call Contact" actions sat at 0 conversions.
export const EVENT_TO_GADS_SEND_TO: Record<string, string> = {
  call_click: GADS_SEND_TO.contactCall,
  whatsapp_click: GADS_SEND_TO.contactWhatsapp,
};
