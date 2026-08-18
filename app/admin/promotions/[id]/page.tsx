import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import PromotionForm from '../PromotionForm';

export const metadata: Metadata = { title: 'Edit promotion' };
export const revalidate = 0;

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: promotion } = await supabase.from('promotions').select('*').eq('id', id).maybeSingle();
  if (!promotion) notFound();

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/promotions" className="text-gray-400 hover:text-[#E30613] text-sm font-montserrat">
          <ArrowLeft className="inline" size={14} /> Promotions
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-montserrat font-semibold text-sm text-[#1A0B2E]">{promotion.title}</span>
      </div>
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-6">Edit promotion</h1>
      <PromotionForm initial={promotion} isEdit />
    </div>
  );
}
