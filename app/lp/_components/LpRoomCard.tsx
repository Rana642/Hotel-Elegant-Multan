'use client';

import Image from 'next/image';
import { Maximize, Users, Eye, ArrowRight, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { formatCurrency } from '@/lib/utils';
import {
  type LpRoom,
  type LpVariantKey,
} from '@/lib/lpConfig';
import ContactIntentButton from '@/app/_components/ContactIntentButton';

interface Props {
  room: LpRoom;
  variant: LpVariantKey;
  /** Featured cards get a wider, emphasised layout. */
  featured?: boolean;
  /** Compact mode — used on campaign LPs (Azadi) to keep the page short.
   *  Drops the amenities chips + WhatsApp button; keeps image, name, price
   *  line, and a single Check Availability button — same feel as the
   *  /rooms grid but even tighter. */
  compact?: boolean;
}

// Sales tax is 16% (Punjab PRA GST). LP is a static config surface — hardcoded
// here so we don't need to plumb the settings fetch through every LP variant.
// If admin changes the rate in Settings, the main site updates dynamically;
// LP marketing pages get the change on next code deploy.
const LP_TAX_PERCENT = 16;

export default function LpRoomCard({ room, variant, featured = false, compact = false }: Props) {
  const hasOffer = room.offer != null && room.offer < room.price;
  const effective = hasOffer ? (room.offer as number) : room.price;
  const discountPct = hasOffer
    ? Math.round((1 - (room.offer as number) / room.price) * 100)
    : 0;
  const taxAmount = Math.round(effective * LP_TAX_PERCENT / 100);

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
        <div className="absolute bottom-0 right-0 bg-[#E30613] text-white px-3 py-1.5 flex flex-col items-end leading-tight">
          <div className="flex items-baseline gap-1.5">
            {hasOffer && (
              <span className="font-montserrat text-xs line-through opacity-70">
                {formatCurrency(room.price)}
              </span>
            )}
            <span className="font-montserrat font-semibold text-sm">{formatCurrency(effective)}</span>
            <span className="font-montserrat text-xs opacity-80">/night</span>
          </div>
          <span className="font-montserrat text-[10px] opacity-80">
            + {formatCurrency(taxAmount)} GST
          </span>
        </div>
      </div>

      {/* Content — compact vs full. Compact drops amenity chips + the
          WhatsApp button (both already reachable via the site-wide sticky
          bar), leaving image + name + quick facts + a single CTA. */}
      {compact ? (
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-playfair font-semibold text-lg text-[#1A0B2E] mb-2">{room.name}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-[11px] font-montserrat font-medium text-gray-500">
            <span className="flex items-center gap-1"><Maximize size={11} />{room.size}</span>
            <span className="flex items-center gap-1"><Users size={11} />{room.occupancy}</span>
          </div>
          <a
            href={`/rooms/${room.slug}`}
            className="btn-red mt-auto w-full text-center flex items-center justify-center gap-2 py-2.5 text-sm"
            onClick={() =>
              trackEvent('booking_start', {
                lp_variant: variant,
                source: 'landing_page',
                location: `room_card_${room.slug}`,
              })
            }
          >
            Check Availability
            <ArrowRight size={13} />
          </a>
        </div>
      ) : (
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
            <ContactIntentButton
              channel="whatsapp"
              roomName={room.name}
              ariaLabel={`WhatsApp about ${room.name}`}
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
            </ContactIntentButton>
          </div>
        </div>
      )}
    </article>
  );
}
