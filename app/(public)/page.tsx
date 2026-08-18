import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, ParkingCircle, Wifi, Clock, ChevronDown, ArrowRight } from 'lucide-react';
import BookingSearchBar from '@/components/BookingSearchBar';
import RoomCard from '@/components/RoomCard';
import { getRoomsStatic } from '@/lib/rooms';
import { getContentStatic } from '@/lib/content';
import { Testimonial, Stat } from '@/types';
import { NEARBY_PLACES } from '@/lib/roomContent';
import { blogPosts } from '@/lib/blogPosts';
import TrackedLink from '@/components/TrackedLink';
import TrackedNavLink from '@/components/TrackedNavLink';
import ContactIntentButton from '@/app/_components/ContactIntentButton';
import HomeAnimations from './HomeAnimations';
import HeroMedia from './HeroMedia';

export const metadata: Metadata = {
  title: { absolute: 'Hotels in Multan | Hotel Elegant Executive Suites' },
  alternates: { canonical: '/' },
  description:
    'Hotel Elegant Executive Suites — Multan\'s top-rated 3-star boutique hotel in Gulgasht Colony. 4.6★ Google, 8.3 Booking.com. Executive, Family & Presidential suites. Book direct for the best rate. No payment now.',
  openGraph: {
    title: 'Hotel Elegant Executive Suites — Best Hotel in Multan',
    description: 'Stay in Comfort. Live in Elegance. Book Multan\'s top-rated executive hotel directly.',
    // NOTE: page-level openGraph fully replaces the layout default, so images
    // must be re-declared here (Next.js does not deep-merge nested metadata)
    images: [{ url: '/hero-poster.jpg', width: 1280, height: 720, alt: 'Hotel Elegant Executive Suites Multan' }],
  },
};

