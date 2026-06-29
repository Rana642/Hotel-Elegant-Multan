import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { CalendarDays, BedDouble, DollarSign, Clock } from 'lucide-react';

export const metadata: Metadata = { title: 'Dashboard' };

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const [
    { count: todayCheckIns },
    { count: todayCheckOuts },
    { count: pendingBookings },
    { data: recentBookings },
    { data: allBookings },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('check_in', today).neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('check_out', today).neq('status', 'cancelled'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*, rooms(name)').order('created_at', { ascending: false }).limit(8),
    supabase.from('bookings').select('grand_total, status').neq('status', 'cancelled'),
  ]);

  const totalRevenue = (allBookings || []).reduce((sum: number, b: any) => sum + (b.grand_total || 0), 0);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    checked_in: 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-gray-50 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
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

      {/* Recent Bookings */}
      <div className="bg-white border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-[#E30613] text-xs font-montserrat font-semibold hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-montserrat">
            <thead>
              <tr className="bg-gray-50">
                {['Ref', 'Guest', 'Room', 'Check-in', 'Check-out', 'Total', 'Status', ''].map((h) => (
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
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="text-[#E30613] text-xs hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {(recentBookings || []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
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
