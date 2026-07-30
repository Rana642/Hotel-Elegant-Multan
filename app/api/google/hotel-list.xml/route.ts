import { NextResponse } from 'next/server';

// Google Hotels Free Booking Links — Hotel List Feed.
// Spec: https://support.google.com/hotelprices/answer/6280300 (Hotel List Feed)
//
// One-property feed: our XML declares a single hotel with a stable partner-
// side ID (we own 'elegant-suite-multan' — never renamed, never re-issued).
// Google fetches this URL periodically to know which properties we're
// offering rates on. Google's rate crawler then hits our rates feed
// (/api/google/rates.xml) for actual availability.
//
// Everything here must match what the hotel is registered as in Google
// Business Profile (name, address, phone) exactly — mismatches make
// Google refuse to associate the feed with our GBP listing, which means
// no "Official Website" badge no matter how good the rates feed is.
//
// Cached 6 hours: property info changes maybe once a year, but we want a
// fresh-ish TTL so if we DO update Settings, the feed reflects it same-day
// rather than needing a redeploy.

export const runtime = 'nodejs';
export const revalidate = 21600; // 6h — property info is near-static

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';

  // Partner-side ID — the primary key Google uses to reconcile this feed
  // with the pricing feed AND with our GBP listing (once the hotelier
  // links the property in Hotel Center). MUST NEVER CHANGE — if we ever
  // rename our brand, keep the ID the same and only change the display
  // <name>. Changing the ID is treated as "old hotel gone, new hotel
  // added" and the linkage resets to zero.
  const HOTEL_ID = 'elegant-suite-multan';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<listings>
  <language>en</language>
  <listing>
    <id>${HOTEL_ID}</id>
    <name>${escape('Hotel Elegant Executive Suites')}</name>
    <address format="simple">
      <component name="addr1">${escape('77-A Gulgasht Colony')}</component>
      <component name="city">Multan</component>
      <component name="province">Punjab</component>
      <component name="postal_code">60750</component>
      <component name="country">PK</component>
    </address>
    <content>
      <name>${escape('Hotel Elegant Executive Suites')}</name>
      <description>${escape(
        "Multan's top-rated 3-star boutique executive hotel in Gulgasht Colony. Free breakfast, WiFi and parking. 7 km from Multan International Airport."
      )}</description>
      <phone type="main">+923173330998</phone>
      <email>info@elegant-suite.com</email>
    </content>
    <latitude>30.217602524341853</latitude>
    <longitude>71.47079466355855</longitude>
    <category>3</category>
    <url type="booking">${escape(`${siteUrl}/booking`)}</url>
    <url type="website">${escape(siteUrl)}</url>
  </listing>
</listings>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=21600, s-maxage=21600',
    },
  });
}
