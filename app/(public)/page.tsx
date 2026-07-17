import type { Metadata } from 'next';
import Link from 'next/link';
import { Star, MapPin, ParkingCircle, Wifi, Clock, ChevronDown } from 'lucide-react';
import BookingSearchBar from '@/components/BookingSearchBar';
import RoomCard from '@/components/RoomCard';
import { getRooms } from '@/lib/rooms';
import { getContent } from '@/lib/content';
import { Testimonial, Stat } from '@/types';
import HomeAnimations from './HomeAnimations';
import HeroMedia from './HeroMedia';

export const metadata: Metadata = {
  title: { absolute: 'Hotels in Multan | Hotel Elegant Executive Suites' },
  description:
    'Hotel Elegant Executive Suites — Multan\'s top-rated boutique hotel in Gulgasht Colony. 4.4★ Google, 8.0 Booking.com. Executive, Family & Presidential suites. Book direct for the best rate. No payment now.',
  openGraph: {
    title: 'Hotel Elegant Executive Suites — Best Hotel in Multan',
    description: 'Stay in Comfort. Live in Elegance. Book Multan\'s top-rated executive hotel directly.',
  },
};

const trustItems = [
  { icon: Star, text: '4.4★ Google (238 reviews)' },
  { icon: Star, text: '8.0 Booking.com' },
  { icon: MapPin, text: '7km from Airport' },
  { icon: ParkingCircle, text: 'Free Parking' },
  { icon: Wifi, text: 'Free WiFi' },
  { icon: Clock, text: '24/7 Reception' },
];

const whyDirect = [
  {
    title: 'Best Direct Rate',
    desc: 'No platform fees or markup. You pay less booking directly than any OTA.',
    icon: '💰',
  },
  {
    title: 'Instant WhatsApp Confirmation',
    desc: 'A real person confirms your room via WhatsApp — usually within minutes.',
    icon: '✅',
  },
  {
    title: 'Fully Flexible',
    desc: 'Need to change? Call or WhatsApp us anytime. No rigid online policies.',
    icon: '🤝',
  },
];

const comparisonLeft = [
  'Room not found on arrival — re-booked at higher rate',
  'Bill higher than online rate + surprise charges',
  'Advertised amenities missing or sub-standard',
  'Cleanliness & hot-water complaints common',
  'Slow support through third-party channels',
];

const comparisonRight = [
  'A real person confirms your room on WhatsApp before you arrive',
  'Best direct rate — clear, transparent pricing, no hidden fees',
  'Verified AC, soundproofing & ensuite in every room — no surprises',
  'Praised for cleanliness in 238 reviews · 4.4★ on Google',
  '24/7 reception — call or WhatsApp anytime, instant response',
];

