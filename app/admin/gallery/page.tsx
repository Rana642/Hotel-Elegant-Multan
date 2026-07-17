import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import GalleryManager from './GalleryManager';

export const metadata: Metadata = { title: 'Gallery Management' };
export const revalidate = 0;

export default async function AdminGalleryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('gallery_images')
    .select('id, url, alt, category, sort_order, is_active')
    .order('category')
    .order('sort_order');

  return (
    <div className="p-6 lg:p-10 mt-12 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-2">Gallery</h1>
      <p className="font-montserrat text-sm text-gray-500 mb-8">
        Add or remove photos shown on the public Gallery page. Changes appear instantly.
      </p>
      <GalleryManager initialImages={data || []} />
    </div>
  );
}
