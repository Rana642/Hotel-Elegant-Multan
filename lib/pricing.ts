// Single source of truth for a booking's price breakdown. Pure function —
// no I/O, no side effects — so the client-side booking form preview, the
// server-side booking commit, and every receipt/email surface all arrive
// at the exact same numbers from the exact same inputs.
//
// Tax model: TAX-EXCLUSIVE (same pattern as Booking.com, since 2026-10-04).
// Every room's price_per_night / offer_price is the rate BEFORE tax — the
// same numbers as the Booking.com extranet — and GST + City Tax are added on
// top. Guests comparing the two sites see the same kind of number, so the
// website (Genius-3-level offer) reads as cheaper instead of looking dearer
// because one side included tax and the other didn't. (Sept–Oct 2026 the
// site was tax-inclusive; bookings from then keep their stored totals.)
//
// Order matters: the coupon discount is applied to the pre-tax subtotal
// FIRST, then tax is computed on what's left — so the tax line matches the
// discounted price the guest actually pays.

export interface PricingInput {
  /** Room total: price-per-night × nights (already reflects any offer_price
   *  or deal), BEFORE tax — see file header. */
  roomTotal: number;
  /** Extra beds total: extra_beds × extra_bed_price × nights. */
  extraBedTotal: number;
  /** Absolute PKR discount from an applied coupon. 0 when no coupon. */
  couponDiscount: number;
  /** Combined tax rate as a whole-number percentage (GST + City Tax
   *  summed, e.g. 16 + 10 = 26). Added on top of the discounted subtotal. */
  taxPercent: number;
}

export interface PricingBreakdown {
  /** Pre-discount, pre-tax total (room + extra beds). */
  subtotal: number;
  /** Coupon discount actually applied — never exceeds subtotal. */
  couponDiscount: number;
  /** Subtotal minus coupon, before tax. */
  discountedSubtotal: number;
  /** Combined rate we used (echoed back for display / storage). */
  taxPercent: number;
  /** GST + City Tax charged on top of discountedSubtotal (and included in
   *  `total`). */
  taxAmount: number;
  /** Pre-tax amount (= discountedSubtotal), for receipt call sites. */
  baseAmount: number;
  /** What the guest pays: discountedSubtotal + taxAmount. */
  total: number;
}

/** Round to whole rupees — display + DB storage stays clean, no fractional
 *  paise anywhere. Uses Math.round so 0.5 rounds up (banker's rounding
 *  would be pointless at PKR scale). */
function round(n: number): number {
  return Math.round(n);
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const subtotal = Math.max(0, round(input.roomTotal + input.extraBedTotal));
  // Coupon is capped at subtotal — never let a big flat coupon flip the
  // total negative. calculating the discount belongs to validateCoupon;
  // this function just applies whatever discount value was already validated.
  const couponDiscount = Math.max(0, Math.min(subtotal, round(input.couponDiscount)));
  const discountedSubtotal = subtotal - couponDiscount;

  // Guard against a mis-stored tax_percent (negative, NaN, absurdly high) —
  // clamp to a sane 0-40% combined range (16% GST + 10% City Tax = 26%
  // today; 40 leaves headroom without accepting a data-entry error).
  const taxPercent = Math.max(0, Math.min(40, Number(input.taxPercent) || 0));

  const taxAmount = round(discountedSubtotal * (taxPercent / 100));

  return {
    subtotal,
    couponDiscount,
    discountedSubtotal,
    taxPercent,
    taxAmount,
    baseAmount: discountedSubtotal,
    total: discountedSubtotal + taxAmount,
  };
}
