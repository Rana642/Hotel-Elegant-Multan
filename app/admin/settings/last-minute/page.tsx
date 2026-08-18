import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLastMinuteConfig } from '@/lib/lastMinuteConfig';
import LastMinuteForm from './LastMinuteForm';

export const metadata: Metadata = { title: 'Last-Minute Campaign' };
export const revalidate = 0;

export default async function LastMinuteSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [config, { data: rooms }] = await Promise.all([
    getLastMinuteConfig(),
    supabase.from('rooms').select('id, name').eq('is_active', true).order('sort_order'),
  ]);

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/settings" className="text-gray-400 hover:text-[#E30613] text-sm font-montserrat">
          <ArrowLeft className="inline" size={14} /> Settings
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Last-Minute Campaign</span>
      </div>
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-2">Last-Minute Campaign</h1>
      <p className="font-montserrat text-sm text-gray-500 mb-8 max-w-2xl">
        Auto-discount for near check-ins during a daily time window. When active it overrides normal pricing on eligible rooms, blocks coupons, and switches the booking to an advance-payment, non-refundable rate. All times are Pakistan time (PKT).
      </p>
      <LastMinuteForm initial={config} rooms={rooms || []} />
    </div>
  );
}
