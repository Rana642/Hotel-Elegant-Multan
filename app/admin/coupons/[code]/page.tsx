import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import CouponForm from '../CouponForm';

export const metadata: Metadata = { title: 'Edit coupon' };
export const revalidate = 0;

export default async function EditCouponPage({ params }: { params: Promise<{ code: string }> }) {
  await requireAdmin();
  const { code } = await params;
  const supabase = await createClient();

  const [{ data: coupon }, { data: rooms }] = await Promise.all([
    supabase.from('coupons').select('*').eq('code', decodeURIComponent(code)).maybeSingle(),
    supabase.from('rooms').select('id, name').eq('is_active', true).order('sort_order'),
  ]);

  if (!coupon) notFound();

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/coupons" className="text-gray-400 hover:text-[#E30613] text-sm font-montserrat">
          <ArrowLeft className="inline" size={14} /> Coupons
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-mono font-semibold text-sm text-[#1A0B2E]">{coupon.code}</span>
      </div>
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-6">Edit coupon</h1>
      <CouponForm rooms={rooms || []} initial={coupon} isEdit />
    </div>
  );
}
