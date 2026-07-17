import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Maximize, Users, Eye, ArrowRight, ExternalLink } from 'lucide-react';
import { getRooms, getRoomsStatic, getRoomBySlug } from '@/lib/rooms';
import { formatCurrency } from '@/lib/utils';
import RoomGallery from './RoomGallery';
import BookingSection from './BookingSection';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string; adults?: string; children?: string }>;
}

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const rooms = await getRoomsStatic().catch(() => []);
  return rooms.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) return {};

  const titleMap: Record<string, string> = {
    'executive-king': 'Executive King Room — Five Star Hotel in Multan',
    'family-suite': 'Family Hotels in Multan — Family Suite at Hotel Elegant',
    'presidential-suite': 'Presidential Suite — Premium Hotel in Multan',
    'junior-suite': 'Junior Suite — Executive Hotel in Multan',
    'triple-sharing': 'Triple Room — Budget-Friendly Hotel in Multan',
  };

  const pageTitle = titleMap[slug] || `${room.name} — Hotel Elegant Multan`;

  const descBase = `${room.name} in Multan — ${(room.description || '').trim()}`;
  const description =
    descBase.length > 156 ? descBase.slice(0, 155).replace(/\s+\S*$/, '') + '…' : descBase;

  return {
    title: { absolute: pageTitle },
    description,
    openGraph: { title: pageTitle },
  };
}

export const revalidate = 60;

export default async function RoomDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const [room, allRooms] = await Promise.all([
    getRoomBySlug(slug).catch(() => null),
    getRooms().catch(() => [] as Awaited<ReturnType<typeof getRooms>>),
  ]);
  if (!room) notFound();

  const related = allRooms.filter((r) => r.id !== room.id).slice(0, 2);
  const images = [...(room.room_images || [])].sort((a, b) => a.sort_order - b.sort_order);
  const featuredImage = images.find((i) => i.is_featured) || images[0];

  return (
    <>
      {/* Hero Image */}
      {featuredImage && (
        <div className="relative h-[55vh] min-h-[400px] max-h-[700px] mt-16">
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt || room.name}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#1A0B2E]/30" />
        </div>
      )}

      <div className="container-xl py-16 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-montserrat text-gray-400 mb-8">
          <Link href="/" className="hover:text-[#E30613]">Home</Link>
          <span>/</span>
          <Link href="/rooms" className="hover:text-[#E30613]">Rooms</Link>
          <span>/</span>
          <span className="text-[#1A0B2E] font-semibold">{room.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Gallery */}
            {images.length > 1 && <RoomGallery images={images} roomName={room.name} />}

            {/* Details */}
            <div className="mt-10">
              <h1 className="font-playfair font-semibold text-4xl text-[#1A0B2E] mb-2">
                {room.name}
              </h1>
              {room.price_per_night && (
                <p className="font-montserrat text-gray-500 text-sm mb-6">
                  From{' '}
                  <span className="font-bold text-xl text-[#1A0B2E]">
                    {formatCurrency(room.price_per_night)}
                  </span>{' '}
                  / night
                </p>
              )}
              <p className="font-montserrat text-gray-600 leading-relaxed text-base mb-8">
                {room.description}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 mb-8 py-6 border-y border-gray-100">
                {room.size_sqft && (
                  <div className="flex items-center gap-3">
                    <Maximize size={20} className="text-[#E30613]" />
                    <div>
                      <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">
                        {room.size_sqft} sq ft
                      </p>
                      <p className="font-montserrat text-xs text-gray-400">Room Size</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-[#E30613]" />
                  <div>
                    <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">
                      {room.max_adults} Adults
                      {room.max_children > 0 ? ` + ${room.max_children} Child` : ''}
                    </p>
                    <p className="font-montserrat text-xs text-gray-400">Max Occupancy</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Eye size={20} className="text-[#E30613]" />
                  <div>
                    <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">
                      {room.view || 'City View'}
                    </p>
                    <p className="font-montserrat text-xs text-gray-400">View</p>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <h2 className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-4">
                Room Amenities
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
                {(room.amenities || []).map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1A0B2E]/5 text-[#1A0B2E]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E30613] shrink-0" />
                    <span className="font-montserrat text-xs font-semibold">{a}</span>
                  </div>
                ))}
              </div>

              {/* Booking.com link */}
              <a
                href="https://www.booking.com/hotel/pk/elegant-exective-suite.es.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-montserrat text-gray-400 hover:text-gray-600 underline"
              >
                Also available on Booking.com
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <BookingSection
              room={room}
              initialCheckIn={sp.checkIn}
              initialCheckOut={sp.checkOut}
              initialAdults={sp.adults ? Number(sp.adults) : undefined}
              initialChildren={sp.children ? Number(sp.children) : undefined}
            />
          </div>
        </div>

        {/* Related Rooms */}
        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8">
              Other Rooms You May Like
            </h2>
            <div className="grid sm:grid-cols-2 gap-8">
              {related.map((r) => {
                const img = r.room_images?.find((i) => i.is_featured) || r.room_images?.[0];
                return (
                  <Link
                    key={r.id}
                    href={`/rooms/${r.slug}`}
                    className="group border border-gray-100 hover:border-[#E30613]/30 hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {img && (
                        <Image
                          src={img.url}
                          alt={img.alt || r.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="400px"
                        />
                      )}
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="font-playfair font-semibold text-[#1A0B2E]">{r.name}</span>
                      <ArrowRight size={16} className="text-[#E30613]" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HotelRoom',
            name: room.name,
            description: room.description,
            url: `${process.env.NEXT_PUBLIC_SITE_URL}/rooms/${room.slug}`,
            containedInPlace: {
              '@type': 'Hotel',
              name: 'Hotel Elegant Executive Suites',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '77-A Gulgasht Colony',
                addressLocality: 'Multan',
                addressCountry: 'PK',
              },
            },
            floorSize: room.size_sqft
              ? { '@type': 'QuantitativeValue', value: room.size_sqft, unitCode: 'FTK' }
              : undefined,
            occupancy: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: room.max_adults + room.max_children,
            },
            amenityFeature: (room.amenities || []).map((a) => ({
              '@type': 'LocationFeatureSpecification',
              name: a,
              value: true,
            })),
          }),
        }}
      />
    </>
  );
}
