// Shared coupon validation + discount calculation. Pure function — no I/O,
// no side effects — so both the client-side preview (server action fetches
// the coupon row, then calls this) and the server-side booking creation
// (re-fetches at commit time, then calls this) use exactly the same rules.
// Every rejection returns a plain-English error the guest can act on.

export interface CouponRow {
  code: string;
  name: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  valid_from: string | null;      // YYYY-MM-DD or null
  valid_to: string | null;        // YYYY-MM-DD or null
  stay_from: string | null;
  stay_to: string | null;
  min_nights: number | null;
  min_amount: number | null;
  max_discount: number | null;
  applies_to_room_ids: string[] | null;  // null = all rooms
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
}

export interface CouponContext {
  roomId: string;
  nights: number;
  /** Room total in PKR: nights × room price per night (post any offer_price).
   *  Discount is calculated on this, NOT on grand_total (extra bed excluded). */
  roomTotal: number;
  checkIn: string;  // YYYY-MM-DD
}

export type CouponResult =
  | { valid: true;  discount: number; finalRoomTotal: number; couponCode: string }
  | { valid: false; error: string };

/** Round PKR values to whole rupees — display + storage stays clean. */
function round(n: number): number {
  return Math.round(n);
}

/** Today in YYYY-MM-DD, evaluated in the caller's local time (booking flow
 *  runs server-side in the Hostinger process). Coupons validity windows
 *  live in date-only precision so timezone drift within Pakistan is a
 *  non-issue. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function validateCoupon(coupon: CouponRow | null, ctx: CouponContext): CouponResult {
  if (!coupon) return { valid: false, error: 'This coupon code is not recognised.' };
  if (!coupon.is_active) return { valid: false, error: 'This coupon is no longer active.' };

  const now = today();

  if (coupon.valid_from && now < coupon.valid_from) {
    return { valid: false, error: `This coupon starts on ${coupon.valid_from}.` };
  }
  if (coupon.valid_to && now > coupon.valid_to) {
    return { valid: false, error: 'This coupon has expired.' };
  }
  if (coupon.stay_from && ctx.checkIn < coupon.stay_from) {
    return { valid: false, error: `Valid for stays from ${coupon.stay_from} onwards.` };
  }
  if (coupon.stay_to && ctx.checkIn > coupon.stay_to) {
    return { valid: false, error: `Valid for stays up to ${coupon.stay_to} only.` };
  }
  if (coupon.min_nights && ctx.nights < coupon.min_nights) {
    return { valid: false, error: `Minimum stay for this coupon is ${coupon.min_nights} nights.` };
  }
  if (coupon.min_amount && ctx.roomTotal < coupon.min_amount) {
    return { valid: false, error: `Minimum booking amount for this coupon is PKR ${coupon.min_amount}.` };
  }
  if (
    coupon.applies_to_room_ids &&
    coupon.applies_to_room_ids.length > 0 &&
    !coupon.applies_to_room_ids.includes(ctx.roomId)
  ) {
    return { valid: false, error: 'This coupon is not valid for the selected room.' };
  }
  if (coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  // Calculate raw discount, then cap.
  let discount = coupon.discount_type === 'percent'
    ? ctx.roomTotal * (coupon.discount_value / 100)
    : coupon.discount_value;

  if (coupon.max_discount !== null && discount > coupon.max_discount) {
    discount = coupon.max_discount;
  }
  if (discount > ctx.roomTotal) discount = ctx.roomTotal;   // never negative
  discount = round(Math.max(0, discount));

  return {
    valid: true,
    discount,
    finalRoomTotal: Math.max(0, ctx.roomTotal - discount),
    couponCode: coupon.code,
  };
}

/** Normalise a user-typed code to the canonical stored form: trimmed +
 *  uppercased. Used by both the apply flow and the booking commit lookup
 *  so 'ramzan10 ' and 'RAMZAN10' hit the same row. */
export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}
