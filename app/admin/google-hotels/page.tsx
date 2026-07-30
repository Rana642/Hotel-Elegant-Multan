import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getHotelTaxPercent } from '@/lib/tax';
import { getRoomPricing, formatCurrency } from '@/lib/utils';
import { CopyableCode } from './CopyableCode';

export const metadata: Metadata = { title: 'Google Hotels — Elegant Suite Admin' };
export const revalidate = 0;

// Admin control panel for the Google Hotels Free Booking Links integration.
// The two XML feed endpoints (/api/google/hotel-list.xml + /api/google/rates.xml)
// live in the public tree so Google's crawler can reach them without auth.
// This page is the human-facing counterpart: shows what those feeds are
// currently reporting, gives the admin copy-paste-ready feed URLs for the
// Hotel Center application, and documents the enrollment steps so the
// admin has one screen with everything they need.

export default async function GoogleHotelsPage() {
  await requireAdmin();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';
  const supabase = createServiceClient();

  const [{ data: rooms }, taxPercent] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, name, slug, price_per_night, offer_price, total_units, is_active')
      .eq('is_active', true)
      .order('sort_order'),
    getHotelTaxPercent(),
  ]);

  const activeRooms = rooms || [];
  // Estimate how many <result> rows the rates feed will emit right now
  // (rooms × 90 days, minus fully sold-out dates). Rough — the real feed
  // subtracts sold-out days, but that count is small in normal operation
  // so this is close enough for the admin dashboard.
  const roughRateRows = activeRooms.length * 90;

  const feedUrls = [
    { label: 'Hotel List Feed', url: `${siteUrl}/api/google/hotel-list.xml`, purpose: 'Property details — Google fetches ~every 6h' },
    { label: 'Rates & Availability Feed', url: `${siteUrl}/api/google/rates.xml`, purpose: 'Daily rates for next 90 days — cached 15 min' },
    { label: 'Booking Landing URL', url: `${siteUrl}/booking?checkIn={checkIn}&checkOut={checkOut}&adults={adults}`, purpose: 'Where Google sends the guest after they click your rate' },
  ];

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0 max-w-4xl">
      <div className="mb-8">
        <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-1">
          Google Hotels
        </p>
        <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">
          Free Booking Links — Official Website Badge
        </h1>
        <p className="font-montserrat text-gray-500 text-sm mt-2 max-w-2xl">
          Get your direct rate to show on Google Hotels alongside Booking.com, Agoda, and Expedia —
          with an <strong>Official Website</strong> badge. Guest clicks it, lands on our /booking page,
          you pay <strong>0% commission</strong>.
        </p>
      </div>

      {/* Feed health */}
      <div className="bg-white border border-gray-100 p-6 mb-6">
        <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-4">
          Current Feed State
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-montserrat uppercase tracking-widest text-gray-400">Active Rooms</p>
            <p className="font-playfair font-semibold text-2xl text-[#1A0B2E] mt-1">{activeRooms.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-montserrat uppercase tracking-widest text-gray-400">Days Ahead</p>
            <p className="font-playfair font-semibold text-2xl text-[#1A0B2E] mt-1">90</p>
          </div>
          <div>
            <p className="text-[10px] font-montserrat uppercase tracking-widest text-gray-400">Rate Rows (est)</p>
            <p className="font-playfair font-semibold text-2xl text-[#1A0B2E] mt-1">~{roughRateRows}</p>
          </div>
          <div>
            <p className="text-[10px] font-montserrat uppercase tracking-widest text-gray-400">Tax %</p>
            <p className="font-playfair font-semibold text-2xl text-[#1A0B2E] mt-1">{taxPercent}%</p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="font-montserrat text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            Rooms in the feed
          </p>
          <div className="space-y-1.5">
            {activeRooms.map((r: any) => {
              const { effective, hasOffer, original } = getRoomPricing(r);
              return (
                <div key={r.id} className="flex items-center justify-between text-sm font-montserrat py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="text-[#1A0B2E] font-medium">{r.name}</span>
                    <span className="ml-2 text-xs text-gray-400">× {r.total_units ?? 1} unit{(r.total_units ?? 1) !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {hasOffer && <span className="line-through mr-1">{formatCurrency(original)}</span>}
                    <span className="text-[#1A0B2E] font-semibold">{formatCurrency(effective)}</span>/night
                  </div>
                </div>
              );
            })}
            {activeRooms.length === 0 && (
              <p className="text-sm text-gray-400 font-montserrat">No active rooms. Feed will be empty until rooms are added.</p>
            )}
          </div>
        </div>
      </div>

      {/* Feed URLs */}
      <div className="bg-white border border-gray-100 p-6 mb-6">
        <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-4">
          Feed URLs — for Hotel Center application
        </h2>
        <div className="space-y-4">
          {feedUrls.map((f) => (
            <div key={f.label}>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="font-montserrat text-xs font-semibold text-[#1A0B2E] uppercase tracking-wide">{f.label}</p>
                <p className="text-[10px] text-gray-400 font-montserrat">— {f.purpose}</p>
              </div>
              <CopyableCode value={f.url} />
            </div>
          ))}
        </div>
      </div>

      {/* Enrollment steps */}
      <div className="bg-white border border-gray-100 p-6">
        <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-4">
          Enrollment Steps
        </h2>
        <ol className="space-y-4 font-montserrat text-sm text-gray-600">
          {[
            {
              title: 'Confirm Booking.com + Agoda extranets show 3-star',
              body: 'Google matches your feed against OTA data. If both OTAs report your hotel as 3-star + Gulgasht Colony address, our feed passes the sanity check.',
            },
            {
              title: 'Apply for Google Hotel Center access',
              body: (
                <>
                  Go to{' '}
                  <a href="https://support.google.com/hotelprices/answer/6109538" target="_blank" rel="noopener noreferrer" className="text-[#E30613] underline">
                    support.google.com/hotelprices/answer/6109538
                  </a>{' '}
                  and submit the &ldquo;Contact Us&rdquo; form. Mention: single-property independent hotel in Multan, Pakistan, using self-hosted rate feed.
                </>
              ),
            },
            {
              title: 'Verify property ownership in Hotel Center',
              body: 'Google may ask to verify via a domain-verification code (add a DNS TXT record) or via your existing Google Business Profile (recommended — instant if GBP is already verified).',
            },
            {
              title: 'Paste our 3 URLs into Hotel Center',
              body: 'Property List URL = Hotel List Feed URL above. Transaction feed URL = Rates & Availability Feed URL above. Booking Link URL Template = Booking Landing URL above (Google will auto-substitute {checkIn} / {checkOut} / {adults}).',
            },
            {
              title: 'Wait for Google review (2–14 days)',
              body: 'Google validates our XML, cross-checks the price with what your website shows, then approves. Once live, your direct rate appears alongside OTAs with an "Official Website" label.',
            },
          ].map((step, i) => (
            <li key={i} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-[#E30613] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#1A0B2E] mb-1">{step.title}</p>
                <p className="text-gray-500 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 p-4 rounded bg-amber-50 border border-amber-100 text-xs font-montserrat text-amber-700">
        <p className="font-semibold mb-1">Note: Free ≠ Instant</p>
        <p className="leading-relaxed">
          Free Booking Links carries zero cost per booking but Google&apos;s review can take up to 2 weeks.
          For faster approval, consistency with your Booking.com / Agoda listings (name, address, star rating, phone)
          is the biggest lever — everything else here is already technically ready.
        </p>
      </div>
    </div>
  );
}
