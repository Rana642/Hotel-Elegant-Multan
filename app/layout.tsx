import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Montserrat } from 'next/font/google';
import GA4PageViewTracker from '@/components/GA4PageViewTracker';
import './globals.css';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '27407654508906433';
const GADS_TAG_ID = process.env.NEXT_PUBLIC_GADS_TAG_ID || 'AW-18370206861';
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
    'Hotel Elegant Executive Suites — Multan\'s top-rated 3-star boutique hotel in Gulgasht Colony. 4.6★ on Google from 600+ reviews. Executive, Family & Presidential suites. Book direct for the best rate.',
  keywords: [
    'hotels in multan', 'hotel in multan', 'best hotel in multan', 'hotel rooms in multan',
    'hotels in gulgasht multan', 'top hotels in multan', 'online hotel booking in multan',
    'hotels in multan near airport', 'executive hotel multan', 'hotel elegant multan',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    siteName: 'Hotel Elegant Executive Suites Multan',
    // Default social-share image (real hotel photo, 1280x720) — pages with a
    // more specific image (e.g. room pages) override this.
    images: [{ url: '/hero-poster.jpg', width: 1280, height: 720, alt: 'Hotel Elegant Executive Suites Multan' }],
  },
  twitter: { card: 'summary_large_image', images: ['/hero-poster.jpg'] },
  robots: { index: true, follow: true },
};

// Tracking init — see the comment where it's rendered in <head>.
const TRACKING_INIT = `(function(){
        var p=location.pathname, isAdmin=p.indexOf('/admin')===0, internal=false;
        try{
          if(location.search.indexOf('he_internal=0')>-1)localStorage.removeItem('he_internal');
          if(isAdmin)localStorage.setItem('he_internal','1');
          internal=localStorage.getItem('he_internal')==='1';
        }catch(e){}
        window.__heInternal=internal;
        if(isAdmin)return;
        window.dataLayer=window.dataLayer||[];
        window.gtag=function(){dataLayer.push(arguments);};
        gtag('js',new Date());
        if(!internal)gtag('config','${GADS_TAG_ID}');
        gtag('config','${GA4_MEASUREMENT_ID}',internal?{send_page_view:false,traffic_type:'internal'}:{send_page_view:false});
        var g=document.createElement('script');g.async=true;
        g.src='https://www.googletagmanager.com/gtag/js?id='+(internal?'${GA4_MEASUREMENT_ID}':'${GADS_TAG_ID}');
        document.head.appendChild(g);
        if(internal)return;
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${META_PIXEL_ID}');
        fbq('track','PageView');
        })();`;

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
        {/* Tracking init — Google tag (Ads + GA4) and Meta Pixel.
            Inline in <head> so window.gtag / window.fbq exist (as queues)
            BEFORE React hydrates. With next/script afterInteractive, mount-time events
            (room-page ViewContent, thank-you Purchase/conversion, first
            page_view) often ran before the stubs existed and were silently
            dropped — view_room fired 14 times for ~300 room-page views.
            The libraries themselves still load async.

            Staff traffic is kept out of the data:
            - /admin pages load no tracking at all.
            - A browser that has opened /admin is remembered as internal
              (localStorage he_internal=1): GA4 still records it, tagged
              traffic_type=internal (filter it in GA4 → Data filters), and
              no Google Ads / Meta events are sent. Visit any page with
              ?he_internal=0 to clear the flag. */}
        <script id="tracking-init" dangerouslySetInnerHTML={{ __html: TRACKING_INIT }} />
      </head>
      <body>
        <GA4PageViewTracker />
        {/* No Meta Pixel <noscript> image: React/Next hoists its <img> into a
            <link rel="preload">, so it fired an extra PageView on EVERY load
            (JS on, admin pages included), double-counting PageView. */}
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
                name: 'Hotel Elegant Executive Suites Multan',
                logo: { '@type': 'ImageObject', url: `${siteUrl}/icons/icon-512.png` },
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