const faqs = [
  {
    q: 'Do I need to pay in advance to book?',
    a: 'No — we require no advance payment whatsoever. You submit your booking request online, we confirm via WhatsApp or call, and you pay at check-out (Visa, Mastercard, or Cash).',
  },
  {
    q: 'What are the check-in and check-out times?',
    a: 'Check-in is available 24 hours a day — you can arrive at any time. Check-out is by 12:00 noon.',
  },
  {
    q: 'Is parking and WiFi free?',
    a: 'Yes, we offer free private parking and free high-speed WiFi in all areas of the hotel.',
  },
  {
    q: 'Can children stay? What about extra beds?',
    a: 'Children aged 10 years and above are welcome. An extra bed is available for PKR 2,500 per person per night. No cots or cribs are available.',
  },
  {
    q: 'Do you offer long stays or corporate rates?',
    a: 'Absolutely. We accommodate stays from 1 to 90 nights. Corporate and monthly packages are welcome — contact us on WhatsApp or call for a custom quote.',
  },
];

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [rooms, content] = await Promise.all([
    getRooms().catch(() => [] as Awaited<ReturnType<typeof getRooms>>),
    getContent().catch(() => ({} as Awaited<ReturnType<typeof getContent>>)),
  ]);
  const featuredRooms = rooms.slice(0, 3);

  const testimonials: Testimonial[] = (() => {
    try {
      return JSON.parse(content.testimonials_json || '[]');
    } catch {
      return [];
    }
  })();

  const stats: Stat[] = (() => {
    try {
      return JSON.parse(content.stats_json || '[]');
    } catch {
      return [];
    }
  })();

  const heroVideoUrl = content.hero_video_url || '';
  const heroPoster =
    content.hero_poster_url ||
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=80';
  const heroHeading = content.hero_heading || "Book Multan's Top-Rated Executive Hotel";
  const heroSub =
    content.hero_subheading ||
    "Stay in Comfort. Live in Elegance. — From PKR 7,500/night · No payment now";

  return (
    <>
      {/* ── 1. HERO ── */}
      <section className="relative h-[75vh] min-h-[580px] max-h-[680px] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <HeroMedia
          videoSrc={heroVideoUrl}
          poster={heroPoster}
          alt="Hotel Elegant Executive Suites Multan"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#1A0B2E]/55" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 w-full max-w-5xl mx-auto">
          <p className="font-montserrat text-[#E30613] font-semibold text-xs tracking-widest uppercase mb-3">
            Gulgasht Colony · Multan, Pakistan
          </p>
          <h1 className="font-playfair font-semibold text-4xl sm:text-5xl md:text-6xl text-white leading-tight mb-3 text-balance">
            {heroHeading}
          </h1>
          <p className="font-montserrat text-white/80 text-base md:text-lg mb-6 max-w-xl mx-auto">
            {heroSub}
          </p>
          <BookingSearchBar className="max-w-3xl mx-auto" />
          <p className="font-montserrat text-white/50 text-xs mt-3">
            No payment now — we confirm on WhatsApp
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 animate-bounce">
          <ChevronDown size={24} />
        </div>
      </section>

      {/* ── 2. TRUST STRIP ── */}
      <section className="bg-[#1A0B2E]/5 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {trustItems.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon size={14} className="text-[#E30613]" />
                <span className="font-montserrat text-xs font-semibold text-[#1A0B2E] tracking-wide">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. WHY BOOK DIRECT ── */}
      <section className="section-pad bg-white">
        <div className="container-xl">
          <div className="text-center mb-12">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
              Direct Booking Benefits
            </p>
            <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E]">
              Why Book Direct With Us?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyDirect.map((item) => (
              <div
                key={item.title}
                className="text-center p-8 border border-gray-100 hover:border-[#E30613]/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-4xl mb-5">{item.icon}</div>
                <h3 className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-3">
                  {item.title}
                </h3>
                <p className="font-montserrat text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FEATURED ROOMS ── */}
      <section className="section-pad bg-[#1A0B2E]/[0.03]">
        <div className="container-xl">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4">
            <div>
              <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
                Accommodations
              </p>
              <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E]">
                Rooms &amp; Suites
              </h2>
            </div>
            <Link
              href="/rooms"
              className="font-montserrat font-semibold text-sm text-[#E30613] hover:underline tracking-wide"
            >
              View All 5 Rooms →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. COMPARISON BAND ── */}
      <section className="section-pad bg-white">
        <div className="container-xl">
          <div className="text-center mb-12">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
              The Difference
            </p>
            <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E]">
              Why Direct Booking Is Better
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Problems */}
            <div className="bg-red-50 border border-red-100 p-8">
              <h3 className="font-playfair font-semibold text-xl text-red-800 mb-6">
                Commonly Reported Problems
                <span className="block font-montserrat text-xs font-normal text-red-500 mt-1 tracking-wide">
                  (General hotel booking experiences)
                </span>
              </h3>
              <ul className="space-y-3">
                {comparisonLeft.map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                    <span className="font-montserrat text-sm text-red-800 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hotel Elegant Way */}
            <div className="bg-green-50 border border-green-100 p-8">
              <h3 className="font-playfair font-semibold text-xl text-green-800 mb-6">
                The Hotel Elegant Way
                <span className="block font-montserrat text-xs font-normal text-green-600 mt-1 tracking-wide">
                  Direct booking guarantee
                </span>
              </h3>
              <ul className="space-y-3">
                {comparisonRight.map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    <span className="font-montserrat text-sm text-green-800 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. TESTIMONIALS ── */}
      <section className="section-pad bg-[#1A0B2E]/[0.03]">
        <div className="container-xl">
          <div className="text-center mb-12">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
              Guest Reviews
            </p>
            <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E] mb-2">
              What Our Guests Say
            </h2>
            <p className="font-montserrat text-sm text-gray-500">
              4.4★ on Google from 238 verified reviews
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white p-8 border border-gray-100 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="font-montserrat text-sm text-gray-600 leading-relaxed mb-5 italic">
                  "{t.text}"
                </p>
                <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">— {t.name}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <a
              href="https://www.booking.com/hotel/pk/elegant-exective-suite.es.html"
              target="_blank"
              rel="noopener noreferrer"
              className="font-montserrat text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Also available on Booking.com (8.0/10)
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. DINING TEASER ── */}
      <section className="bg-[#1A0B2E] py-12">
        <div className="container-xl">
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="text-5xl">🍽️</div>
            <div>
              <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-2">
                Dining
              </p>
              <h2 className="font-playfair font-semibold text-2xl md:text-3xl text-white mb-2">
                {content.dining_heading || 'Multi-Cuisine Buffet'}
              </h2>
              <p className="font-montserrat text-white/80 text-sm leading-relaxed max-w-lg">
                {content.dining_text ||
                  'Start your day with a complimentary breakfast buffet featuring local and continental favourites.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. STATS (from DB) ── */}
      {stats.length > 0 && (
        <section className="section-pad bg-white border-b border-gray-100">
          <div className="container-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-playfair font-semibold text-4xl text-[#1A0B2E] mb-2">
                    {s.value}
                  </p>
                  <p className="font-montserrat text-sm text-gray-500 tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 9. FAQ ── */}
      <section className="section-pad bg-[#1A0B2E]/[0.03]">
        <div className="container-xl max-w-3xl">
          <div className="text-center mb-12">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
              FAQs
            </p>
            <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E]">
              Frequently Asked Questions
            </h2>
          </div>
          <HomeAnimations faqs={faqs} />
        </div>
      </section>

      {/* ── 10. FINAL CTA ── */}
      <section className="bg-[#1A0B2E] py-20">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-4">
            Reserve Your Stay
          </p>
          <h2 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Your Room Is Waiting
          </h2>
          <p className="font-montserrat text-white/80 text-base mb-10 max-w-lg mx-auto">
            No payment required — book your request and we'll confirm on WhatsApp.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/booking" className="btn-red py-4 px-10">
              Check Availability
            </Link>
            <a href="tel:+923173330998" className="btn-outline-white py-4 px-10">
              Call 0317-333-0998
            </a>
            <a
              href="https://wa.me/923173330998"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp py-4 px-10"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Hotel',
            name: 'Hotel Elegant Executive Suites',
            description:
              "Multan's top-rated boutique executive hotel in Gulgasht Colony. Business, family and presidential suites.",
            address: {
              '@type': 'PostalAddress',
              streetAddress: '77-A Gulgasht Colony',
              addressLocality: 'Multan',
              addressRegion: 'Punjab',
              postalCode: '60750',
              addressCountry: 'PK',
            },
            geo: { '@type': 'GeoCoordinates', latitude: 30.217602524341853, longitude: 71.47079466355855 },
            telephone: '+923173330998',
            email: 'info@elegant-suite.com',
            url: process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com',
            checkinTime: 'T00:00',
            checkoutTime: 'T12:00',
            priceRange: '$$',
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.4',
              reviewCount: '238',
              bestRating: '5',
            },
            amenityFeature: [
              { '@type': 'LocationFeatureSpecification', name: 'Free WiFi', value: true },
              { '@type': 'LocationFeatureSpecification', name: 'Free Parking', value: true },
              { '@type': 'LocationFeatureSpecification', name: 'Air Conditioning', value: true },
              { '@type': 'LocationFeatureSpecification', name: '24-Hour Front Desk', value: true },
            ],
            sameAs: [
              'https://www.facebook.com/ElegantSuitesMultan',
              'https://www.instagram.com/elegantsuitesmultan',
              'https://www.linkedin.com/company/101358499/',
              'https://www.youtube.com/@ElegantSuitesMultan/',
              'https://www.tiktok.com/@ElegantSuitesMultan',
            ],
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}
