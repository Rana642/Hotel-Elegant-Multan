import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Maximize, Users, Eye, ArrowRight, Wifi, Thermometer, Tv, Bath } from 'lucide-react';
import BookingSearchBar from '@/components/BookingSearchBar';
import { getRooms, getAvailableRooms } from '@/lib/rooms';
import { Room } from '@/types';
import { formatCurrency, calcNights, getRoomPricing } from '@/lib/utils';

export const metadata: Metadata = {
  title: { absolute: 'Hotel Rooms in Multan — Suites & Family Rooms' },
  alternates: { canonical: '/rooms' },
  description:
    'Browse Executive King, Family Suite, Presidential Suite, Junior Suite and Triple Sharing rooms at Hotel Elegant Multan. Best rates, direct booking, no advance payment.',
  openGraph: {
    title: 'Hotel Rooms in Multan | Hotel Elegant Executive Suites',
    images: [{ url: '/hero-poster.jpg', width: 1280, height: 720, alt: 'Hotel Elegant Executive Suites Multan' }],
  },
};

const sharedAmenities = [
  { icon: Wifi, label: 'Free WiFi' },
  { icon: Thermometer, label: 'Air Conditioning' },
  { icon: Tv, label: 'Smart TV' },
  { icon: Bath, label: 'Ensuite Bathroom' },
];

export const dynamic = 'force-dynamic';

interface SearchParams {
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
}

