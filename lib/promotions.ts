import { createClient, createServiceClient } from './supabase/server';

export interface Promotion {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string;
  image_url: string | null;
  badge: string | null;
  cta_label: string;
  cta_href: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Active promotions for public surfaces (the /promotions page + the floating
 * popup). Cookie-free service client so ISR pages stay cacheable. Fails soft:
 * if the promotions table doesn't exist yet (migration not applied) or any
 * error occurs, returns [] so the marketing surfaces just render empty rather
 * than crashing the page.
 */
export async function getActivePromotions(): Promise<Promotion[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    console.error('getActivePromotions error:', error.message);
    return [];
  }
  return (data as Promotion[]) || [];
}

/** Every promotion (admin list) — request-context cookie client. */
export async function getAllPromotions(): Promise<Promotion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('is_active', { ascending: false })
    .order('sort_order');
  if (error) {
    console.error('getAllPromotions error:', error.message);
    return [];
  }
  return (data as Promotion[]) || [];
}
