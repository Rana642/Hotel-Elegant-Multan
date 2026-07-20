import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ContentEditor from './ContentEditor';

export const metadata: Metadata = { title: 'Content Management' };
export const revalidate = 0;

export default async function ContentPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('content').select('key, value');
  const contentMap: Record<string, string> = {};
  (data || []).forEach((row: any) => { if (row.value) contentMap[row.key] = row.value; });

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-2">Site Content</h1>
      <p className="font-montserrat text-sm text-gray-500 mb-8">Edit website content without touching code.</p>
      <ContentEditor content={contentMap} />
    </div>
  );
}
