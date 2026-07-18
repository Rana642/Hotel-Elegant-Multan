import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import GalleryRing from './GalleryRing';

export const metadata: Metadata = {
  title: { absolute: 'Photo Gallery — Hotel Elegant Multan' },
  description:
    'View photos of Hotel Elegant Multan — rooms, suites, lobby, dining and exterior. Executive, Family & Presidential suites.',
};

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  let images: any[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('gallery_images')
      .select('id, url, alt, category, sort_order')
      .eq('is_active', true)
      .order('category')
      .order('sort_order');
    images = data || [];
  } catch {
    images = [];
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-[#1A0B2E] pt-32 pb-16">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Hotel Elegant Executive Suites Multan
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Photo Gallery — Hotel Rooms &amp; Suites in Multan
          </h1>
          <p className="font-montserrat text-white/80 text-base max-w-xl mx-auto">
            Explore our executive suites, common areas and dining — as seen by our guests.
          </p>
        </div>
      </section>

      <section className="pt-10 md:pt-24 pb-16 md:pb-24 bg-white overflow-hidden">
        <div className="container-xl">
          <div className="text-center mb-3 md:mb-10">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
              Our Spaces, As They Really Are
            </p>
            <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E] mb-4">
              Take a Spin Through Hotel Elegant
            </h2>
            <p className="font-montserrat text-gray-500 text-sm md:text-base max-w-xl mx-auto">
              Every photo below is really us — our suites, dining and lounges in Gulgasht, Multan.
              Drag the ring to spin it, click any photo to bring it forward, then click again to
              view it full-screen.
            </p>
          </div>
          <GalleryRing images={images} />
        </div>
      </section>
    </>
  );
}
