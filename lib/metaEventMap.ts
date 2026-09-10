// Maps this site's internal GA4/GTM event names to Meta's standard Pixel
// events, for the handful of TrackedLink / TrackedNavLink click sites
// (About, Contact, Home, Policy, Footer, Privacy, Terms — plain tel:/wa.me
// links, not routed through ContactIntentButton) that used to reach Meta
// only via a GTM Custom HTML tag keyed on the same trigger name. Kept as
// one small lookup so both components share it instead of duplicating the
// mapping inline.
export const EVENT_TO_META_STANDARD: Record<string, string> = {
  call_click: 'Contact',
  whatsapp_click: 'Contact',
  book_now_click: 'InitiateCheckout',
};
