import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  MapPin,
  Phone,
  MessageCircle,
  ArrowRight,
  ParkingCircle,
  Wifi,
  Clock,
  BadgeCheck,
} from 'lucide-react';
import {
  LpVariant,
  LP_ALL_ROOMS,
  LP_ROOMS,
  LP_TRUST,
  LP_COMPARISON_LEFT,
  LP_COMPARISON_RIGHT,
  LP_REVIEWS,
  LP_FAQS,
  LP_NEARBY,
  HOTEL_PHONE_DISPLAY,
  HOTEL_ADDRESS,
  BOOKING_COM_URL,
} from '@/lib/lpConfig';
import { WhatsAppCta, CallCta, BookCta } from './LpCtas';
import LpRoomCard from './LpRoomCard';
import LpFaq from './LpFaq';
import StickyBar from './StickyBar';
import UtmCapture from './UtmCapture';

interface Props {
  variant: LpVariant;
  /** Resolved H1 (either the sanitized ?kw= or the variant default). */
  headline: string;
}

const MAP_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3447.68288744653!2d71.4682164119909!3d30.217597010239494!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x393b331f4190289f%3A0xcf0b199665e27a0e!2sHotel%20Elegant%20Executive%20Suites%20Multan!5e0!3m2!1sen!2s!4v1780433086298!5m2!1sen!2s';

const DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=Hotel+Elegant+Executive+Suites+Multan';

