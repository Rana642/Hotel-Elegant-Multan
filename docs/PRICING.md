# Pricing, Deals & Payment — Hotel Elegant

Source of truth for how room prices, promotions and payment terms work on
the site. **Last updated: 2026-10-05.**

---

## Tax model — tax-EXCLUSIVE (Booking.com pattern)

- `rooms.price_per_night` / `rooms.offer_price` are **pre-tax** — the same
  numbers as the Booking.com extranet.
- GST 16% + Multan City Tax 10% (= 26%, from `settings.hotel_tax_percent` +
  `settings.city_tax_percent`) is added on top at checkout as its own line.
- One pure function computes every price: `lib/pricing.ts`
  (`calculatePricing` → subtotal, coupon, taxAmount, total).
- Bookings made Sept–Oct 2026 (tax-inclusive period) keep their stored totals.
- **Rollout rule:** DB prices and the pricing code must switch together —
  old code + new prices (or vice versa) mis-charges by 26%.

## Rate parity with Booking.com

| Room | Standard (= Booking.com standard) | Offer (= Genius level 3, −20%) |
|---|---|---|
| King Room (`executive-king`) | 7,500 | 6,000 |
| Family Suite | 14,000 | 11,200 |
| Standard Triple (`triple-sharing`) | 12,000 | 9,600 |
| Presidential Suite | 16,000 | 12,800 |
| Junior Suite | 13,000 | 10,400 |

Rule: the website offer must never be dearer than Booking.com's Genius-3
price. When the hotel changes Booking.com rates, update `rooms` the same day.

## Promotions (`promotions` table, engine in `lib/deals.ts`)

| Deal | Discount (off standard) | Applies when |
|---|---|---|
| Early Booking | 25% | Check-in ≥ 7 days ahead |
| Long Stay | 25% | 3+ nights |
| Last Minute | 30% | Check-in **today or tomorrow**, on Thu/Fri/Sat, booked 3 pm–midnight PKT, until 2026-12-31 |

- **Biggest discount wins** when several deals match (priority only breaks ties).
- A deal only applies if it **beats the room's offer price** — otherwise the
  offer stands and no deal terms apply. Same rule in `app/actions/booking.ts`
  (server, authoritative), `booking/BookingForm.tsx` and `/reservations`.
- Coupons don't stack with deals.

## Payment & cancellation (locked by Shoaib, 2026-10-05)

- **Regular rate:** pay at the hotel — advance payment optional.
- **Deals:** **full payment in advance** by bank transfer (screenshot upload
  on the booking form; `requires_advance_payment = true`).
- **Every booking:** free cancellation and a **100% refund at any time**.
  There is no non-refundable rate (`refundable = true` on all deals).
- Site wording follows the active deal (booking form summary, reservation
  cards); home FAQ, policy, terms and promotions pages state the same rule.

---

## Booking flow (one-page, since 2026-10-05)

1. **Room card** (home, `/rooms`, LP) or room-page **Reservation** →
   dates/occupancy popup for that room (`CheckAvailabilityButton` →
   `ReservationModal` with `roomSlug`). "View Room" is a separate link.
2. → `/reservations?…&room=<slug>` — that room is listed first with a
   "Your selected room" banner; live deals/prices on every card.
3. **Book Now** → same page: compact "Selected room" row (with **Modify**)
   + the guest form (`ReservationsFlow.tsx` renders `BookingForm embedded`).
   `?book=<roomId>` keeps it open on refresh.
4. Compact form: Full name, Phone + Email, special requests, Terms
   checkbox (popup with hotel terms; **I Agree** ticks it; also confirms the
   Multan property). Button: "Book Now & Pay at Hotel" / "Book Now & Pay in
   Advance". Sidebar "Your Booking Details": subtotal, tax, Grand Total,
   Pay Now / Balance (Pay at Hotel), saving.
5. Submit → `/thank-you` (GA4 booking_created, Google Ads Purchase, Meta
   Purchase — see TRACKING.md).

`/booking?roomId=…` still works for direct links (in-form room summary +
Edit shown there).
