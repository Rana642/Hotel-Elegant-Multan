// Single source of truth for a booking's price breakdown. Pure function —
// no I/O, no side effects — so the client-side booking form preview, the
// server-side booking commit, and every receipt/email surface all arrive
// at the exact same numbers from the exact same inputs.
//
// Tax model: Booking.com-style "excluded" tax. Sales tax is INFORMATIONAL
// only — displayed to the guest for transparency ("+ Rs X in taxes, paid
// at hotel") but NOT rolled into the online cart total. The rationale is
// that we don't collect payment online (pay-at-hotel model), so the
// number we quote here is the room charge; reception adds tax to the
// final bill at checkout. This matches how Booking.com, Agoda and every
// major OTA present pay-at-property rates in Pakistan and avoids the
// perceived "bait and switch" of quoting one number online and charging
// a bigger number in person — the tax line up-front is what makes it
// legitimate transparency rather than a surprise fee.
//
// Order matters within the calculation: coupon discount is applied FIRST,
// THEN tax is computed on the post-discount amount (so the tax line on
// the receipt matches what reception would compute at the desk, no
// argument at checkout).

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
  /** Subtotal minus coupon; ALSO the cart total the guest sees online
   *  (tax is excluded from the online commitment — see file header). */
  discountedSubtotal: number;
  /** Rate we applied (echoed back for display / storage). */
  taxPercent: number;
  /** Informational tax charge on the post-discount subtotal — shown to
   *  the guest as "paid at hotel" and stored on the booking row for the
   *  reception invoice, but NOT added to `total`. */
  taxAmount: number;
  /** What the guest commits to online = discountedSubtotal. Reception
   *  will collect (total + taxAmount) at checkout. */
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

  return {
    subtotal,
    couponDiscount,
    discountedSubtotal,
    taxPercent,
    taxAmount,
    // Online cart total = pre-tax. Tax is displayed but paid at the hotel.
    total: discountedSubtotal,
  };
}
