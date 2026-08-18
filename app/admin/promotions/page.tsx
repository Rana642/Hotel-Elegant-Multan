import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getAllPromotions } from '@/lib/promotions';
import { Plus, Megaphone } from 'lucide-react';
import PromotionRowActions from './PromotionRowActions';

export const metadata: Metadata = { title: 'Promotions' };
export const revalidate = 0;

export default async function PromotionsAdminPage() {
  await requireAdmin();
  const promos = await getAllPromotions();

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Promotions</h1>
          <p className="font-montserrat text-sm text-gray-500 mt-1">
            Marketing offers shown on the public Promotions page and the on-site promo popup. Edit freely — these are display-only (no discount code attached).
          </p>
        </div>
        <Link href="/admin/promotions/new" className="btn-red py-2.5 px-5 text-xs flex items-center gap-2 whitespace-nowrap">
          <Plus size={14} /> New promotion
        </Link>
      </div>

      {promos.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center">
          <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-montserrat text-gray-500 text-sm">
            No promotions yet. Click <strong>New promotion</strong> to create the first one.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm font-montserrat">
              <thead className="bg-[#1A0B2E]/[0.02] text-[10px] uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Order</th>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Badge</th>
                  <th className="text-left px-4 py-3">Button</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} className={`border-t border-gray-100 ${!p.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-gray-500">{p.sort_order}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#1A0B2E]">{p.title}</p>
                      {p.tagline && <p className="text-[11px] text-gray-500">{p.tagline}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.badge || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.cta_label} → {p.cta_href}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider ${p.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {p.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PromotionRowActions id={p.id} isActive={p.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {promos.map((p) => (
              <div key={p.id} className={`bg-white border border-gray-100 p-4 ${!p.is_active ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-[#1A0B2E]">{p.title}</p>
                    {p.tagline && <p className="text-xs text-gray-500 font-montserrat">{p.tagline}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 border rounded uppercase tracking-wider shrink-0 ${p.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {p.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-montserrat mb-3">
                  <div><span className="text-gray-400">Order</span><br /><strong>{p.sort_order}</strong></div>
                  <div><span className="text-gray-400">Badge</span><br /><strong>{p.badge || '—'}</strong></div>
                </div>
                <PromotionRowActions id={p.id} isActive={p.is_active} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
