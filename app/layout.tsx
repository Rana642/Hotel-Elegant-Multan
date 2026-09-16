import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Playfair_Display, Montserrat } from 'next/font/google';
import GA4PageViewTracker from '@/components/GA4PageViewTracker';
import './globals.css';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '27407654508906433';
const GADS_TAG_ID = process.env.NEXT_PUBLIC_GADS_TAG_ID || 'AW-18202393540';
// Same property as the server-side GA4_MEASUREMENT_ID env var (lib/ga4Mp.ts) —
// see lib/analytics.ts for the client-side copy of this constant.
const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || 'G-43MJRNXTDB';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

// Viewport meta — without this Next.js falls back to no viewport tag and
// mobile browsers render every page at a synthetic ~980px desktop width,
// then let the user pinch-zoom. Symptom: content sits in a narrow centre
// column with horizontal scroll on real phones. This one export fixes the
// whole site's mobile layout in one go.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1A0B2E',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com'),
  title: {
    default: 'Hotels in Multan | Hotel Elegant Executive Suites',
    template: '%s | Hotel Elegant Multan',
  },
  description:
    'Hotel Elegant Executive Suites — Multan\'s top-rated 3-star boutique hotel in Gulgasht Colony. 4.6★ on Google, 8.3 on Booking.com. Executive, Family & Presidential suites. Book direct for the best rate.',
  keywords: [
    'hotels in multan', 'hotel in multan', 'best hotel in multan', 'hotel rooms in multan',
    'hotels in gulgasht multan', 'top hotels in multan', 'online hotel booking in multan',
    'hotels in multan near airport', 'executive hotel multan', 'hotel elegant multan',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    siteName: 'Hotel Elegant Executive Suites',
    // Default social-share image (real hotel photo, 1280x720) — pages with a
    // more specific image (e.g. room pages) override this.
    images: [{ url: '/hero-poster.jpg', width: 1280, height: 720, alt: 'Hotel Elegant Executive Suites Multan' }],
  },
  twitter: { card: 'summary_large_image', images: ['/hero-poster.jpg'] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable}`}>
      <head>
        {/* Resource hints: pre-warm the TCP + TLS handshake to origins the
            page will definitely hit during LCP. Cheap on the client, saves
            ~100-300ms on first request to each domain. Do NOT preconnect to
            random hosts — only the ones we're certain we call. */}
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//connect.facebook.net" />
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      {/* Meta Pixel — loaded directly here so ViewContent / Search /
          Purchase / Contact fires (see lib/metaPixel.ts and the call sites
          that use it) go straight to Meta with no extra script-load /
          trigger-evaluation hop in between. */}
      <Script id="meta-pixel-script" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');`}
      </Script>
      {/* Google Ads + GA4 gtag.js — one shared library instance, loaded
          directly here. The Ads conversion actions (lib/googleAdsPixel.ts)
          and GA4 events (lib/analytics.ts) both fire through this. GA4's
          automatic page_view is disabled (send_page_view: false) —
          GA4PageViewTracker below fires it instead, so SPA route changes
          are tracked too. */}
      <Script
        id="gads-gtag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GADS_TAG_ID}`}
      />
      <Script id="gads-gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GADS_TAG_ID}');
        gtag('config', '${GA4_MEASUREMENT_ID}', { send_page_view: false });`}
      </Script>
      <body>
        <GA4PageViewTracker />
        {/* Meta Pixel noscript fallback — standard requirement so the base
            PageView still counts with JS disabled. */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            alt=""
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
        {children}
        {/* WebSite schema (no SearchAction — the site has no text search) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Hotel Elegant Executive Suites Multan',
              url: siteUrl,
              publisher: {
                '@type': 'Organization',
                name: 'Hotel Elegant Executive Suites',
                logo: { '@type': 'ImageObject', url: `${siteUrl}/icons/icon-512.png` },
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
