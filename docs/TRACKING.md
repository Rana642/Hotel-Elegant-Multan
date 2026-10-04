# Tracking Map — Hotel Elegant (GA4 · Google Ads · Meta)

Complete reference of every event the site fires, where it fires, and what
it's for. Use this when tuning campaigns, building audiences, or debugging
why a number looks off. **Last verified live: 2026-10-04.**

Everything fires directly from the page (gtag.js for GA4 + Google Ads, fbq
for Meta) plus Meta CAPI from server actions — no tag-manager container.

---

## How tracking loads

- `app/layout.tsx` renders an inline `tracking-init` script in `<head>`:
  defines `window.gtag` / `window.fbq` queues **before React hydrates**
  (mount-time events like `view_room` and thank-you conversions used to be
  dropped by the old `afterInteractive` race), then loads gtag.js
  (`AW-18370206861`, GA4 `G-43MJRNXTDB`) and the Meta Pixel
  (`27407654508906433`) async.
- **No Meta `<noscript>` image** — Next hoisted it to a preload and it sent a
  duplicate PageView on every load.
- **Staff traffic** (`lib/trackingGuard.ts`):
  - `/admin/*` loads no tracking at all.
  - A browser that has opened `/admin` is flagged `he_internal=1`
    (localStorage): GA4 still records it, tagged `traffic_type=internal`
    (filter it with GA4 → Admin → Data filters → Internal traffic), and no
    Google Ads / Meta events are sent. `?he_internal=0` clears the flag.
- Wrappers: `lib/analytics.ts` (GA4), `lib/googleAdsPixel.ts` (Ads),
  `lib/metaPixel.ts` (Meta). Click-site → Meta/Ads mapping lives in
  `lib/metaEventMap.ts`.

---

## Browser events (funnel order)

| Visitor action | GA4 | Google Ads conversion | Meta Pixel | Fired from |
|---|---|---|---|---|
| Any page | `page_view` | — (tag loads) | PageView | `GA4PageViewTracker`, init script |
| Room detail page | `view_room` | — | ViewContent | `rooms/[slug]/ViewContentTracker.tsx` |
| Booking form dates settle (~1.2 s) | `search_availability` | — | Search | `booking/BookingForm.tsx` |
| "Book Now" click | `book_now_click` | — | InitiateCheckout | `TrackedLink` / `TrackedNavLink` |
| WhatsApp button | `whatsapp_click` | **WhatsApp Contact** | Contact | `ContactIntentButton` (header, sticky bar, floating, room/home sections, LP), `TrackedLink` (footer, contact, policy…), contact form |
| Call button | `call_click` | **Call Contact** | Contact | same as above |
| Optional callback card submitted | `contact_intent_submitted` | Booking Lead | Lead (via CAPI) | `ContactIntentModal.tsx` |
| Booking submitted → `/thank-you` | `booking_created` | **Hotel Booking Purchase** (value, transaction_id, enhanced conversions) | **Purchase** (value) + CompleteRegistration | `thank-you/BookingConversionTracker.tsx` |

Notes:
- `ContactIntentButton` sends its own GA4 event unless the caller passes
  `onClick` (the LP CTAs do, adding `lp_variant`) — so no double counting.
- Meta product-param events (ViewContent, Purchase…) go out as a hidden-form
  POST to facebook.com/tr — **not visible in
  `performance.getEntriesByType('resource')`**. Verify with Events Manager →
  Test events.

---

## Server events

| Event | Platform | Fired from | When | Notes |
|---|---|---|---|---|
| **Purchase** | Meta CAPI | `fireBookingSubmittedCapi` (`app/actions/metaCapi.ts`) | Every new booking (website or staff-entered) | event_id `booking-purchase-<ref>` = same as the thank-you Pixel → deduped. Guest fbc/fbp/IP/UA only for **website** bookings; staff-entered ones match on hashed phone/email + Ad source. |
| StayCompleted | Meta CAPI | `fireBookingCompletedCapi` | Admin marks booking **Completed** | Quality signal; own event_id, never double-counts Purchase |
| Lead | Meta CAPI | `createInquiry` (`app/actions/inquiry.ts`) | Callback card submitted | hashed name/phone + intent/channel |
| `booking_submitted` | GA4 Measurement Protocol | `fireBookingCompletedGa4` (`app/actions/ga4.ts`) | Admin marks booking **Completed** | Uses the stored GA4 client_id for attribution |

**Purchase fires at submit on purpose (Shoaib, 2026-10-04).** A
confirm-time Purchase was tried and reverted: with a handful of bookings a
month Meta would never leave learning or optimise on Purchase, and slow or
missed admin confirmations would lose signal. Don't move it again.

**Attribution-aware `action_source`:** any booking with a UTM / fbclid /
gclid is sent as `website` even if it closed on WhatsApp/phone, so Meta
credits the ad.

---

## WhatsApp source codes

Every pre-filled WhatsApp message ends with `(Ref: …)` (`lib/attributionRef.ts`):
`GA` Google Ads · `FB` Facebook/Instagram ad · `GS` Google organic · `WEB`
other. If the ad URL carries `utm_content=<CODE>` (e.g. `MW1`), it's
appended: `Ref: FB-MW1`. Reception picks the matching **Ad source** in
Admin → New booking (the form explains the codes).

---

## Which event to optimise for (Meta)

| Campaign goal | Optimise for |
|---|---|
| WhatsApp / calls | Click-to-WhatsApp conversations, or Contact |
| Website bookings, low volume | InitiateCheckout → Purchase once volume allows |
| Website bookings | **Purchase** (fires at submit — fast enough to learn) |
| Never | Search (cheap, low intent — was the cause of junk traffic in Sep 2026) |

Google Ads primary goals: Hotel Booking Purchase, WhatsApp Contact, Call
Contact, Calls from ads (≥60 s). "Booking Started" has no trigger on the site
and should be secondary.

---

## Custom Audiences worth creating in Meta

| Audience | Rule | Use |
|---|---|---|
| Viewed a room, no contact | ViewContent AND NOT Contact/Purchase (30d) | Room-offer retargeting |
| Started booking, didn't book | InitiateCheckout AND NOT Purchase (14d) | Date-abandoner retargeting (highest ROI) |
| Contacted, didn't book | Contact/Lead AND NOT Purchase (60d) | Follow-up offers |
| Bookers | Purchase (180d) | **Exclude** from prospecting; Lookalike source |

---

## Retired

- ~~"Booking Confirmed" custom conversion~~ — archived (duplicate of
  CompleteRegistration, 0 value).
- ~~Purchase at admin "Confirmed"~~ — reverted 2026-10-04 (see above).
- ~~Meta noscript PageView image~~ — removed 2026-10-04 (duplicate PageViews).