export default function LandingPage({ variant, headline }: Props) {
  const isCarousel = variant.featured === 'all';
  const featuredRoom = !isCarousel ? LP_ROOMS[variant.featured] : null;

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <UtmCapture />

      {/* ── 1. MINIMAL HEADER (no full nav — one goal: book) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Hotel Elegant Executive Suites — home">
            <Image
              src="/logo-full.png"
              alt="Hotel Elegant Executive Suites Multan"
              width={170}
              height={40}
              priority
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop: full phone. Mobile: call + WhatsApp icons only. */}
          <div className="flex items-center gap-2">
            <CallCta
              variant={variant.key}
              location="header"
              className="hidden sm:inline-flex items-center gap-2 font-montserrat font-semibold text-sm text-[#1A0B2E] hover:text-[#E30613] transition-colors"
            >
              <Phone size={16} className="text-[#E30613]" />
              {HOTEL_PHONE_DISPLAY}
            </CallCta>
            <CallCta
              variant={variant.key}
              location="header"
              className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#1A0B2E] text-white"
            >
              <Phone size={18} />
            </CallCta>
            <WhatsAppCta
              variant={variant.key}
              location="header"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#25D366] text-white sm:hidden"
            >
              <MessageCircle size={18} />
            </WhatsAppCta>
          </div>
        </div>
      </header>

      {/* ── 2. HERO (above the fold) ── */}
      <section className="relative min-h-[540px] md:min-h-[600px] flex items-center justify-center overflow-hidden">
        <Image
          src={variant.heroImage}
          alt={variant.heroAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Overlay: default deep-purple wash for evergreen LPs. Flag theme
            (Azadi campaign) gets the full festive treatment: a deep Pakistan-
            green wash strong enough that the room photo reads as texture, a
            white hoist-stripe on the left echoing the flag's white band, a
            big low-opacity crescent + star watermark on the right, and a
            green/white pennant bunting strip hanging from the top edge.
            All pure CSS/SVG — no image assets, nothing to load. */}
        {variant.offer?.theme === 'flag' ? (
          <div className="absolute inset-0" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(115deg, #01411C 0%, rgba(1,65,28,0.94) 35%, rgba(3,77,34,0.82) 60%, rgba(1,45,20,0.95) 100%)',
              }}
            />
            {/* White hoist stripe (flag's left band) — desktop only */}
            <div className="absolute inset-y-0 left-0 w-[7%] bg-white/10 hidden md:block" />
            {/* Crescent + star watermark */}
            <svg
              className="absolute right-2 md:right-14 top-14 w-44 h-44 md:w-72 md:h-72 opacity-[0.14]"
              viewBox="0 0 100 100"
            >
              <defs>
                <mask id="azadi-crescent">
                  <rect width="100" height="100" fill="black" />
                  <circle cx="45" cy="52" r="32" fill="white" />
                  <circle cx="57" cy="45" r="27" fill="black" />
                </mask>
              </defs>
              <rect width="100" height="100" fill="#fff" mask="url(#azadi-crescent)" />
              <polygon
                fill="#fff"
                points="72,21 74.35,27.76 81.51,27.91 75.8,32.24 77.88,39.09 72,35 66.12,39.09 68.2,32.24 62.49,27.91 69.65,27.76"
              />
            </svg>
            {/* Festive pennant bunting along the top */}
            <svg
              className="absolute top-0 left-0 w-full h-5 md:h-6"
              viewBox="0 0 1200 24"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 30 }).map((_, i) => (
                <polygon
                  key={i}
                  points={`${i * 40},0 ${i * 40 + 40},0 ${i * 40 + 20},22`}
                  fill={i % 2 === 0 ? '#ffffff' : '#0B7A3B'}
                  opacity="0.92"
                />
              ))}
            </svg>
          </div>
        ) : (
          <div className="absolute inset-0 bg-[#1A0B2E]/[0.55]" />
        )}

        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 text-center py-14">
          <p
            className={`font-montserrat font-semibold text-xs tracking-widest uppercase mb-3 bg-white/95 inline-block px-3 py-1 ${
              variant.offer?.theme === 'flag' ? 'text-[#01411C]' : 'text-[#E30613]'
            }`}
          >
            {variant.eyebrow}
          </p>
          <h1 className="font-playfair font-semibold text-3xl sm:text-4xl md:text-5xl text-white leading-tight mb-3 text-balance">
            {headline}
          </h1>
          <p className="font-montserrat text-white/90 text-sm md:text-base mb-5">
            Stay in Comfort. Live in Elegance. — From Rs 6,840/night · No advance payment
          </p>

          {/* Offer voucher — only rendered for campaign LPs that pass a
              variant.offer. Styled as a physical ticket: colored header band,
              two-panel body split by a dashed perforation (discount promise
              on the left, tap-to-remember code chip on the right), urgency
              strip as the stub. Accent colour follows the theme — Pakistan
              green for the Azadi flag theme, brand red otherwise. */}
          {variant.offer && (() => {
            const isFlag = variant.offer.theme === 'flag';
            const accent = isFlag ? '#01411C' : '#E30613';
            const accentBright = isFlag ? '#0B7A3B' : '#E30613';
            // "14% OFF All Rooms · Code AZADI14" → left panel shows the part
            // before the '·'; the code already has its own chip on the right.
            const promise = variant.offer.headline.split('·')[0].trim();
            return (
              <div className="max-w-md mx-auto mb-6 rounded-lg overflow-hidden shadow-2xl text-left">
                {/* Header band */}
                <div
                  className="flex items-center justify-between px-4 py-2"
                  style={{ backgroundColor: accent }}
                >
                  <span className="font-montserrat text-[10px] font-bold tracking-widest uppercase text-white">
                    {isFlag ? '🇵🇰 Azadi Voucher' : 'Limited-time offer'}
                  </span>
                  <span className="flex items-center gap-1.5 font-montserrat text-[10px] font-semibold text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    Limited
                  </span>
                </div>

                {/* Ticket body: promise | perforation | code */}
                <div className="bg-white flex items-stretch">
                  <div className="flex-1 px-4 py-4 text-center flex flex-col items-center justify-center">
                    <p className="font-playfair font-bold text-2xl md:text-3xl leading-none" style={{ color: accent }}>
                      {promise.split(' ')[0]} {promise.split(' ')[1] || ''}
                    </p>
                    <p className="font-montserrat text-[11px] text-gray-500 mt-1">
                      {promise.split(' ').slice(2).join(' ') || 'on your stay'}
                    </p>
                  </div>

                  <div
                    className="border-l-2 border-dashed my-2"
                    style={{ borderColor: `${accent}44` }}
                  />

                  <div className="flex-1 px-4 py-4 text-center flex flex-col items-center justify-center gap-1.5">
                    <span className="font-montserrat text-[9px] uppercase tracking-widest text-gray-400">
                      Use code at checkout
                    </span>
                    <span
                      className="font-mono font-bold text-lg md:text-xl text-white px-4 py-1.5 rounded tracking-widest shadow-md"
                      style={{ background: `linear-gradient(120deg, ${accent}, ${accentBright})` }}
                    >
                      {variant.offer.code}
                    </span>
                  </div>
                </div>

                {/* Urgency stub */}
                <div
                  className="px-4 py-2 text-center border-t"
                  style={{ backgroundColor: isFlag ? '#F0F7F1' : '#FDF2F2', borderColor: `${accent}22` }}
                >
                  <p className="font-montserrat text-[11px] font-medium" style={{ color: accent }}>
                    {variant.offer.urgency}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-6">
            {LP_TRUST.map((t) => (
              <span
                key={t}
                className="font-montserrat text-[11px] md:text-xs font-semibold text-white bg-white/10 border border-white/20 px-2.5 py-1"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Two primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
            <WhatsAppCta
              variant={variant.key}
              location="hero"
              className="btn-whatsapp w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-8"
            >
              <MessageCircle size={18} />
              WhatsApp to Book
            </WhatsAppCta>
            <BookCta
              variant={variant.key}
              location="hero"
              className="btn-red w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-8"
            >
              Check Availability
              <ArrowRight size={16} />
            </BookCta>
          </div>

          {/* NAP line (local trust) */}
          <p className="font-montserrat text-white/80 text-xs mt-5 flex items-center justify-center gap-1.5">
            <MapPin size={13} className="text-[#E30613]" />
            {HOTEL_ADDRESS} · {HOTEL_PHONE_DISPLAY}
          </p>
        </div>
      </section>

      {/* ── 3. FEATURED ROOM(S) ── */}
      <section className="py-14 md:py-20 bg-[#1A0B2E]/[0.03]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-2">
              Rooms &amp; Suites
            </p>
            <h2 className="font-playfair font-semibold text-2xl md:text-3xl text-[#1A0B2E]">
              {isCarousel ? 'Choose Your Room' : `Featured: ${featuredRoom?.name}`}
            </h2>
          </div>

          {isCarousel ? (
            <div className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
              {LP_ALL_ROOMS.map((room) => (
                <LpRoomCard key={room.slug} room={room} variant={variant.key} />
              ))}
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              {featuredRoom && (
                <LpRoomCard room={featuredRoom} variant={variant.key} featured />
              )}
              <div className="text-center mt-6">
                <Link
                  href="/rooms"
                  className="font-montserrat font-semibold text-sm text-[#E30613] hover:underline"
                >
                  See all 5 rooms →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. WHY BOOK DIRECT (comparison) ── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-2">
              The Difference
            </p>
            <h2 className="font-playfair font-semibold text-2xl md:text-3xl text-[#1A0B2E]">
              Why Book Direct With Us
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-50 border border-red-100 p-6">
              <h3 className="font-playfair font-semibold text-lg text-red-800 mb-4">
                Commonly Reported Problems
              </h3>
              <ul className="space-y-3">
                {LP_COMPARISON_LEFT.map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                    <span className="font-montserrat text-sm text-red-800 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-green-50 border border-green-100 p-6">
              <h3 className="font-playfair font-semibold text-lg text-green-800 mb-4">
                The Hotel Elegant Way
              </h3>
              <ul className="space-y-3">
                {LP_COMPARISON_RIGHT.map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    <span className="font-montserrat text-sm text-green-800 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. REVIEWS ── */}
      <section className="py-14 md:py-20 bg-[#1A0B2E]/[0.03]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 font-montserrat text-sm font-semibold text-[#1A0B2E] bg-white border border-gray-100 px-4 py-2 mb-4">
              <Star size={15} className="text-amber-400 fill-amber-400" />
              4.6★ on Google from 432 verified reviews
            </span>
            <h2 className="font-playfair font-semibold text-2xl md:text-3xl text-[#1A0B2E]">
              What Our Guests Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {LP_REVIEWS.map((t) => (
              <div key={t.name} className="bg-white p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="font-montserrat text-sm text-gray-600 leading-relaxed mb-4 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">— {t.name}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <a
              href={BOOKING_COM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-montserrat text-sm text-gray-500 hover:text-gray-700 underline"
            >
              <BadgeCheck size={15} className="text-[#1A0B2E]" />
              Also 8.3/10 on Booking.com (145 reviews)
            </a>
          </div>
        </div>
      </section>

      {/* ── 6. LOCATION ── */}
      <section className="py-14 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-2">
              Location
            </p>
            <h2 className="font-playfair font-semibold text-2xl md:text-3xl text-[#1A0B2E] mb-3">
              Perfectly Placed in Gulgasht, Multan
            </h2>
            <p className="font-montserrat text-sm text-gray-500 max-w-2xl mx-auto">
              ~7 km from the airport, walking distance to food courts and shopping, near Nishtar
              Hospital and the Old City.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <div className="grid sm:grid-cols-2 gap-3 content-start">
              {LP_NEARBY.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between gap-3 p-3 border border-gray-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin size={15} className="text-[#E30613] shrink-0" />
                    <p className="font-montserrat text-sm text-[#1A0B2E] font-medium truncate">
                      {p.name}
                    </p>
                  </div>
                  <span className="font-montserrat text-sm font-semibold text-[#1A0B2E] shrink-0">
                    {p.distance}
                  </span>
                </div>
              ))}
            </div>

            <div className="overflow-hidden border border-gray-100 min-h-[300px]">
              <iframe
                src={MAP_SRC}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 300 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Hotel Elegant Executive Suites Multan location map"
              />
            </div>
          </div>

          <div className="text-center mt-6">
            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-montserrat font-semibold text-sm text-[#E30613] hover:underline inline-flex items-center gap-1.5"
            >
              Get Directions <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ── */}
      <section className="py-14 md:py-20 bg-[#1A0B2E]/[0.03]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-2">
              FAQs
            </p>
            <h2 className="font-playfair font-semibold text-2xl md:text-3xl text-[#1A0B2E]">
              Frequently Asked Questions
            </h2>
          </div>
          <LpFaq faqs={LP_FAQS} />
        </div>
      </section>

      {/* ── 8. FINAL CTA BAND ── */}
      <section className="bg-[#1A0B2E] py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-white mb-3">
            Your Room Is Waiting
          </h2>
          <p className="font-montserrat text-white/80 text-sm md:text-base mb-8">
            No payment required — we confirm on WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <WhatsAppCta
              variant={variant.key}
              location="final_cta"
              className="btn-whatsapp w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-8"
            >
              <MessageCircle size={18} />
              WhatsApp
            </WhatsAppCta>
            <BookCta
              variant={variant.key}
              location="final_cta"
              className="btn-red w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-8"
            >
              Check Availability
            </BookCta>
            <CallCta
              variant={variant.key}
              location="final_cta"
              className="btn-outline-white w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-8"
            >
              <Phone size={16} />
              Call {HOTEL_PHONE_DISPLAY}
            </CallCta>
          </div>
        </div>
      </section>

      {/* ── 9. MINIMAL FOOTER ── */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="font-montserrat text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-[#1A0B2E]">Hotel Elegant Executive Suites</p>
            <p>
              {HOTEL_ADDRESS} · {HOTEL_PHONE_DISPLAY} · info@elegant-suite.com
            </p>
          </div>
          <div className="flex items-center gap-4 font-montserrat text-xs text-gray-500">
            <Link href="/privacy-policy" className="hover:text-[#E30613]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#E30613]">
              Terms
            </Link>
          </div>
        </div>
      </footer>

      {/* ── 10. STICKY MOBILE CTA BAR ── */}
      <StickyBar variant={variant.key} />

      {/* Trust icons strip (Google Ads local signals) — visually simple, SEO-safe */}
      <div className="sr-only">
        <ParkingCircle /> <Wifi /> <Clock />
      </div>

      {/* Hotel JSON-LD (rating/address help ad landing-page trust) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Hotel',
            name: 'Hotel Elegant Executive Suites',
            address: {
              '@type': 'PostalAddress',
              streetAddress: '77-A Gulgasht Colony',
              addressLocality: 'Multan',
              addressRegion: 'Punjab',
              postalCode: '60750',
              addressCountry: 'PK',
            },
            telephone: '+923173330998',
            email: 'info@elegant-suite.com',
            priceRange: '$$',
            starRating: {
              '@type': 'Rating',
              ratingValue: '3',
              bestRating: '5',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.6',
              reviewCount: '432',
              bestRating: '5',
            },
          }),
        }}
      />
    </div>
  );
}
