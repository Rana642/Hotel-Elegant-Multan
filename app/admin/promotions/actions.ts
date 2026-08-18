'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// Admin-only promotions CRUD. Runs through the service client so writes work
// under the admin-only RLS policy without permission surprises. Promotions
// are marketing content only — no coupon/discount coupling.

export interface PromotionFormInput {
  id?: string;
  slug: string;
  title: string;
  tagline?: string | null;
  description?: string | null;
  image_url?: string | null;
  badge?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
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

  const base = {
    title,
    tagline: (input.tagline || '').trim() || null,
    description: (input.description || '').trim() || '',
    image_url: (input.image_url || '').trim() || null,
    badge: (input.badge || '').trim() || null,
    cta_label: (input.cta_label || '').trim() || 'Book Now',
    cta_href: (input.cta_href || '').trim() || '/booking',
    sort_order: Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 0,
    is_active: input.is_active !== false,
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
