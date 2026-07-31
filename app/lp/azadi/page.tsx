import type { Metadata } from 'next';
import LandingPage from '../_components/LandingPage';
import { LP_VARIANTS, sanitizeKw } from '@/lib/lpConfig';

// Independence Day 2026 campaign landing page — AZADI14 coupon, 14% off,
// 100 vouchers, book + stay window 1-14 August. Renders the shared
// LandingPage component with the 'azadi' variant, which layers a
// Pakistan flag-themed hero overlay + a ticket-style green voucher onto
// the standard LP structure.
//
// SEO stance: DIFFERENT from other /lp/* variants. Regular ad LPs stay
// noindex to avoid competing with /rooms/*, but during Independence Week
// deal-seekers actively search Google + AI engines for terms like "azadi
// hotel deal multan", "14 august hotel offer", "independence day hotel
// discount". We want this page to CATCH that intent — organic + Google
// Ads + AI answer engines. So we opt IN to indexing for the campaign
// window; after 14 August the coupon deactivates and we revert to
// noindex in a follow-up commit.

const variant = LP_VARIANTS.azadi;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';

export const metadata: Metadata = {
  title: { absolute: variant.metaTitle },
  description: variant.metaDescription,
  keywords: [
    'azadi hotel deal', 'azadi hotel offer', '14 august hotel offer',
    'independence day hotel multan', 'hotel deal multan', 'hotel offer multan',
    'hotel discount multan', 'multan hotel promo code', 'azadi14',
    'best hotel deal multan', 'azadi week hotel',
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: `${siteUrl}/lp/azadi` },
  openGraph: {
    title: variant.metaTitle,
    description: variant.metaDescription,
    url: `${siteUrl}/lp/azadi`,
    type: 'website',
    locale: 'en_PK',
    siteName: 'Hotel Elegant Executive Suites',
    images: [{ url: '/hero-poster.jpg', width: 1280, height: 720, alt: 'Azadi Special at Hotel Elegant Multan' }],
  },
  twitter: { card: 'summary_large_image', images: ['/hero-poster.jpg'] },
};

export default function Page({ searchParams }: { searchParams: { kw?: string | string[] } }) {
  const kw = Array.isArray(searchParams.kw) ? searchParams.kw[0] : searchParams.kw;
  const headline = sanitizeKw(kw) ?? variant.h1;
  return <LandingPage variant={variant} headline={headline} />;
}
