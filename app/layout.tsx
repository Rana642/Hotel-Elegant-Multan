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
    default: 'Hotels in Multan | Hotel Elegant Executive Suites — Best Hotel in Multan',
    template: '%s | Hotel Elegant Executive Suites Multan',
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
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
