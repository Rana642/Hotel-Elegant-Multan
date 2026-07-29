import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { Plus, Ticket } from 'lucide-react';
import CouponRowActions from './CouponRowActions';

export const metadata: Metadata = { title: 'Coupons' };
export const revalidate = 0;

interface CouponRow {
  code: string;
  name: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  valid_from: string | null;
  valid_to: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  applies_to_room_ids: string[] | null;
  created_at: string;
}

export default async function CouponsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: coupons }, { data: usage }] = await Promise.all([
    supabase.from('coupons').select('*').order('is_active', { ascending: false }).order('created_at', { ascending: false }),
    // Aggregate discount amount per code — one query, join client-side.
    supabase.from('bookings').select('coupon_code, discount_amount').not('coupon_code', 'is', null),
  ]);

  const discountByCode = new Map<string, number>();
  for (const b of usage || []) {
    if (b.coupon_code) discountByCode.set(b.coupon_code, (discountByCode.get(b.coupon_code) ?? 0) + Number(b.discount_amount || 0));
  }

  const rows = (coupons ?? []) as CouponRow[];

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Coupons</h1>
          <p className="font-montserrat text-sm text-gray-500 mt-1">
            Create discount codes guests can apply on the booking form. Discount is applied to the room total (nights × price).
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="btn-red py-2.5 px-5 text-xs flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={14} /> New coupon
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center">
          <Ticket size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-montserrat text-gray-500 text-sm">
            No coupons yet. Click <strong>New coupon</strong> to create the first one.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm font-montserrat">
              <thead className="bg-[#1A0B2E]/[0.02] text-[10px] uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Discount</th>
                  <th className="text-left px-4 py-3">Window</th>
                  <th className="text-left px-4 py-3">Usage</th>
                  <th className="text-left px-4 py-3">Total given</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const totalGiven = discountByCode.get(c.code) ?? 0;
                  const discountLabel = c.discount_type === 'percent' ? `${c.discount_value}%` : `PKR ${c.discount_value}`;
                  const window = [c.valid_from, c.valid_to].filter(Boolean).join(' → ') || 'Always';
                  const usage = c.usage_limit === null ? `${c.times_used} · unlimited` : `${c.times_used} / ${c.usage_limit}`;
                  return (
                    <tr key={c.code} className={`border-t border-gray-100 ${!c.is_active ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold text-[#1A0B2E]">{c.code}</p>
                        <p className="text-[11px] text-gray-500">{c.name}</p>
                      </td>
                      <td className="px-4 py-3 text-[#1A0B2E] font-semibold">{discountLabel}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{window}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{usage}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatCurrency(totalGiven)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider ${
                          c.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {c.is_active ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <CouponRowActions code={c.code} isActive={c.is_active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {rows.map((c) => {
              const totalGiven = discountByCode.get(c.code) ?? 0;
              const discountLabel = c.discount_type === 'percent' ? `${c.discount_value}%` : `PKR ${c.discount_value}`;
              return (
                <div key={c.code} className={`bg-white border border-gray-100 p-4 ${!c.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div>
                      <p className="font-mono font-semibold text-[#1A0B2E]">{c.code}</p>
                      <p className="text-xs text-gray-500 font-montserrat">{c.name}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider shrink-0 ${
                      c.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {c.is_active ? 'active' : 'inactive'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-montserrat mb-3">
                    <div><span className="text-gray-400">Discount</span><br /><strong>{discountLabel}</strong></div>
                    <div><span className="text-gray-400">Used</span><br /><strong>{c.times_used}{c.usage_limit ? `/${c.usage_limit}` : ''}</strong></div>
                    <div><span className="text-gray-400">Given</span><br /><strong>{formatCurrency(totalGiven)}</strong></div>
                  </div>
                  <CouponRowActions code={c.code} isActive={c.is_active} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
