'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Users, BedDouble, Wifi, Car, Coffee, Clock, Info, ChevronLeft, ChevronRight, Check, Tag, type LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import DealCountdown from '@/components/DealCountdown';
import TrackedNavLink from '@/components/TrackedNavLink';

export interface RoomCardVM {
  id: string;
  slug: string;
  name: string;
  description: string;
  bed: string;
  maxAdults: number;
  maxChildren: number;
  amenities: string[];
  images: string[];
  basePrice: number;
  price: number;
  originalStrike: number | null;
  gstPercent: number;
  dealName: string | null;
  dealPct: number;
  refundable: boolean;
  /** The applied deal requires full payment in advance. */
  advance: boolean;
  dealStartTime: string | null;
  dealEndTime: string | null;
  dealWeekdays: number[];
  bookHref: string;
}

const FALLBACK = '/hero-poster.jpg';

const INCLUSIONS: { icon: LucideIcon; label: string }[] = [
  { icon: BedDouble, label: 'Book Now, Pay at Hotel' },
  { icon: Clock, label: 'Early Check-in & Check-out (subject to availability)' },
  { icon: Coffee, label: 'Free Breakfast' },
  { icon: Car, label: 'Free Parking Available' },
  { icon: Wifi, label: 'Free Wi-Fi' },
];

