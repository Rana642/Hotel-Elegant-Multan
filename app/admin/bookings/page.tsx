import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate, formatKarachiTime, timeAgoKarachi } from '@/lib/utils';
import BookingsFilter from './BookingsFilter';
import DeleteBookingButton from './DeleteBookingButton';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Bookings' };
export const revalidate = 0;

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  checked_in: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-gray-50 text-gray-600 border-gray-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-orange-50 text-orange-700 border-orange-200',
};

/** Compact one-line attribution label for the bookings list. Prefers explicit
 *  ad click ids (gclid/fbclid — most reliable), falls back to utm_source, then
 *  referrer hostname, else "Direct". */
function attributionLabel(b: {
  utm_source?: string | null; utm_medium?: string | null;
  gclid?: string | null; fbclid?: string | null;
  referrer?: string | null;
}): { label: string; color: string } {
  if (b.fbclid) return { label: 'Facebook Ads', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (b.gclid)  return { label: 'Google Ads',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const src = (b.utm_source || '').toLowerCase();
  if (src) {
    if (src.includes('facebook') || src === 'fb' || src === 'ig' || src.includes('instagram') || src.includes('meta')) {
      return { label: `Meta (${b.utm_medium || 'unknown'})`, color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (src.includes('google')) {
      return { label: `Google (${b.utm_medium || 'unknown'})`, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { label: `${b.utm_source}${b.utm_medium ? ' / ' + b.utm_medium : ''}`, color: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  const ref = (b.referrer || '').toLowerCase();
  if (ref.includes('google'))    return { label: 'Google Organic',    color: 'bg-gray-50 text-gray-600 border-gray-200' };
  if (ref.includes('facebook') || ref.includes('fb.com') || ref.includes('instagram')) {
    return { label: 'Meta Organic', color: 'bg-gray-50 text-gray-600 border-gray-200' };
  }
  if (ref) return { label: ref, color: 'bg-gray-50 text-gray-600 border-gray-200' };
  return { label: 'Direct', color: 'bg-gray-50 text-gray-400 border-gray-100' };
}

interface SearchParams { status?: string; search?: string }

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  // Delete icons on each row are admin-only. Reception still sees the row
  // and can open it to change status — they just can't permanent-delete.
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';

  let query = supabase
    .from('bookings')
    .select('*, rooms(name)')
    .order('created_at', { ascending: false });

  if (sp.status && sp.status !== 'all') {
    query = query.eq('status', sp.status);
  }
  if (sp.search) {
    query = query.or(`guest_name.ilike.%${sp.search}%,booking_ref.ilike.%${sp.search}%,guest_phone.ilike.%${sp.search}%`);
  }

  const { data: bookings } = await query;

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Bookings</h1>
        <Link href="/admin/bookings/new" className="btn-red py-2 px-6 text-xs">+ New Booking</Link>
      </div>

      <BookingsFilter currentStatus={sp.status} currentSearch={sp.search} />

      {(bookings || []).length === 0 ? (
        <div className="bg-white border border-gray-100 mt-5 p-10 text-center">
          <p className="font-montserrat text-gray-400 text-sm">No bookings found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-gray-100 mt-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-montserrat">
                <thead>
                  <tr className="bg-gray-50">
                    {['Ref', 'Guest', 'Phone', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Source', 'Status', 'Received', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 tracking-wide uppercase whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(bookings || []).map((b: any) => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#E30613] text-xs whitespace-nowrap">{b.booking_ref}</td>
                      <td className="px-4 py-3 text-[#1A0B2E] font-medium">{b.guest_name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <a href={`tel:${b.guest_phone}`} className="hover:text-[#E30613]">{b.guest_phone}</a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.rooms?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.check_in)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.check_out)}</td>
                      <td className="px-4 py-3 text-gray-500 text-center">{b.nights}</td>
                      <td className="px-4 py-3 font-semibold text-[#1A0B2E] whitespace-nowrap">{formatCurrency(b.grand_total)}</td>
                      <td className="px-4 py-3">
                        {(() => {
                          const a = attributionLabel(b);
                          return (
                            <span className={`px-2 py-0.5 text-xs font-medium border ${a.color} whitespace-nowrap`} title={
                              [b.utm_source && 'src:' + b.utm_source, b.utm_medium && 'med:' + b.utm_medium, b.utm_campaign && 'cmp:' + b.utm_campaign, b.referrer && 'ref:' + b.referrer].filter(Boolean).join(' · ') || 'No attribution'
                            }>
                              {a.label}
                            </span>
                          );
                        })()}
                      </td>
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
                        <div className="flex items-center gap-3">
                          <Link href={`/admin/bookings/${b.id}`} className="text-[#E30613] text-xs hover:underline whitespace-nowrap">
                            View →
                          </Link>
                          {isAdmin && <DeleteBookingButton bookingId={b.id} bookingRef={b.booking_ref} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-3 mt-5">
            {(bookings || []).map((b: any) => {
              const a = attributionLabel(b);
              return (
                <div key={b.id} className="bg-white border border-gray-100 p-4">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-montserrat font-semibold text-[#E30613] text-xs">{b.booking_ref}</p>
                      <p className="font-montserrat font-medium text-[#1A0B2E] mt-0.5">{b.guest_name}</p>
                      <a href={`tel:${b.guest_phone}`} className="text-xs text-gray-500 font-montserrat">{b.guest_phone}</a>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider shrink-0 ${statusColors[b.status] || ''} capitalize`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[10px] px-2 py-0.5 border rounded bg-gray-50 text-gray-600 border-gray-200">
                      {b.rooms?.name || '—'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 border rounded ${a.color}`}>
                      {a.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-montserrat text-gray-500 mb-3">
                    <span>{formatDate(b.check_in)} → {formatDate(b.check_out)} · {b.nights}n</span>
                    <span className="font-semibold text-[#1A0B2E]">{formatCurrency(b.grand_total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400 font-montserrat">
                      {formatKarachiTime(b.created_at)} · {timeAgoKarachi(b.created_at)}
                    </p>
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/bookings/${b.id}`} className="text-[#E30613] text-xs font-semibold hover:underline">
                        View →
                      </Link>
                      {isAdmin && <DeleteBookingButton bookingId={b.id} bookingRef={b.booking_ref} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
