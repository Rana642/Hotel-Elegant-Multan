import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import PromotionForm from '../PromotionForm';

export const metadata: Metadata = { title: 'New promotion' };

export default async function NewPromotionPage() {
  await requireAdmin();

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/promotions" className="text-gray-400 hover:text-[#E30613] text-sm font-montserrat">
          <ArrowLeft className="inline" size={14} /> Promotions
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-montserrat font-semibold text-sm text-[#1A0B2E]">New</span>
      </div>
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-6">Create promotion</h1>
      <PromotionForm />
    </div>
  );
}
