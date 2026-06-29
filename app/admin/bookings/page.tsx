import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import BookingsFilter from './BookingsFilter';

export const metadata: Metadata = { title: 'Bookings' };
export const revalidate = 0;

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  checked_in: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-gray-50 text-gray-600 border-gray-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

interface SearchParams { status?: string; search?: string }

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const supabase = await createClient();

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
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Bookings</h1>
        <Link href="/admin/bookings/new" className="btn-red py-2 px-6 text-xs">+ New Booking</Link>
      </div>

      <BookingsFilter currentStatus={sp.status} currentSearch={sp.search} />

      <div className="bg-white border border-gray-100 mt-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-montserrat">
            <thead>
              <tr className="bg-gray-50">
                {['Ref', 'Guest', 'Phone', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status', ''].map((h) => (
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
                    <span className={`px-2 py-0.5 text-xs font-semibold border ${statusColors[b.status] || ''} capitalize`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="text-[#E30613] text-xs hover:underline whitespace-nowrap">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {(bookings || []).length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No bookings found
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
