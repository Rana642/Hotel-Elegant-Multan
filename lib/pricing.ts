// Single source of truth for a booking's price breakdown. Pure function —
// no I/O, no side effects — so the client-side booking form preview, the
// server-side booking commit, and every receipt/email surface all arrive
// at the exact same numbers from the exact same inputs.
//
// Order matters: coupon discount is applied FIRST, THEN tax is calculated
// on the post-discount amount. This is the customer-friendly convention
// (guest sees the full benefit of their coupon before tax) and matches
// standard e-commerce practice. The government-friendly alternative —
// tax on the gross, discount off the total — leaves the customer with a
// smaller effective saving and is generally frowned upon by consumer-
// protection bodies. We chose the customer's side.

export interface PricingInput {
  /** Room total: price-per-night × nights (already reflects any offer_price). */
  roomTotal: number;
  /** Extra beds total: extra_beds × extra_bed_price × nights. */
  extraBedTotal: number;
  /** Absolute PKR discount from an applied coupon. 0 when no coupon. */
  couponDiscount: number;
  /** Tax rate as a whole-number percentage: 16 means 16%, not 0.16. */
  taxPercent: number;
}

export interface PricingBreakdown {
  /** Pre-discount, pre-tax total (room + extra beds). */
  subtotal: number;
  /** Coupon discount actually applied — never exceeds subtotal. */
  couponDiscount: number;
  /** Subtotal minus coupon; the base the tax is calculated on. */
  discountedSubtotal: number;
  /** Rate we applied (echoed back for display / storage). */
  taxPercent: number;
  /** Rounded PKR tax charge on the post-discount subtotal. */
  taxAmount: number;
  /** Final amount the guest pays: discountedSubtotal + taxAmount. */
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
  // clamp to a sane 0-30% range. Anything outside that in Pakistan is a
  // data-entry error, not a real rate.
  const taxPercent = Math.max(0, Math.min(30, Number(input.taxPercent) || 0));
  const taxAmount = round(discountedSubtotal * (taxPercent / 100));
  const total = discountedSubtotal + taxAmount;

  return {
    subtotal,
    couponDiscount,
    discountedSubtotal,
    taxPercent,
    taxAmount,
    total,
  };
}