export default function ReservationRoomCard({
  room,
  nights,
  highlighted = false,
  onBook,
}: {
  room: RoomCardVM;
  nights: number;
  /** The room the guest picked on a room card — shown first, outlined. */
  highlighted?: boolean;
  /** Open the guest form for this room on the same page (one-page booking).
   *  Without it, Book Now falls back to the /booking page link. */
  onBook?: (roomId: string) => void;
}) {
  const [tab, setTab] = useState<'rates' | 'amenities' | 'photos'>('rates');
  const totalPrice = room.price * nights;
  // Rates are pre-tax (Booking.com pattern) — show the tax as its own line.
  const totalTax = Math.round(totalPrice * (room.gstPercent / 100));
  const showStrike = !!room.originalStrike && room.originalStrike > room.price;
  const isNonRefundable = room.dealPct > 0 && !room.refundable;

  return (
    <div className={`bg-white border mb-4 ${highlighted ? 'border-[#E30613] ring-2 ring-[#E30613]/20' : 'border-gray-200'}`}>
      {highlighted && (
        <p className="bg-[#E30613] text-white text-xs font-montserrat font-semibold uppercase tracking-wider px-4 py-1.5">
          Your selected room
        </p>
      )}
      {/* Header row */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50">
        <div className="relative w-full sm:w-48 aspect-[4/3] shrink-0 bg-gray-100 overflow-hidden">
          <Image src={room.images[0] || FALLBACK} alt={room.name} fill sizes="200px" className="object-cover" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="font-playfair font-bold text-xl text-[#1A0B2E]">{room.name}</h3>
            <div className="mt-1 flex items-center gap-1 text-gray-500">
              {Array.from({ length: Math.min(room.maxAdults, 4) }).map((_, i) => (
                <Users key={i} size={13} />
              ))}
              {room.maxChildren > 0 && <span className="ml-1 text-xs">+ {room.maxChildren} child</span>}
            </div>
            {room.bed && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 font-montserrat">
                <BedDouble size={14} /> Bed: <b className="font-semibold text-[#1A0B2E]">{room.bed}</b>
              </p>
            )}
          </div>
          <div className="flex flex-col items-start sm:items-end sm:text-right">
            {showStrike && <span className="text-xs text-gray-400 line-through">{formatCurrency(room.originalStrike!)}</span>}
            <div>
              <span className="text-xs text-gray-500">From </span>
              <span className="font-playfair font-bold text-xl text-[#1A0B2E]">{formatCurrency(room.price)}</span>
              <span className="text-xs text-gray-500">/night</span>
            </div>
            <span className="text-xs text-gray-500 mt-0.5">Total {formatCurrency(totalPrice)} for {nights} night{nights !== 1 ? 's' : ''}</span>
            {room.gstPercent > 0 && <span className="text-xs text-gray-500">+ {formatCurrency(totalTax)} GST &amp; City Tax ({room.gstPercent}%)</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 bg-white px-4">
        {(['rates', 'amenities', 'photos'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 py-2.5 text-sm font-montserrat font-medium capitalize transition ${
              tab === t ? 'border-[#1A0B2E] text-[#1A0B2E]' : 'border-transparent text-gray-500 hover:text-[#1A0B2E]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white p-4">
        {tab === 'rates' && (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-montserrat font-semibold text-[#1A0B2E]">
                {room.dealName || 'Best Available Rate'}
                {room.dealPct > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#E30613]">
                    <Tag size={13} /> {room.dealPct}% Off On Room Price
                  </span>
                )}
              </p>
              {room.dealPct > 0 && (
                <div className="mt-1.5">
                  <DealCountdown
                    startTime={room.dealStartTime}
                    endTime={room.dealEndTime}
                    weekdays={room.dealWeekdays}
                    variant="dark"
                  />
                </div>
              )}
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {INCLUSIONS.map(({ icon: Icon, label: base }) => {
                  const label =
                    base === 'Book Now, Pay at Hotel' && (isNonRefundable || (room.dealPct > 0 && room.advance))
                      ? 'Book Now, Pay in Advance'
                      : base;
                  return (
                  <li key={label} className="flex items-center gap-2 text-sm text-gray-600 font-montserrat">
                    <Icon size={14} className="shrink-0 text-[#E30613]" /> {label}
                  </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-sm text-gray-600 font-montserrat">
                {isNonRefundable
                  ? 'Non-refundable — advance payment required.'
                  : room.dealPct > 0 && room.advance
                    ? `${room.dealName ?? 'Offer'} — full payment in advance, 100% refundable.`
                    : 'Best direct rate — pay when you arrive.'}
              </p>
              <p className={`mt-1 flex items-center gap-1.5 text-sm font-montserrat font-medium ${isNonRefundable ? 'text-[#E30613]' : 'text-gray-600'}`}>
                <Info size={14} className="shrink-0" />
                {isNonRefundable ? 'Non-Refundable' : 'Free cancellation · 100% refund anytime'}
              </p>
            </div>
            <div className="text-left sm:text-right">
              {showStrike && <span className="block text-sm text-gray-400 line-through">{formatCurrency(room.originalStrike!)}</span>}
              <div>
                <span className="font-playfair font-bold text-xl text-[#1A0B2E]">{formatCurrency(room.price)}</span>
                <span className="text-sm text-gray-500">/night</span>
              </div>
              <p className="text-xs text-gray-500">Total {formatCurrency(totalPrice)} for {nights} night{nights !== 1 ? 's' : ''}{room.gstPercent > 0 ? ` + ${formatCurrency(totalTax)} tax` : ''}</p>
              <TrackedNavLink
                href={room.bookHref}
                event="book_now_click"
                eventParams={{
                  location: 'reservation_room_card',
                  content_ids: [room.id],
                  content_name: room.name,
                  content_category: 'Hotel Room',
                  currency: 'PKR',
                  value: totalPrice,
                  num_nights: nights,
                }}
                onClick={(e) => {
                  if (onBook) {
                    e.preventDefault();
                    onBook(room.id);
                  }
                }}
                className="mt-2 inline-block bg-[#1A0B2E] hover:bg-[#2a1247] text-white text-sm font-montserrat font-semibold px-8 py-2.5 transition-colors w-full sm:w-auto text-center"
              >
                Book Now
              </TrackedNavLink>
            </div>
          </div>
        )}

        {tab === 'amenities' && (
          <div>
            {room.description && <p className="mb-3 text-sm leading-relaxed text-gray-600 font-montserrat">{room.description}</p>}
            {room.amenities.length > 0 ? (
              <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-3">
                {room.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-2 text-sm text-gray-600 font-montserrat">
                    <Check size={14} className="shrink-0 text-green-600" /> {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-montserrat">AC, Free WiFi, TV, Room Service, Attached Bathroom & more.</p>
            )}
          </div>
        )}

        {tab === 'photos' && <PhotoCarousel images={room.images.length ? room.images : [FALLBACK]} alt={room.name} />}
      </div>
    </div>
  );
}

function PhotoCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const go = (d: number) => setI((p) => (p + d + images.length) % images.length);
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
      <Image src={images[i]} alt={`${alt} photo ${i + 1}`} fill sizes="800px" className="object-cover" />
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-1.5 text-white hover:bg-black/70">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-1.5 text-white hover:bg-black/70">
            <ChevronRight size={18} />
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <span key={idx} className={`size-1.5 rounded-full ${idx === i ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
