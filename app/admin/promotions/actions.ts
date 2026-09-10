'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// Admin-only promotions CRUD. Runs through the service client so writes work
// under the admin-only RLS policy without permission surprises. A promotion
// carries BOTH marketing content (title/image/CTA/benefits) AND deal rules —
// the rules become live the moment `discount_percent > 0` (see lib/deals.ts).

export interface PromotionFormInput {
  id?: string;
  slug: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  image_url?: string | null;
  badge?: string | null;
  coupon_code?: string | null;      // display-only marketing code (e.g. "EARLY10")
  benefits?: string[] | null;       // bullet list rendered on the card
  cta_label?: string | null;
  cta_href?: string | null;
  sort_order?: number | null;
  is_active?: boolean;

  // ── Deal rules (all optional — if discount_percent = 0 the promo stays
  //     marketing-only and none of these are evaluated) ────────────────
  discount_percent?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  room_ids?: string[] | null;
  weekdays?: number[] | null;                    // 0=Sun..6=Sat; empty = every day
  lead_time_type?: 'none' | 'early_bird' | 'last_minute' | null;
  lead_time_days?: number | null;
  min_nights?: number | null;
  start_time?: string | null;                    // "HH:MM" — daily active window (PKT)
  end_time?: string | null;
  refundable?: boolean;
  free_cancel_days?: number | null;
  priority?: number | null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function normHM(s?: string | null): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, Number(m[2])))).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Bust every surface a promotion appears on: the admin list, the public
// /promotions page, and the site-wide popup (served via /api/promotions).
function revalidatePromotions() {
  revalidatePath('/admin/promotions');
  revalidatePath('/promotions');
  revalidatePath('/api/promotions');
}

export async function upsertPromotion(input: PromotionFormInput, isEdit = false) {
  await requireAdmin();
  const service = createServiceClient();

  const title = (input.title || '').trim();
  if (!title) return { success: false, error: 'Title is required.' };

  const discountPct = Math.max(0, Math.min(100, Number(input.discount_percent ?? 0) || 0));
  const leadType = input.lead_time_type || 'none';
  const weekdays = Array.isArray(input.weekdays)
    ? input.weekdays.filter((n) => Number.isFinite(n) && n >= 0 && n <= 6)
    : [];
  const roomIds = Array.isArray(input.room_ids) ? input.room_ids.filter(Boolean) : [];
  const benefits = Array.isArray(input.benefits)
    ? input.benefits.map((s) => (s || '').trim()).filter(Boolean)
    : [];
  const couponCode = (input.coupon_code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || null;

  const base = {
    title,
    tagline: (input.tagline || '').trim() || null,
    description: (input.description || '').trim() || '',
    image_url: (input.image_url || '').trim() || null,
    badge: (input.badge || '').trim() || null,
    coupon_code: couponCode,
    benefits,
    cta_label: (input.cta_label || '').trim() || 'Book Now',
    cta_href: (input.cta_href || '').trim() || '/reservations',
    sort_order: Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 0,
    is_active: input.is_active !== false,

    // Deal rules — all nullable; only evaluated when discount_percent > 0.
    discount_percent: discountPct,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    room_ids: roomIds,
    weekdays,
    lead_time_type: leadType,
    lead_time_days: Math.max(0, Number(input.lead_time_days ?? 0) || 0),
    min_nights: Math.max(0, Number(input.min_nights ?? 0) || 0),
    start_time: normHM(input.start_time),
    end_time: normHM(input.end_time),
    refundable: input.refundable !== false,
    free_cancel_days: Math.max(0, Number(input.free_cancel_days ?? 2) || 0),
    priority: Number(input.priority ?? 0) || 0,
  };

  let error;
  if (isEdit && input.id) {
    // Slug is immutable after creation (keeps tab anchors / links stable).
    ({ error } = await service.from('promotions').update(base).eq('id', input.id));
  } else {
    const slug = slugify(input.slug || title);
    if (!slug) return { success: false, error: 'Could not derive a slug from the title.' };
    ({ error } = await service.from('promotions').insert({ ...base, slug }));
  }

  if (error) {
    if ((error as any).code === '23505') {
      return { success: false, error: 'A promotion with that name/slug already exists.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePromotions();
  return { success: true };
}

/** Create a fresh blank promotion inline (the "+ Add promotion" button on
 *  the admin list). A unique slug is auto-picked; the admin then edits the
 *  card in place and hits Save. */
export async function createBlankPromotion() {
  await requireAdmin();
  const service = createServiceClient();

  // Pick a slug that isn't already taken.
  const { data: existing } = await service.from('promotions').select('slug');
  const taken = new Set((existing ?? []).map((r: any) => r.slug));
  let slug = 'new-promotion';
  for (let i = 2; taken.has(slug); i++) slug = `new-promotion-${i}`;

  const { data, error } = await service
    .from('promotions')
    .insert({
      slug,
      title: 'New promotion',
      description: '',
      cta_label: 'Book Now',
      cta_href: '/reservations',
      sort_order: 0,
      is_active: false,
      benefits: [],
      refundable: true,
      lead_time_type: 'none',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePromotions();
  return { success: true, id: (data as any).id as string };
}

export async function togglePromotionActive(id: string, isActive: boolean) {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service.from('promotions').update({ is_active: isActive }).eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePromotions();
  return { success: true };
}

export async function deletePromotion(id: string) {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service.from('promotions').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePromotions();
  return { success: true };
}
