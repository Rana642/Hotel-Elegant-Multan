'use client';

import Image from 'next/image';
import { Maximize, Users, Eye, ArrowRight, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { formatCurrency } from '@/lib/utils';
import {
  HOTEL_WHATSAPP_NUMBER,
  type LpRoom,
  type LpVariantKey,
} from '@/lib/lpConfig';

interface Props {
  room: LpRoom;
  variant: LpVariantKey;
  /** Featured cards get a wider, emphasised layout. */
  featured?: boolean;
}

export default function LpRoomCard({ room, variant, featured = false }: Props) {
  const hasOffer = room.offer != null && room.offer < room.price;
  const effective = hasOffer ? (room.offer as number) : room.price;
  const discountPct = hasOffer
    ? Math.round((1 - (room.offer as number) / room.price) * 100)
    : 0;

  const waText = `Hi, I'd like to book the ${room.name} at Hotel Elegant Executive Suites Multan.`;
  const waLink = `https://wa.me/${HOTEL_WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

  return (
    <article
      className={`group bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 flex flex-col ${
        featured ? '' : 'w-72 shrink-0 md:w-auto'
      }`}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3]">
        <Image
          src={room.image}
          alt={room.imageAlt}
          fill
          sizes="(max-width: 768px) 90vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {hasOffer && (
          <div className="absolute top-3 left-0 bg-[#1A0B2E] text-white px-3 py-1 font-montserrat text-xs font-bold tracking-wide">
            {discountPct}% OFF
          </div>
        )}
        <div className="absolute bottom-0 right-0 bg-[#E30613] text-white px-3 py-1.5 flex items-baseline gap-1.5">
          {hasOffer && (
            <span className="font-montserrat text-xs line-through opacity-70">
              {formatCurrency(room.price)}
            </span>
          )}
          <span className="font-montserrat font-semibold text-sm">{formatCurrency(effective)}</span>
          <span className="font-montserrat text-xs opacity-80">/night</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-3">{room.name}</h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-xs font-montserrat font-medium text-gray-500">
          <span className="flex items-center gap-1">
            <Maximize size={12} />
            {room.size}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            {room.occupancy}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {room.view}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {room.amenities.map((a) => (
            <span
              key={a}
              className="px-2 py-0.5 bg-[#1A0B2E]/5 text-[#1A0B2E] font-montserrat text-[10px] font-semibold tracking-wide"
            >
              {a}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <a
            href={`/rooms/${room.slug}`}
            className="btn-red w-full text-center flex items-center justify-center gap-2 py-3"
            onClick={() =>
              trackEvent('booking_start', {
                lp_variant: variant,
                source: 'landing_page',
                location: `room_card_${room.slug}`,
              })
            }
          >
            Check Availability
            <ArrowRight size={14} />
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp w-full text-center flex items-center justify-center gap-2 py-3"
            onClick={() =>
              trackEvent('whatsapp_click', {
                lp_variant: variant,
                source: 'landing_page',
                location: `room_card_${room.slug}`,
              })
            }
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
