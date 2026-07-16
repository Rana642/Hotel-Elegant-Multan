import Link from 'next/link';
import Image from 'next/image';
import { BedDouble, Users, ArrowRight, Maximize } from 'lucide-react';
import { Room } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  room: Room;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  nights?: number;
}

export default function RoomCard({ room, checkIn, checkOut, adults, children, nights = 1 }: Props) {
  const featured = room.room_images?.find((i) => i.is_featured) || room.room_images?.[0];
  const bookingQuery = checkIn
    ? `?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`
    : '';

  return (
    <article className="group bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        {featured ? (
          <Image
            src={featured.url}
            alt={featured.alt || room.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-[#1A0B2E]/5" />
        )}
        {room.price_per_night && (
          <div className="absolute bottom-0 right-0 bg-[#E30613] text-white px-3 py-1.5">
            <span className="font-montserrat font-semibold text-sm">
              {formatCurrency(room.price_per_night)}
            </span>
            <span className="font-montserrat text-xs opacity-80">/night</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-2">{room.name}</h3>
        <p className="font-montserrat text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">
          {room.description}
        </p>

        {/* Stats row */}
        <div className="flex gap-4 mb-4 text-xs font-montserrat font-medium text-gray-500">
          {room.size_sqft && (
            <span className="flex items-center gap-1">
              <Maximize size={12} />
              {room.size_sqft} sq ft
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users size={12} />
            {room.max_adults} Adults
            {room.max_children > 0 ? ` +${room.max_children} Child` : ''}
          </span>
          <span className="flex items-center gap-1">
            <BedDouble size={12} />
            {room.view || 'City View'}
          </span>
        </div>

        {/* Amenity tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {(room.amenities || []).slice(0, 4).map((a) => (
            <span
              key={a}
              className="px-2 py-0.5 bg-[#1A0B2E]/5 text-[#1A0B2E] font-montserrat text-[10px] font-semibold tracking-wide"
            >
              {a}
            </span>
          ))}
        </div>

        {nights > 1 && room.price_per_night && (
          <p className="text-xs font-montserrat text-gray-500 mb-3">
            Est. total ({nights} nights):{' '}
            <span className="font-semibold text-[#1A0B2E]">
              {formatCurrency(room.price_per_night * nights)}
            </span>
          </p>
        )}

        <Link
          href={`/rooms/${room.slug}${bookingQuery}`}
          className="btn-red w-full text-center flex items-center justify-center gap-2 py-3"
        >
          Check Availability
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
