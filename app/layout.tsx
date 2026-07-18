import type { Metadata } from 'next';
import { Playfair_Display, Montserrat } from 'next/font/google';
import './globals.css';

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com'),
  title: {
    default: 'Hotels in Multan | Hotel Elegant Executive Suites',
    template: '%s | Hotel Elegant Multan',
  },
  description:
    'Hotel Elegant Executive Suites — Multan\'s top-rated boutique hotel in Gulgasht Colony. 4.4★ on Google, 8.0 on Booking.com. Executive, Family & Presidential suites. Book direct for the best rate.',
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
      <body>
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
