# Meta / GA4 Tracking Map — Hotel Elegant

Complete reference of every event we fire, where it fires, and what it's for.
Use this when tuning ad campaigns, building audiences, or debugging why a
number looks off in Events Manager.

---

## The events (funnel order)

| # | Event         | Source          | Fires when                                                  | Purpose                                            |
|---|---------------|-----------------|-------------------------------------------------------------|----------------------------------------------------|
| 1 | PageView      | Pixel base      | Every page load                                             | Baseline traffic, retargeting all-visitors         |
| 2 | ViewContent   | Pixel (GTM)     | Room detail page opens (`/rooms/[slug]`)                    | "Interested in a specific room" signal             |
| 3 | Search        | Pixel (GTM)     | Booking form dates stabilise for ~1s                        | Active buying-intent signal                        |
| 4 | InitiateCheckout | Pixel (GTM)  | "Book Now" button clicked on room card / room detail        | Started the booking flow                           |
| 5 | Lead          | **CAPI** + Pixel| Contact modal submitted (WhatsApp/Call intent capture)      | Named + hashed lead; ad-driven WhatsApp bookings   |
| 6 | Contact       | Pixel (GTM)     | Header/floating Call button clicked (no modal)              | Legacy signal from non-modal-wrapped Call buttons  |
| 7 | CompleteRegistration | Pixel (GTM) | Booking form submitted successfully (thank-you page)     | Immediate conversion signal — best for optimising  |
| 8 | Purchase      | **CAPI only**   | Admin flips a booking to "Confirmed" in the dashboard       | Real revenue moment, PKR value attached            |

**Server-side (CAPI) events use hashed name / phone / country / fbc for
Advanced Matching — Event Match Quality (EMQ) targets 7+ on these.**

---

## GTM custom events → Meta mapping

These are the dataLayer events the site pushes. The GTM container listens to
each and fires the corresponding Meta Pixel event.

| dataLayer event              | GTM tag name                       | Meta Pixel event  | Notes                              |
|------------------------------|------------------------------------|-------------------|-----------------------------------|
| `view_room`                  | Meta - ViewContent - Room          | ViewContent       | Fires on `/rooms/[slug]` mount     |
| `search_availability`        | Meta - Search - Availability       | Search            | Debounced 1.2s on date change      |
| `book_now_click`             | Meta - InitiateCheckout - Book     | InitiateCheckout  | Room card / detail "Book Now"      |
| `booking_submitted`          | Meta - CompleteRegistration        | CompleteRegistration | Fires from thank-you page       |
| `whatsapp_click`             | Meta - Lead - WhatsApp             | Lead              | LP + Contact page only (modal skips this to avoid double-fire) |
| `call_click`                 | Meta - Contact - Call              | Contact           | Same — LP + Contact only           |
| `contact_intent_submitted`   | (GA4 only — no Meta tag)           | —                 | Modal submit; CAPI handles the Meta side |
| `contact_modal_skipped`      | (GA4 only — no Meta tag)           | —                 | Modal dismissed; funnel drop-off   |
| `confirmation_whatsapp_click` | (currently no tag)                | —                 | Post-booking WhatsApp on thank-you |
| `confirmation_call_click`    | (currently no tag)                 | —                 | Post-booking Call on thank-you     |

---

## CAPI (server-side) events

Sent from Next.js server actions to `graph.facebook.com` with hashed user data.

| Event    | Server action                                | Fires when                          | Fields sent                          |
|----------|----------------------------------------------|-------------------------------------|--------------------------------------|
| Lead     | `createInquiry` (`app/actions/inquiry.ts`)   | Contact modal submitted             | hashed name/phone/country + fbc if any + intent + channel |
| Purchase | `fireBookingConfirmedCapi` (`app/actions/metaCapi.ts`) | Admin marks booking Confirmed | hashed name/phone/country + fbc + PKR value + booking source |

**Attribution-aware `action_source`:** if the booking has any UTM or fbclid
captured, CAPI Purchase overrides `action_source` to `'website'` even when the
guest closed on WhatsApp/phone — that's what lets Meta credit ad-driven
manual bookings back to the campaign.

---

## Which event should the campaign optimise for?

| Campaign objective     | Optimise for            | Why                                     |
|------------------------|-------------------------|-----------------------------------------|
| Broad awareness        | ViewContent             | Cheap, plentiful; feeds Lookalikes      |
| Traffic to booking flow| InitiateCheckout        | Mid-funnel; enough volume to learn      |
| WhatsApp / phone leads | **Lead** (CAPI)         | Named, high-quality, ad-driven bookers  |
| Direct-book (best)     | **CompleteRegistration**| Fires immediately on form submit; fast learning signal |
| Revenue / ROAS         | Purchase                | Real revenue but delayed — small accounts may starve |

**For Hotel Elegant right now: optimise on CompleteRegistration for main
booking campaigns, on Lead for WhatsApp-focused campaigns. Report on Purchase
for real ROAS.**

---

## Custom Audiences worth creating in Meta

Use these in Ads Manager → Audiences → Custom Audience → Website:

| Audience name                     | Rule                                                    | Use for                             |
|----------------------------------|---------------------------------------------------------|-------------------------------------|
| Viewed a room, didn't inquire    | ViewContent AND NOT Lead (last 30 days)                 | Retarget with room offers           |
| Viewed booking form, didn't book | InitiateCheckout AND NOT CompleteRegistration (30d)     | Abandoned-cart style nurture        |
| Inquired, didn't book            | Lead AND NOT Purchase (last 60 days)                    | Follow-up WhatsApp campaigns        |
| Confirmed bookers                | Purchase (last 180 days)                                | **EXCLUDE** from prospecting; base for Lookalike; upsell / seasonal offers |
| Lookalike 1% — Confirmed bookers | Lookalike source: Confirmed bookers above               | Prospecting audience for cold ads   |

---

## Deleted / retired events

- ~~"Booking Confirmed" custom conversion~~ — deleted, was a duplicate of
  CompleteRegistration with 0 PKR value and a misleading name.
