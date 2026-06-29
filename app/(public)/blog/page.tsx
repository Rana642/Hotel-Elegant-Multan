import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — Travel Tips & Hotel News | Hotel Elegant Multan',
  description:
    'Hotel Elegant Multan blog — travel tips for Multan, hotel news, local attractions and more.',
};

export default function BlogPage() {
  return (
    <>
      <section className="bg-[#1A0B2E] pt-32 pb-16">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Insights & Tips
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Blog
          </h1>
          <p className="font-montserrat text-[#C9BFE0] text-base max-w-xl mx-auto">
            Travel tips, local guides and news from Hotel Elegant Executive Suites Multan.
          </p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-xl text-center max-w-lg">
          <p className="font-montserrat text-gray-400 text-sm mb-6">
            Articles coming soon. In the meantime, explore our rooms or book your stay.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/rooms" className="btn-red py-3 px-8">View Rooms</Link>
            <Link href="/booking" className="border-2 border-[#1A0B2E] text-[#1A0B2E] font-montserrat font-semibold text-sm px-8 py-3 hover:bg-[#1A0B2E] hover:text-white transition-colors tracking-wider uppercase">
              Book Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
