import type { Metadata } from 'next';
import LandingPage from '../_components/LandingPage';
import { LP_VARIANTS, sanitizeKw } from '@/lib/lpConfig';

// Independence Day 2026 campaign landing page — AZADI14 coupon, 14% off,
// 100 vouchers, book + stay window 1-14 August. Renders the shared
// LandingPage component with the 'azadi' variant, which layers a
// Pakistan flag-themed hero overlay + a red-bordered offer callout with
// the code onto the standard LP structure.

const variant = LP_VARIANTS.azadi;

export const metadata: Metadata = {
  title: { absolute: variant.metaTitle },
  description: variant.metaDescription,
  // Same as every other /lp/* route — ad landing pages stay out of the
  // organic index so they never compete with the real /rooms/* SEO pages.
  // `follow` still passes link equity onward.
  robots: { index: false, follow: true },
  alternates: { canonical: undefined },
};

export default function Page({ searchParams }: { searchParams: { kw?: string | string[] } }) {
  const kw = Array.isArray(searchParams.kw) ? searchParams.kw[0] : searchParams.kw;
  const headline = sanitizeKw(kw) ?? variant.h1;
  return <LandingPage variant={variant} headline={headline} />;
}
