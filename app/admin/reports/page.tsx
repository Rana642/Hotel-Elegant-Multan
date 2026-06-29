import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Reports' };
export const revalidate = 0;

export default async function ReportsPage() {
  const supabase = await createClient();

  const [
    { data: bookings },
    { data: rooms },
  ] = await Promise.all([
    supabase.from('bookings').select('check_in, check_out, room_id, grand_total, nights, status, created_at'),
    supabase.from('rooms').select('id, name'),
  ]);

  const active = (bookings || []).filter((b: any) => b.status !== 'cancelled');
  const totalRevenue = active.reduce((s: number, b: any) => s + (b.grand_total || 0), 0);
  const totalNights = active.reduce((s: number, b: any) => s + (b.nights || 0), 0);

  const roomMap: Record<string, string> = {};
  (rooms || []).forEach((r: any) => { roomMap[r.id] = r.name; });

  const byRoom: Record<string, { count: number; revenue: number; nights: number }> = {};
  active.forEach((b: any) => {
    if (!byRoom[b.room_id]) byRoom[b.room_id] = { count: 0, revenue: 0, nights: 0 };
    byRoom[b.room_id].count++;
    byRoom[b.room_id].revenue += b.grand_total || 0;
    byRoom[b.room_id].nights += b.nights || 0;
  });

  const byRoomSorted = Object.entries(byRoom)
    .map(([id, stats]) => ({ id, name: roomMap[id] || id, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);

  // Monthly breakdown (last 6 months)
  const monthly: Record<string, { count: number; revenue: number }> = {};
  active.forEach((b: any) => {
    const month = b.created_at?.substring(0, 7);
    if (!month) return;
    if (!monthly[month]) monthly[month] = { count: 0, revenue: 0 };
    monthly[month].count++;
    monthly[month].revenue += b.grand_total || 0;
  });
  const monthlySorted = Object.entries(monthly).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8">Reports</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { label: 'Total Bookings', value: active.length },
          { label: 'Total Nights Booked', value: totalNights },
          { label: 'Est. Total Revenue', value: formatCurrency(totalRevenue) },
          { label: 'Avg. Booking Value', value: active.length ? formatCurrency(totalRevenue / active.length) : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 p-5">
            <p className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-1">{s.value}</p>
            <p className="font-montserrat text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Revenue by room */}
        <div className="bg-white border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide">Revenue by Room</h2>
          </div>
          <div className="p-5 space-y-4">
            {byRoomSorted.map((r) => (
              <div key={r.id}>
                <div className="flex justify-between text-sm font-montserrat mb-1.5">
                  <span className="text-[#1A0B2E] font-medium">{r.name}</span>
                  <span className="text-[#E30613] font-semibold">{formatCurrency(r.revenue)}</span>
                </div>
                <div className="h-1.5 bg-gray-100">
                  <div
                    className="h-1.5 bg-[#E30613]"
                    style={{ width: `${byRoomSorted[0].revenue > 0 ? (r.revenue / byRoomSorted[0].revenue) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs font-montserrat text-gray-400 mt-1">{r.count} bookings · {r.nights} nights</p>
              </div>
            ))}
            {byRoomSorted.length === 0 && (
              <p className="text-sm font-montserrat text-gray-400">No booking data yet.</p>
            )}
          </div>
        </div>

        {/* Monthly breakdown */}
        <div className="bg-white border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide">Monthly Bookings</h2>
          </div>
          <div className="p-5">
            {monthlySorted.length > 0 ? (
              <table className="w-full text-sm font-montserrat">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs text-gray-500 font-semibold">Month</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Bookings</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500 font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthlySorted.map(([month, data]) => (
                    <tr key={month}>
                      <td className="px-3 py-2.5 text-[#1A0B2E]">{month}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{data.count}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[#E30613]">{formatCurrency(data.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm font-montserrat text-gray-400">No booking data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
