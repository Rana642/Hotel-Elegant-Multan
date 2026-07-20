import type { Metadata } from 'next';
import LandingPage from '../_components/LandingPage';
import { LP_VARIANTS, sanitizeKw } from '@/lib/lpConfig';

const variant = LP_VARIANTS.book;

export const metadata: Metadata = {
  title: { absolute: variant.metaTitle },
  description: variant.metaDescription,
  // Ad landing page — keep out of the organic index so it never competes with
  // the real SEO room pages. `follow` still passes link equity onward.
  robots: { index: false, follow: true },
  alternates: { canonical: undefined },
};

export default function Page({ searchParams }: { searchParams: { kw?: string | string[] } }) {
  const kw = Array.isArray(searchParams.kw) ? searchParams.kw[0] : searchParams.kw;
  const headline = sanitizeKw(kw) ?? variant.h1;
  return <LandingPage variant={variant} headline={headline} />;
}
