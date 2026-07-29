'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeCouponCode } from '@/lib/coupon';

// Admin-only coupon CRUD. Everything runs through the service client so
// the coupons policy stays admin-only at RLS level and there are no
// silent-permission surprises.

export interface CouponFormInput {
  code: string;
  name: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  valid_from?: string | null;
  valid_to?: string | null;
  stay_from?: string | null;
  stay_to?: string | null;
  min_nights?: number | null;
  min_amount?: number | null;
  max_discount?: number | null;
  applies_to_room_ids?: string[] | null;  // empty array + null both mean "all"
  usage_limit?: number | null;
  is_active?: boolean;
}

function empty<T>(v: T | undefined | null | ''): T | null {
  return v === '' || v === undefined ? null : (v as T);
}

export async function upsertCoupon(input: CouponFormInput, isEdit = false) {
  await requireAdmin();
  const service = createServiceClient();

  const code = normalizeCouponCode(input.code || '');
  const name = (input.name || '').trim();

  if (!code || !/^[A-Z0-9_-]{2,32}$/.test(code)) {
    return { success: false, error: 'Code must be 2-32 chars (letters, digits, _ or -).' };
  }
  if (!name) return { success: false, error: 'Name is required.' };
  if (!['percent', 'flat'].includes(input.discount_type)) {
    return { success: false, error: 'Invalid discount type.' };
  }
  const value = Number(input.discount_value);
  if (!(value > 0)) return { success: false, error: 'Discount value must be greater than 0.' };
  if (input.discount_type === 'percent' && value > 100) {
    return { success: false, error: 'Percentage discount cannot exceed 100.' };
  }

  const rooms = input.applies_to_room_ids && input.applies_to_room_ids.length > 0
    ? input.applies_to_room_ids
    : null;

  const row = {
    code,
    name,
    discount_type: input.discount_type,
    discount_value: value,
    valid_from: empty(input.valid_from),
    valid_to: empty(input.valid_to),
    stay_from: empty(input.stay_from),
    stay_to: empty(input.stay_to),
    min_nights: empty(input.min_nights),
    min_amount: empty(input.min_amount),
    max_discount: empty(input.max_discount),
    applies_to_room_ids: rooms,
    usage_limit: empty(input.usage_limit),
    is_active: input.is_active !== false,
  };

  const { error } = isEdit
    ? await service.from('coupons').update(row).eq('code', code)
    : await service.from('coupons').insert(row);
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/coupons');
  return { success: true, code };
}

export async function toggleCouponActive(code: string, isActive: boolean) {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service
    .from('coupons')
    .update({ is_active: isActive })
    .eq('code', code);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/coupons');
  return { success: true };
}

export async function deleteCoupon(code: string) {
  await requireAdmin();
  const service = createServiceClient();
  // Bookings that already used this coupon keep their coupon_code + discount
  // (the FK is loose text). Deleting only removes the ability to use it going
  // forward — historical bookings stay intact.
  const { error } = await service.from('coupons').delete().eq('code', code);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/coupons');
  return { success: true };
}
