import { NextResponse } from 'next/server';

// /llms.txt — Markdown-formatted site summary optimised for LLM ingestion.
// Spec: https://llmstxt.org — proposed by Answer.AI / Jeremy Howard, now
// respected by ChatGPT, Claude, Perplexity, Gemini as a curated shortcut
// to the site's most useful pages. Answers "what is this site about, where
// is the good stuff, and who runs it?" without needing to crawl 50 pages.
//
// Route (vs static public file) so we can pull current review counts,
// pricing, and links from live config without hand-editing the file every
// time something changes.

export const runtime = 'nodejs';
export const revalidate = 3600; // one hour is plenty for a summary file

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';

  const body = `# Hotel Elegant Executive Suites Multan

> Multan's top-rated boutique executive hotel in Gulgasht Colony — 4.6★ on Google (432 reviews) and 8.3 "Very Good" on Booking.com (145 reviews). Executive, Family, and Presidential suites, ~7 km from Multan International Airport. Direct bookings with no advance payment — confirm via WhatsApp or call, pay at the hotel.

## About

Hotel Elegant Executive Suites is a boutique hotel at 77-A Gulgasht Colony, Multan, opened 2024. Independently owned and operated. Free breakfast, WiFi, and parking for every stay. 24-hour front desk. Guests consistently praise cleanliness, staff hospitality, and quiet neighbourhood location.

- **Address**: 77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan
- **Phone / WhatsApp**: +92 317 333 0998
- **Email**: info@elegant-suite.com
- **Check-in**: 24 hours (front desk always staffed) · **Check-out**: 12:00 noon

## Rooms

- [Executive King](${siteUrl}/rooms/executive-king) — 2 adults, king bed
- [Family Suite](${siteUrl}/rooms/family-suite) — 4 adults + 1 child, 525 sq ft, separate living area
- [Presidential Suite](${siteUrl}/rooms/presidential-suite) — 3 adults, premium layout
- [Junior Suite](${siteUrl}/rooms/junior-suite) — 3 adults + 2 children
- [Triple Sharing](${siteUrl}/rooms/triple-sharing) — 3 adults, budget-friendly

## Booking

- [Check availability and book online](${siteUrl}/booking) — no advance payment, confirm via WhatsApp
- WhatsApp direct: https://wa.me/923173330998
- Call: +92 317 333 0998

## Location highlights

- ~7 km from Multan International Airport
- Walking distance to food courts, restaurants, and brand outlets
- Under 1 km to Metro Bus and main-road transport
- ~3 km to Multan Cricket Stadium
- Short drive to Shah Rukn-e-Alam Tomb and Multan Old City

## Content

- [About the hotel](${siteUrl}/about)
- [Photo gallery](${siteUrl}/gallery)
- [Blog and Multan travel guides](${siteUrl}/blog)
- [Contact and directions](${siteUrl}/contact)
- [Hotel policy](${siteUrl}/policy)
- [Privacy policy](${siteUrl}/privacy-policy)
- [Terms of service](${siteUrl}/terms)

## Optional

- [Sitemap (XML)](${siteUrl}/sitemap.xml)
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
