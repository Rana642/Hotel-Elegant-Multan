// Single source of truth for a booking's price breakdown. Pure function —
// no I/O, no side effects — so the client-side booking form preview, the
// server-side booking commit, and every receipt/email surface all arrive
// at the exact same numbers from the exact same inputs.
//
// Tax model: TAX-INCLUSIVE. Every room's price_per_night (and offer_price)
// already has GST + City Tax baked in — the number displayed online IS the
// number the guest pays, in full, no surprise addition at checkout. This
// changed from the old "excluded" model (tax added at the hotel on top of
// the quoted rate) as of Sept 2026 — see the 2026-09-11 rate update.
//
// taxAmount below is NOT an extra charge — it's the tax PORTION already
// sitting inside `total`, computed via the standard inclusive-tax reverse
// formula (tax = total × rate / (1 + rate)) so admin/reception can still
// see the GST + City Tax breakdown on a receipt for accounting, without it
// changing what the guest actually owes.
//
// Order matters: coupon discount is applied to the (already tax-inclusive)
// subtotal FIRST, then the tax breakdown is computed on what's left — so
// the tax line on the receipt reflects the discounted price the guest is
// actually paying, matching what reception sees at the desk.

export interface PricingInput {
  /** Room total: price-per-night × nights (already reflects any offer_price,
   *  and already includes GST + City Tax — see file header). */
  roomTotal: number;
  /** Extra beds total: extra_beds × extra_bed_price × nights. */
  extraBedTotal: number;
  /** Absolute PKR discount from an applied coupon. 0 when no coupon. */
  couponDiscount: number;
  /** Combined tax rate as a whole-number percentage (GST + City Tax
   *  summed, e.g. 16 + 10 = 26). Used only to break the inclusive total
   *  back out into a tax portion for display — never added on top. */
  taxPercent: number;
}

export interface PricingBreakdown {
  /** Pre-discount total (room + extra beds), tax-inclusive. */
  subtotal: number;
  /** Coupon discount actually applied — never exceeds subtotal. */
  couponDiscount: number;
  /** Subtotal minus coupon — this IS the total the guest pays, tax
   *  already included. Same value as `total` below (kept as a separate
   *  field for backward-compat with existing call sites). */
  discountedSubtotal: number;
  /** Combined rate we used (echoed back for display / storage). */
  taxPercent: number;
  /** The portion of `total` that is GST + City Tax — informational only,
   *  for the receipt / accounting breakdown. NOT added to `total`; it's
   *  already inside it. */
  taxAmount: number;
  /** `total` minus the tax portion — the pre-tax room value, for the
   *  receipt breakdown line ("Room rate (excl. tax)"). */
  baseAmount: number;
  /** What the guest pays — tax-inclusive, nothing added at checkout. */
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

  // Inclusive-tax reverse calculation: discountedSubtotal already HAS tax
  // folded in, so the tax portion is total × rate / (1 + rate), not
  // total × rate (that formula is for tax-EXCLUSIVE pricing, the old model).
  const taxAmount = round(discountedSubtotal * (taxPercent / (100 + taxPercent)));
  const baseAmount = discountedSubtotal - taxAmount;

  return {
    subtotal,
    couponDiscount,
    discountedSubtotal,
    taxPercent,
    taxAmount,
    baseAmount,
    // Tax-inclusive total — this is the full amount the guest pays.
    total: discountedSubtotal,
  };
}
