'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { headers } from 'next/headers';
import { validateCoupon, normalizeCouponCode, type CouponRow } from '@/lib/coupon';

// Public server action that the booking form calls when the guest hits
// "Apply" on a coupon code. Rate-limited to blunt code-guessing bots.
// Same helper (validateCoupon) is used server-side at booking-commit time
// so the two paths can never disagree.

export interface ApplyCouponInput {
  code: string;
  roomId: string;
  nights: number;
  roomTotal: number;   // nights × room price (post-offer)
  checkIn: string;     // YYYY-MM-DD
}

export interface ApplyCouponResult {
  success: boolean;
  discount?: number;
  finalRoomTotal?: number;
  couponCode?: string;
  discountLabel?: string;   // "10% off" / "Rs 500 off" — for preview UI
  error?: string;
}

export async function applyCoupon(input: ApplyCouponInput): Promise<ApplyCouponResult> {
  // Coupon endpoints are a prime target for brute-force enumeration, so a
  // tighter limit than bookings — 15 attempts / minute is enough for a
  // real guest fat-fingering, murder for a script.
  const ip = getClientIp(await headers());
  const rl = rateLimit(`coupon:${ip}`, 15, 60_000);
  if (!rl.allowed) {
    return { success: false, error: `Too many attempts. Try again in ${rl.retryAfter}s.` };
  }

  const code = normalizeCouponCode(input.code || '');
  if (!code) return { success: false, error: 'Enter a coupon code.' };

  const service = createServiceClient();
  const { data: row } = await service
    .from('coupons')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  const coupon = row as CouponRow | null;

  const result = validateCoupon(coupon, {
    roomId: input.roomId,
    nights: input.nights,
    roomTotal: input.roomTotal,
    checkIn: input.checkIn,
  });

  if (!result.valid) return { success: false, error: result.error };

  const discountLabel = coupon!.discount_type === 'percent'
    ? `${coupon!.discount_value}% off`
    : `Rs ${coupon!.discount_value} off`;

  return {
    success: true,
    discount: result.discount,
    finalRoomTotal: result.finalRoomTotal,
    couponCode: result.couponCode,
    discountLabel,
  };
}
