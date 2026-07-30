import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate, formatKarachiTime, timeAgoKarachi } from '@/lib/utils';
import Link from 'next/link';
import { CalendarDays, BedDouble, DollarSign, Clock, MessageSquare, TrendingUp, CheckCircle2, Inbox, Ticket } from 'lucide-react';

export const metadata: Metadata = { title: 'Dashboard' };

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  // ISO for `.gte('created_at', ...)` — last 30 days window for inquiry stats.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: todayCheckIns },
    { count: todayCheckOuts },
    { count: pendingBookings },
    { data: recentBookings },
    { data: allBookings },
    { data: inquiries30d },
    { data: recentInquiries },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('check_in', today).neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('check_out', today).neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*, rooms(name)').order('created_at', { ascending: false }).limit(8),
    supabase.from('bookings').select('grand_total, status').neq('status', 'cancelled'),
    // Pull all inquiry rows from the last 30 days ONCE and derive every
    // stat from that array — one round trip instead of four.
    supabase.from('inquiries').select('status').gte('created_at', thirtyDaysAgo),
    supabase.from('inquiries').select('id, guest_name, guest_phone, preferred_channel, intent, status, utm_source, fbclid, gclid, created_at, booking_id').order('created_at', { ascending: false }).limit(6),
  ]);

  // Coupon snapshot (last 30d discount given + active coupons count) —
  // small side query, doesn't block anything above if it errors.
  const [{ data: recentDiscounted }, { count: activeCoupons }] = await Promise.all([
    supabase.from('bookings').select('discount_amount').gte('created_at', thirtyDaysAgo).not('coupon_code', 'is', null),
    supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);
  const totalDiscountGiven = (recentDiscounted || []).reduce((s: number, b: any) => s + Number(b.discount_amount || 0), 0);

  const totalRevenue = (allBookings || []).reduce((sum: number, b: any) => sum + (b.grand_total || 0), 0);

  // Inquiry funnel numbers derived client-side from the 30-day window.
  const inqTotal     = (inquiries30d || []).length;
  const inqNew       = (inquiries30d || []).filter((i: any) => i.status === 'new').length;
  const inqConverted = (inquiries30d || []).filter((i: any) => i.status === 'converted').length;
  const inqClosed    = (inquiries30d || []).filter((i: any) => i.status === 'closed').length;
  // Convert-rate uses (converted + closed) as the denominator — the "worked"
  // pool. Pure 'new' inquiries are still open, counting them would tank the
  // rate artificially before staff has even replied.
  const worked = inqConverted + inqClosed;
  const inqConvRate = worked > 0 ? Math.round((inqConverted / worked) * 100) : 0;

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    checked_in: 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-gray-50 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { label: "Today's Check-ins", value: todayCheckIns || 0, icon: CalendarDays, color: 'text-green-600', bg: 'bg-green-50' },
          { label: "Today's Check-outs", value: todayCheckOuts || 0, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Bookings', value: pendingBookings || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Revenue (Est.)', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-[#E30613]', bg: 'bg-red-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon size={22} className={stat.color} />
            </div>
            <div>
              <p className="font-playfair font-semibold text-xl text-[#1A0B2E]">{stat.value}</p>
              <p className="font-montserrat text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Inquiries analytics — last 30 days ─────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-playfair font-semibold text-lg text-[#1A0B2E]">Inquiries — last 30 days</h2>
          <Link href="/admin/inquiries" className="text-[#E30613] text-xs font-montserrat font-semibold hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {[
            { label: 'New / open',      value: inqNew,       icon: Inbox,        color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Converted',       value: inqConverted, icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50' },
            { label: 'Conversion rate', value: `${inqConvRate}%`, icon: TrendingUp, color: 'text-[#E30613]', bg: 'bg-red-50' },
            { label: 'Total (30d)',     value: inqTotal,     icon: MessageSquare, color: 'text-[#1A0B2E]', bg: 'bg-[#1A0B2E]/[0.06]' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-100 p-5 flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon size={22} className={stat.color} />
              </div>
              <div>
                <p className="font-playfair font-semibold text-xl text-[#1A0B2E]">{stat.value}</p>
                <p className="font-montserrat text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent inquiries — compact list */}
        <div className="bg-white border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Recent inquiries</h3>
            <Link href="/admin/inquiries" className="text-[#E30613] text-xs font-montserrat font-semibold hover:underline">
              Manage →
            </Link>
          </div>
          {(recentInquiries || []).length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400 text-sm font-montserrat">
              No inquiries yet. When guests submit the WhatsApp/Call modal, they'll show up here.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(recentInquiries || []).map((i: any) => {
                const isAd = i.fbclid || i.gclid || i.utm_source === 'facebook' || i.utm_source === 'google';
                return (
                  <Link
                    key={i.id}
                    href={i.status === 'converted' && i.booking_id ? `/admin/bookings/${i.booking_id}` : '/admin/inquiries'}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          i.preferred_channel === 'whatsapp' ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-[#E30613]/10 text-[#E30613]'
                        }`}
                      >
                        <MessageSquare size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-montserrat text-sm text-[#1A0B2E] font-medium truncate">{i.guest_name}</p>
                        <p className="font-montserrat text-[11px] text-gray-500 truncate">
                          {i.intent === 'booking' ? 'Booking' : 'Inquiry'} · {i.preferred_channel}
                          {isAd && ' · Ad'}
                          {i.guest_phone ? ` · ${i.guest_phone}` : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider shrink-0 ${
                        i.status === 'new'       ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        i.status === 'converted' ? 'bg-green-50 text-green-700 border-green-200' :
                        i.status === 'closed'    ? 'bg-gray-100 text-gray-500 border-gray-200' :
                                                   'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {i.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Coupons snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10 max-w-2xl">
        <Link
          href="/admin/coupons"
          className="bg-white border border-gray-100 p-5 flex items-center gap-4 hover:border-[#E30613] transition-colors group"
        >
          <div className="w-12 h-12 bg-purple-50 flex items-center justify-center shrink-0">
            <Ticket size={22} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-playfair font-semibold text-xl text-[#1A0B2E]">{activeCoupons ?? 0}</p>
            <p className="font-montserrat text-xs text-gray-500 mt-0.5">Active coupons</p>
          </div>
          <span className="text-[#E30613] text-xs font-montserrat font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Manage →</span>
        </Link>
        <div className="bg-white border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 flex items-center justify-center shrink-0">
            <TrendingUp size={22} className="text-green-600" />
          </div>
          <div>
            <p className="font-playfair font-semibold text-xl text-[#1A0B2E]">{formatCurrency(totalDiscountGiven)}</p>
            <p className="font-montserrat text-xs text-gray-500 mt-0.5">Discounts given (last 30d)</p>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-[#E30613] text-xs font-montserrat font-semibold hover:underline">
            View all →
          </Link>
        </div>
        {/* Mobile: app-style card list */}
        <div className="sm:hidden divide-y divide-gray-50">
          {(recentBookings || []).map((b: any) => (
            <Link key={b.id} href={`/admin/bookings/${b.id}`} className="flex items-center gap-3 p-4 active:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-montserrat font-semibold text-[#1A0B2E] text-sm truncate">{b.guest_name}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold border ${statusColors[b.status] || ''} capitalize shrink-0`}>
                    {b.status}
                  </span>
                </div>
                <p className="font-montserrat text-xs text-gray-500 truncate">
                  {b.rooms?.name || '—'} · {formatDate(b.check_in)} → {formatDate(b.check_out)}
                </p>
                <p className="font-montserrat text-[10px] text-[#E30613] font-semibold mt-0.5">{b.booking_ref}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">{formatCurrency(b.grand_total)}</p>
                <span className="text-[#E30613] text-xs">View →</span>
              </div>
            </Link>
          ))}
          {(recentBookings || []).length === 0 && (
            <p className="px-4 py-8 text-center text-gray-400 text-sm">
              No bookings yet. They'll appear here once guests start booking.
            </p>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm font-montserrat">
            <thead>
              <tr className="bg-gray-50">
                {['Ref', 'Guest', 'Room', 'Check-in', 'Check-out', 'Total', 'Status', 'Received', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 tracking-wide uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recentBookings || []).map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#E30613] text-xs whitespace-nowrap">{b.booking_ref}</td>
                  <td className="px-4 py-3 text-[#1A0B2E]">{b.guest_name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.rooms?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.check_in)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.check_out)}</td>
                  <td className="px-4 py-3 font-semibold text-[#1A0B2E] whitespace-nowrap">{formatCurrency(b.grand_total)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold border ${statusColors[b.status] || ''} capitalize`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    <p className="text-[#1A0B2E]">{formatKarachiTime(b.created_at)}</p>
                    <p className="text-gray-400 text-[10px]">{timeAgoKarachi(b.created_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="text-[#E30613] text-xs hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {(recentBookings || []).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No bookings yet. They'll appear here once guests start booking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