export default async function RoomsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { checkIn, checkOut, adults: adultsStr, children: childrenStr } = sp;
  const adults = Number(adultsStr) || 1;
  const children = Number(childrenStr) || 0;

  let rooms: Room[] = [];
  let filtered = false;
  let nights = 1;

  try {
    if (checkIn && checkOut && checkOut > checkIn) {
      rooms = await getAvailableRooms(checkIn, checkOut, adults, children);
      nights = calcNights(checkIn, checkOut);
      filtered = true;
    } else {
      rooms = await getRooms();
    }
  } catch { rooms = []; }

  return (
    <>
      {/* Hero Banner */}
      <section className="relative bg-[#1A0B2E] pt-32 pb-16">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-3">
            Hotel Elegant Executive Suites · Multan
          </p>
          <h1 className="font-playfair font-semibold text-4xl md:text-5xl text-white mb-4">
            Hotel Rooms in Multan
          </h1>
          <p className="font-montserrat text-white/80 text-base max-w-xl mx-auto mb-10">
            Gulgasht Colony, Multan — just 7 km from Multan International Airport
          </p>
          <BookingSearchBar
            className="max-w-4xl mx-auto"
            initialCheckIn={checkIn}
            initialCheckOut={checkOut}
            initialAdults={adults}
            initialChildren={children}
          />
        </div>
      </section>

      {/* Rooms List */}
      <section className="section-pad bg-white">
        <div className="container-xl max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E]">
              {filtered
                ? `${rooms.length} Room${rooms.length !== 1 ? 's' : ''} Available`
                : 'Explore the Rooms & Suites'}
            </h2>
            {filtered && rooms.length === 0 && (
              <p className="font-montserrat text-sm text-gray-500 mt-3">
                No rooms match your criteria for those dates.{' '}
                <Link href="/rooms" className="text-[#E30613] underline">
                  View all rooms
                </Link>{' '}
                or{' '}
                <a href="https://wa.me/923173330998" className="text-[#25D366] underline">
                  WhatsApp us
                </a>{' '}
                for alternatives.
              </p>
            )}
          </div>

          <div className="space-y-0">
            {rooms.map((room, index) => {
              const featured = room.room_images?.find((i) => i.is_featured) || room.room_images?.[0];
              const { original, effective, hasOffer, discountPct } = getRoomPricing(room);
              const bookingQuery = checkIn
                ? `?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`
                : '';

              return (
                <article
                  key={room.id}
                  className="py-16 border-b border-gray-100 last:border-none"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/9] mb-8 overflow-hidden">
                    {featured ? (
                      <Image
                        src={featured.url}
                        alt={featured.alt || room.name}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 1024px) 100vw, 900px"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1A0B2E]/5" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-center mb-6">
                    <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-2">
                      Room & Suite
                    </p>
                    <h2 className="font-playfair font-semibold text-3xl md:text-4xl text-[#1A0B2E]">
                      {room.name}
                    </h2>
                    {effective > 0 && (
                      <p className="font-montserrat text-gray-500 text-sm mt-2">
                        From{' '}
                        {hasOffer && (
                          <span className="line-through text-gray-400 mr-1">
                            {formatCurrency(original)}
                          </span>
                        )}
                        <span className="font-semibold text-[#1A0B2E]">
                          {formatCurrency(effective)}
                        </span>
                        /night
                        {hasOffer && (
                          <span className="ml-2 inline-block bg-[#1A0B2E] text-white text-[10px] font-semibold px-2 py-0.5 tracking-wide align-middle">
                            {discountPct}% OFF
                          </span>
                        )}
                        {nights > 1 && (
                          <span className="ml-2 text-[#E30613]">
                            · Est. {formatCurrency(effective * nights)} total ({nights} nights)
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <p className="font-montserrat text-sm text-gray-500 leading-relaxed text-center max-w-2xl mx-auto mb-8">
                    {room.description}
                  </p>

                  {/* Amenities Band */}
                  <div className="bg-[#1A0B2E] text-white flex flex-wrap justify-center gap-x-8 gap-y-2 py-4 mb-8">
                    {(room.amenities || []).slice(0, 4).map((a) => (
                      <span key={a} className="font-montserrat text-xs font-semibold tracking-widest uppercase">
                        {a}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap justify-center gap-8 mb-8 text-sm font-montserrat">
                    {room.size_sqft && (
                      <div className="text-center">
                        <Maximize size={20} className="text-[#E30613] mx-auto mb-1" />
                        <p className="font-semibold text-[#1A0B2E]">{room.size_sqft} sq ft</p>
                        <p className="text-gray-400 text-xs">Room Size</p>
                      </div>
                    )}
                    <div className="text-center">
                      <Users size={20} className="text-[#E30613] mx-auto mb-1" />
                      <p className="font-semibold text-[#1A0B2E]">
                        {room.max_adults} Adults
                        {room.max_children > 0 ? ` +${room.max_children} Child` : ''}
                      </p>
                      <p className="text-gray-400 text-xs">Occupancy</p>
                    </div>
                    <div className="text-center">
                      <Eye size={20} className="text-[#E30613] mx-auto mb-1" />
                      <p className="font-semibold text-[#1A0B2E]">{room.view || 'City View'}</p>
                      <p className="text-gray-400 text-xs">View</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="text-center">
                    <Link
                      href={`/rooms/${room.slug}${bookingQuery}`}
                      className="btn-red inline-flex items-center gap-2 py-4 px-12"
                    >
                      {filtered ? 'Book This Room' : 'Check Availability'}
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Every Room Includes Band */}
      <section className="bg-[#1A0B2E] py-12">
        <div className="container-xl text-center">
          <p className="font-montserrat text-[#E30613] text-xs font-semibold tracking-widest uppercase mb-4">
            Every Room
          </p>
          <h2 className="font-playfair font-semibold text-2xl text-white mb-8">
            Every Room Includes
          </h2>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
            {[
              'Free WiFi', 'Air Conditioning', 'Flat-screen Smart TV', 'Ensuite Bathroom',
              'Tea/Coffee Maker', 'Minibar', 'Soundproofing', 'Work Desk',
            ].map((a) => (
              <span key={a} className="font-montserrat text-sm text-white/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E30613] inline-block" />
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* JSON-LD Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: process.env.NEXT_PUBLIC_SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Rooms', item: `${process.env.NEXT_PUBLIC_SITE_URL}/rooms` },
            ],
          }),
        }}
      />
    </>
  );
}
