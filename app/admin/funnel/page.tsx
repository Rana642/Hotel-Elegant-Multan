import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Funnel' };
export const revalidate = 0;

const RANGE_OPTIONS = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: 'all', label: 'All Time', days: null },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]['key'];

const LOST_STATUSES = ['cancelled', 'no_show'];
const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in', 'completed'];

function isFacebookAttributed(row: { fbclid: string | null; utm_source: string | null }): boolean {
  return !!row.fbclid || row.utm_source === 'facebook';
}

interface Props {
  searchParams: { range?: string };
}

export default async function FunnelPage({ searchParams }: Props) {
  const range: RangeKey = RANGE_OPTIONS.some((r) => r.key === searchParams.range)
    ? (searchParams.range as RangeKey)
    : '30d';
  const selected = RANGE_OPTIONS.find((r) => r.key === range)!;

  const supabase = await createClient();

  let inquiryQuery = supabase
    .from('inquiries')
    .select('id, status, fbclid, utm_source, created_at');
  let bookingQuery = supabase
    .from('bookings')
    .select('id, status, grand_total, fbclid, utm_source, created_at');

  if (selected.days) {
    const since = new Date(Date.now() - selected.days * 24 * 60 * 60 * 1000).toISOString();
    inquiryQuery = inquiryQuery.gte('created_at', since);
    bookingQuery = bookingQuery.gte('created_at', since);
  }

  const [{ data: inquiryRows }, { data: bookingRows }] = await Promise.all([inquiryQuery, bookingQuery]);
  const inquiries = inquiryRows || [];
  const bookings = bookingRows || [];

  // ── Lead funnel: real, named inquiries -> converted to a booking ──
  const totalInquiries = inquiries.length;
  const convertedInquiries = inquiries.filter((i) => i.status === 'converted').length;
  const conversionPct = totalInquiries ? Math.round((convertedInquiries / totalInquiries) * 100) : 0;

  // ── Booking funnel: every booking (inquiry-sourced or direct) -> active -> completed ──
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const lostBookings = bookings.filter((b) => LOST_STATUSES.includes(b.status)).length;
  const activePct = totalBookings ? Math.round((activeBookings / totalBookings) * 100) : 0;
  const completedPct = totalBookings ? Math.round((completedBookings.length / totalBookings) * 100) : 0;
  const lostPct = totalBookings ? Math.round((lostBookings / totalBookings) * 100) : 0;
  const completedRevenue = completedBookings.reduce((s, b) => s + (b.grand_total || 0), 0);

  // ── Attribution: Facebook Ads vs everything else, across both sources ──
  const fbInquiries = inquiries.filter(isFacebookAttributed).length;
  const fbBookings = bookings.filter(isFacebookAttributed).length;

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Funnel</h1>
          <p className="font-montserrat text-gray-500 text-sm mt-1">
            Real, database-verified journey — inquiry to completed stay. No ad-platform estimates.
          </p>
        </div>
        <div className="flex border border-gray-200 bg-white overflow-x-auto max-w-full">
          {RANGE_OPTIONS.map((r) => (
            <Link
              key={r.key}
              href={`/admin/funnel?range=${r.key}`}
              className={`px-3 sm:px-4 py-2 text-xs font-montserrat font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                r.key === range ? 'bg-[#E30613] text-white' : 'text-gray-500 hover:text-[#1A0B2E]'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { label: 'Total Inquiries', value: totalInquiries },
          { label: 'Total Bookings', value: totalBookings },
          { label: 'Completed Revenue', value: formatCurrency(completedRevenue) },
          { label: 'Lost (Cancelled + No-show)', value: `${lostBookings} · ${lostPct}%` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 p-5">
            <p className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-1">{s.value}</p>
            <p className="font-montserrat text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Lead funnel */}
        <div className="bg-white border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide">Lead Funnel</h2>
            <p className="font-montserrat text-xs text-gray-400 mt-0.5">Named WhatsApp / Call inquiries only — button taps aren&apos;t counted here.</p>
          </div>
          <div className="p-5 space-y-5">
            <FunnelBar label="Inquiries" count={totalInquiries} pct={100} color="#1A0B2E" />
            <FunnelBar label="Converted to Booking" count={convertedInquiries} pct={conversionPct} color="#E30613" />
            {totalInquiries === 0 && (
              <p className="text-sm font-montserrat text-gray-400">No inquiries in this range.</p>
            )}
          </div>
        </div>

        {/* Booking funnel */}
        <div className="bg-white border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide">Booking Funnel</h2>
            <p className="font-montserrat text-xs text-gray-400 mt-0.5">All bookings, direct or converted — through to a real, realized stay.</p>
          </div>
          <div className="p-5 space-y-5">
            <FunnelBar label="Bookings Created" count={totalBookings} pct={100} color="#1A0B2E" />
            <FunnelBar label="Active (not lost)" count={activeBookings} pct={activePct} color="#F59E0B" />
            <FunnelBar label="Completed (real revenue)" count={completedBookings.length} pct={completedPct} color="#16A34A" />
            {totalBookings === 0 && (
              <p className="text-sm font-montserrat text-gray-400">No bookings in this range.</p>
            )}
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div className="bg-white border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide">Attribution</h2>
          <p className="font-montserrat text-xs text-gray-400 mt-0.5">How much of this range&apos;s real activity came from Facebook Ads (fbclid-verified) vs everything else.</p>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-6">
          <AttributionRow label="Inquiries from Facebook Ads" count={fbInquiries} total={totalInquiries} color="#1877F2" />
          <AttributionRow label="Bookings from Facebook Ads" count={fbBookings} total={totalBookings} color="#1877F2" />
        </div>
      </div>
    </div>
  );
}

function FunnelBar({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm font-montserrat mb-1.5">
        <span className="text-[#1A0B2E] font-medium">{label}</span>
        <span className="font-semibold" style={{ color }}>{count} {pct !== 100 && <span className="text-gray-400 font-normal">({pct}%)</span>}</span>
      </div>
      <div className="h-3 bg-gray-100">
        <div className="h-3" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function AttributionRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm font-montserrat mb-1.5">
        <span className="text-[#1A0B2E] font-medium">{label}</span>
        <span className="font-semibold text-gray-600">{count} / {total} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-3 bg-gray-100">
        <div className="h-3" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
