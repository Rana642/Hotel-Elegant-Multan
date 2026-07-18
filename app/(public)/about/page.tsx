import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Award, Clock, Star } from 'lucide-react';
import { getContentStatic } from '@/lib/content';

export const metadata: Metadata = {
  title: { absolute: 'About Us — New Hotel in Gulgasht, Multan' },
  alternates: { canonical: '/about' },
  description:
    'Hotel Elegant Executive Suites — a new hotel in Gulgasht, Multan, opened 2024. 4.4★ Google, 238 reviews, 7 km from the airport. Our story and what sets us apart.',
  openGraph: {
    title: 'About Hotel Elegant — Multan\'s Executive Boutique Hotel',
    images: [{ url: '/Hotel Front.jpg', width: 1024, height: 768, alt: 'Hotel Elegant Executive Suites Multan building' }],
  },
};

const differentiators = [
  {
    icon: MapPin,
    title: 'Prime Location',
    desc: 'In Gulgasht Colony — Multan\'s executive hub, just 7 km from Multan International Airport and close to all major business and cultural destinations.',
  },
  {
    icon: Award,
    title: 'Soundproof Suites',
    desc: 'Every room is fitted with soundproofing, premium bedding, and verified AC — not just promised in marketing, but consistently praised in 238 guest reviews.',
  },
  {
    icon: Star,
    title: 'Warm Service',
    desc: '4.4★ on Google from 200+ reviews. Our staff is consistently praised for their helpfulness, warmth and responsiveness — a genuine boutique experience.',
  },
  {
    icon: Clock,
    title: '24/7 Convenience',
    desc: 'Check in at any time of day or night. Our reception team is available round the clock. Late arrivals and early departures are always accommodated.',
  },
];

export const revalidate = 60;

export default async function AboutPage() {
  const content = await getContentStatic().catch(() => ({} as Record<string, string>));
  const aboutStory =
    content.about_story ||
    "Hotel Elegant Executive Suites opened in 2024 in the heart of Gulgasht Colony, Multan — bringing a new standard of executive hospitality to one of Pakistan's most vibrant cities. Our boutique property combines warm Pakistani service with modern comfort, making it the preferred address for business travellers, families, and visiting delegations alike.";

  return (
    <>
      {/* Hero */}
      <section className="bg-[#1A0B2E] pt-32 pb-20">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Our Story
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            About Hotel Elegant — A New Hotel in Gulgasht, Multan
          </h1>
          <p className="font-montserrat text-white/80 text-base max-w-xl mx-auto">
            A boutique executive hotel built for discerning travellers — opened 2024, Gulgasht Colony.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="section-pad bg-white">
        <div className="container-xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
                Since 2024
              </p>
              <h2 className="font-playfair font-semibold text-3xl text-[#1A0B2E] mb-5">Our Story</h2>
              <p className="font-montserrat text-gray-500 text-sm leading-relaxed">{aboutStory}</p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/Hotel Front.jpg"
                alt="Hotel Elegant Executive Suites Multan exterior"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-[#1A0B2E] py-16">
        <div className="container-xl text-center">
          <div className="text-6xl mb-6">👑</div>
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-4">
            Our Mission
          </p>
          <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-white mb-4">
            Stay in Comfort. Live in Elegance.
          </h2>
          <p className="font-montserrat text-white/80 text-base max-w-2xl mx-auto leading-relaxed">
            We believe every guest deserves a hotel experience that is genuinely welcoming,
            consistently clean, and transparently priced — with a real person available 24/7
            to ensure your stay is exactly as promised.
          </p>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="section-pad bg-[#1A0B2E]/[0.03]">
        <div className="container-xl">
          <div className="text-center mb-12">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
              Our Promise
            </p>
            <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E]">
              What Makes Us Different
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {differentiators.map((d) => (
              <div key={d.title} className="text-center p-6 bg-white border border-gray-100 hover:shadow-md transition-shadow">
                <d.icon size={32} className="text-[#E30613] mx-auto mb-4" />
                <h3 className="font-playfair font-semibold text-lg text-[#1A0B2E] mb-3">{d.title}</h3>
                <p className="font-montserrat text-sm text-gray-500 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section-pad bg-white border-b border-gray-100">
        <div className="container-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '4.4★', label: 'Google Rating' },
              { value: '238+', label: 'Guest Reviews' },
              { value: '8.0', label: 'Booking.com Score' },
              { value: '5', label: 'Room Types' },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-playfair font-semibold text-4xl text-[#1A0B2E] mb-2">{s.value}</p>
                <p className="font-montserrat text-sm text-gray-500 tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A0B2E] py-16">
        <div className="container-xl text-center">
          <h2 className="font-playfair font-semibold text-3xl text-white mb-6">
            Experience Hotel Elegant
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/booking" className="btn-red py-3 px-10">Book Now</Link>
            <Link href="/contact" className="btn-outline-white py-3 px-10">Contact Us</Link>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Hotel Elegant Executive Suites',
            foundingDate: '2024',
            address: {
              '@type': 'PostalAddress',
              streetAddress: '77-A Gulgasht Colony',
              addressLocality: 'Multan',
              addressRegion: 'Punjab',
              postalCode: '60750',
              addressCountry: 'PK',
            },
            sameAs: [
              'https://www.facebook.com/ElegantSuitesMultan',
              'https://www.instagram.com/elegantsuitesmultan',
              'https://www.linkedin.com/company/101358499/',
            ],
          }),
        }}
      />
    </>
  );
}
