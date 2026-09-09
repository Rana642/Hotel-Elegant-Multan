'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Phone, MessageCircle, Search } from 'lucide-react';
import { Room } from '@/types';
import { formatCurrency, getRoomPricing } from '@/lib/utils';
import ContactIntentButton from '@/app/_components/ContactIntentButton';
import ReservationModal from '@/components/ReservationModal';
import Link from 'next/link';

interface Props {
  room: Room;
  /** Hotel-wide sales tax rate as a whole-number percent. Shown next to the
   *  per-night price, informational only. */
  taxPercent: number;
}

/**
 * Room-detail sidebar. The full guest-info booking form has moved to the new
 * unified flow (Header Reservation → modal → /reservations → pick a room →
 * /booking form). This sidebar now just teases the price and hands off to
 * that flow — dates can be prefilled via the search-bar URL params.
 */
export default function BookingSection({ room, taxPercent }: Props) {
  const searchParams = useSearchParams();
  const checkIn  = searchParams.get('checkIn')  || '';
  const checkOut = searchParams.get('checkOut') || '';
  const adults   = searchParams.get('adults')   || '1';
  const children = searchParams.get('children') || '0';
  const [resOpen, setResOpen] = useState(false);

  const { original, effective: price, hasOffer, discountPct } = getRoomPricing(room);

  // Build a /reservations link that lands on the list already scoped to this
  // room's context (dates + occupancy). The list will highlight this room.
  const q = new URLSearchParams();
  if (checkIn)  q.set('checkIn', checkIn);
  if (checkOut) q.set('checkOut', checkOut);
  q.set('adults', adults);
  q.set('children', children);
  const reservationsHref = `/reservations?${q.toString()}`;

  return (
    <>
      <div className="sticky top-24 border border-gray-200 p-6 bg-white shadow-sm">
        <p className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-1">{room.name}</p>
        {price > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {hasOffer && (
                <span className="font-montserrat text-sm text-gray-400 line-through">
                  {formatCurrency(original)}
                </span>
              )}
              <p className="font-montserrat text-sm text-gray-500">
                <span className="font-bold text-lg text-[#1A0B2E]">{formatCurrency(price)}</span>/night
              </p>
              {hasOffer && (
                <span className="bg-[#E30613] text-white text-[10px] font-bold px-2 py-0.5 tracking-wide">
                  {discountPct}% OFF
                </span>
              )}
            </div>
            {taxPercent > 0 && (
              <p className="font-montserrat text-[11px] text-gray-400 mt-0.5">
                + {formatCurrency(Math.round(price * taxPercent / 100))} GST per night
              </p>
            )}
          </div>
        )}

        <p className="text-sm font-montserrat text-gray-500 mb-4">
          Check availability, promotions and best direct rate for your dates.
        </p>

        <button
          type="button"
          onClick={() => setResOpen(true)}
          className="btn-red w-full py-4 flex items-center justify-center gap-2"
        >
          <Search size={15} />
          Reservation
        </button>
        <Link
          href={reservationsHref}
          className="mt-2 w-full block text-center py-2 text-xs font-montserrat font-semibold text-[#1A0B2E] hover:text-[#E30613] transition-colors underline underline-offset-2"
        >
          See all rooms
        </Link>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <ContactIntentButton
            channel="call"
            ariaLabel="Call the hotel"
            className="flex items-center justify-center gap-2 py-3 border border-[#1A0B2E] text-[#1A0B2E] font-montserrat font-semibold text-xs tracking-wider uppercase hover:bg-[#1A0B2E] hover:text-white transition-colors"
          >
            <Phone size={14} /> Call
          </ContactIntentButton>
          <ContactIntentButton
            channel="whatsapp"
            ariaLabel="WhatsApp the hotel"
            roomName={room.name}
            className="flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-montserrat font-semibold text-xs tracking-wider uppercase hover:bg-green-600 transition-colors"
          >
            <MessageCircle size={14} /> WhatsApp
          </ContactIntentButton>
        </div>

        <p className="text-xs font-montserrat text-gray-400 text-center mt-3">
          No payment now · Confirm via WhatsApp
        </p>
      </div>
      {resOpen && <ReservationModal onClose={() => setResOpen(false)} />}
    </>
  );
}