const trustItems = [
  { icon: Star, text: '4.6★ Google (432 reviews)' },
  { icon: Star, text: '8.3 Booking.com' },
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
  'Praised for cleanliness in 432 reviews · 4.6★ on Google',
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

// ISR: render once, serve cached for 60s (admin edits reflect within a minute).
// Cookie-free data fetchers keep this page statically cacheable — with the
// cookie-bound client every visitor paid ~400ms of per-request DB queries.
export const revalidate = 60;

export default async function HomePage() {
  const [rooms, content] = await Promise.all([
    getRoomsStatic().catch(() => [] as Awaited<ReturnType<typeof getRoomsStatic>>),
    getContentStatic().catch(() => ({} as Awaited<ReturnType<typeof getContentStatic>>)),
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
    "Stay in Comfort. Live in Elegance. — From PKR 6,840/night · No payment now";

  return (
    <>
      {/* ── 1. HERO ── */}
      {/* Clear video (no dark overlay) — only the search box sits on it. The
          marketing headline moved to its own band below the trust strip so
          the video reads cleanly. A soft bottom scrim gives the white search
          fields contrast on bright video frames without dimming the whole
          frame. */}
      <section className="relative h-[56vh] min-h-[360px] md:h-[75vh] md:min-h-[580px] max-h-[680px] flex items-end justify-center overflow-hidden">
        {/* Background */}
        <HeroMedia
          videoSrc={heroVideoUrl}
          poster={heroPoster}
          alt="Hotel Elegant Executive Suites Multan"
        />
        {/* Localized bottom scrim — only behind the desktop search box, not a
            full overlay. Hidden on mobile where the search box moves below the
            video so the video stays clear. */}
        <div className="hidden md:block absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />

        {/* Desktop: search box over the video */}
        <div className="hidden md:block relative z-10 w-full max-w-5xl mx-auto px-4 pb-20">
          <BookingSearchBar className="max-w-3xl mx-auto" />
          <p className="font-montserrat text-white/70 text-xs mt-3 text-center drop-shadow">
            No payment now — we confirm on WhatsApp
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 animate-bounce">
          <ChevronDown size={24} />
        </div>
      </section>

      {/* ── 1b. MOBILE SEARCH BAND ── */}
      {/* On phones the search box sits below the clear video (not on top of it)
          so the hero video is fully visible. Dark band keeps the white search
          fields + links readable. Desktop uses the in-hero search above. */}
      <section className="md:hidden bg-[#1A0B2E] px-4 py-6">
        <BookingSearchBar className="max-w-lg mx-auto" />
        <p className="font-montserrat text-white/70 text-xs mt-3 text-center">
          No payment now — we confirm on WhatsApp
        </p>
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

      {/* ── 2b. HERO HEADLINE BAND ── */}
      {/* The hero's marketing copy lives here now (below the trust strip) so
          the video above stays clean. Same content values as before. */}
      <section className="bg-white py-12 md:py-16 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="font-montserrat text-[#E30613] font-semibold text-xs tracking-widest uppercase mb-3">
            Gulgasht Colony · Multan, Pakistan
          </p>
          <h1 className="font-playfair font-semibold text-3xl sm:text-4xl md:text-5xl text-[#1A0B2E] leading-tight mb-3 text-balance">
            {heroHeading}
          </h1>
          <p className="font-montserrat text-gray-500 text-base md:text-lg max-w-xl mx-auto">
            {heroSub}
          </p>
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
              4.6★ on Google from 432 verified reviews
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
              Also available on Booking.com (8.3/10)
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

      {/* ── 8b. LOCATION & MAP ── */}
      <section className="section-pad bg-white">
        <div className="container-xl">
          <div className="text-center mb-12">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
              Location
            </p>
            <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E] mb-3">
              Perfectly Placed in Gulgasht, Multan
            </h2>
            <p className="font-montserrat text-sm text-gray-500 max-w-2xl mx-auto">
              On a main road with food courts and shopping nearby, ~7 km from Multan International
              Airport — rated <span className="font-semibold text-[#1A0B2E]">9.0/10 for location</span> by guests.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-stretch min-w-0">
            {/* Nearby list. min-w-0 on the grid + each cell so long distance
                labels ("Walking distance", "Under 1 km") can't blow the
                card past a 320px viewport. Distance text drops one size on
                mobile to give the name column more room before truncating. */}
            <div className="grid sm:grid-cols-2 gap-3 content-start min-w-0">
              {NEARBY_PLACES.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-2 p-3 border border-gray-100 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MapPin size={15} className="text-[#E30613] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-montserrat text-sm text-[#1A0B2E] font-medium truncate">{p.name}</p>
                      <p className="font-montserrat text-xs text-gray-400 truncate">{p.type}</p>
                    </div>
                  </div>
                  <span className="font-montserrat text-xs sm:text-sm font-semibold text-[#1A0B2E] text-right shrink-0">{p.distance}</span>
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="overflow-hidden border border-gray-100 min-h-[320px] lg:min-h-0">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3447.68288744653!2d71.4682164119909!3d30.217597010239494!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x393b331f4190289f%3A0xcf0b199665e27a0e!2sHotel%20Elegant%20Executive%20Suites%20Multan!5e0!3m2!1sen!2s!4v1780433086298!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 320 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Hotel Elegant Executive Suites Multan location map"
              />
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Hotel+Elegant+Executive+Suites+Multan"
              target="_blank"
              rel="noopener noreferrer"
              className="font-montserrat font-semibold text-sm text-[#E30613] hover:underline inline-flex items-center gap-1.5"
            >
              Get Directions <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

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

      {/* ── 9b. FROM THE BLOG ── */}
      <section className="section-pad bg-white">
        <div className="container-xl max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
            <div>
              <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
                Travel Guides
              </p>
              <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E]">
                From the Blog
              </h2>
            </div>
            <Link href="/blog" className="font-montserrat font-semibold text-sm text-[#E30613] hover:underline tracking-wide">
              View All Articles →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.slice(0, 3).map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group border border-gray-100 hover:shadow-lg transition-all duration-300"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 340px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-0 bg-[#E30613] text-white text-[10px] font-montserrat font-semibold tracking-widest uppercase px-3 py-1">
                    {post.category}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-playfair font-semibold text-lg text-[#1A0B2E] group-hover:text-[#E30613] transition-colors leading-snug mb-2">
                    {post.title}
                  </h3>
                  <p className="font-montserrat text-sm text-gray-500 leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
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
            <TrackedNavLink
              href="/booking"
              event="book_now_click"
              eventParams={{ location: 'home_final_cta' }}
              className="btn-red py-4 px-10"
            >
              Check Availability
            </TrackedNavLink>
            <ContactIntentButton
              channel="call"
              ariaLabel="Call the hotel"
              className="btn-outline-white py-4 px-10"
            >
              Call 0317-333-0998
            </ContactIntentButton>
            <ContactIntentButton
              channel="whatsapp"
              ariaLabel="WhatsApp the hotel"
              className="btn-whatsapp py-4 px-10"
            >
              WhatsApp Us
            </ContactIntentButton>
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
              "Multan's top-rated 3-star boutique executive hotel in Gulgasht Colony. Business, family and presidential suites.",
            // Star classification signal. Google's Hotel property picker
            // primarily reads ratings from OTA feeds (Booking.com, Agoda,
            // Expedia), but a matching starRating in on-page structured
            // data helps confirm the hotelier's own claim when the crawler
            // does an integrity check. We're a 3-star property.
            starRating: {
              '@type': 'Rating',
              ratingValue: '3',
              bestRating: '5',
            },
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
            image: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com'}/hero-poster.jpg`,
            checkinTime: 'T00:00',
            checkoutTime: 'T12:00',
            priceRange: '$$',
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: '+923173330998',
              contactType: 'reservations',
              availableLanguage: ['English', 'Urdu'],
              areaServed: 'PK',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.6',
              reviewCount: '432',
              bestRating: '5',
            },
            review: testimonials.slice(0, 3).map((t) => ({
              '@type': 'Review',
              author: { '@type': 'Person', name: t.name },
              reviewRating: { '@type': 'Rating', ratingValue: String(t.rating), bestRating: '5' },
              reviewBody: t.text,
            })),
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
