import { NextResponse } from 'next/server';
import { getActivePromotions } from '@/lib/promotions';

// Public JSON feed of active promotions for the site-wide floating popup.
// Cached for 60s so the popup doesn't hit the DB on every page load and
// reflects admin edits within a minute (same freshness as the ISR pages).
export const revalidate = 60;

export async function GET() {
  const promos = await getActivePromotions();
  // Trim to only what the popup needs.
  const slim = promos.map((p) => ({
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    badge: p.badge,
    image_url: p.image_url,
    cta_label: p.cta_label,
    cta_href: p.cta_href,
  }));
  return NextResponse.json(slim);
}
