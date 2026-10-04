'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import ReservationRoomCard, { type RoomCardVM } from './ReservationRoomCard';
import BookingForm from '../booking/BookingForm';
import { formatCurrency } from '@/lib/utils';
import type { Room } from '@/types';
import type { BankDetails } from '@/lib/bankDetails';

type AdvancePaymentConfig = React.ComponentProps<typeof BookingForm>['advancePayment'];

interface Props {
  cards: RoomCardVM[];
  rooms: Room[];
  nights: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  coupon: string;
  taxPercent: number;
  advancePayment: AdvancePaymentConfig;
  bankDetails: BankDetails | null;
  /** Room the guest picked on a room card (?room=, slug or id) — shown first and
   *  highlighted so they land on its deals, not on a list to search again. */
  highlightRoomId?: string;
  /** Room whose guest form is open (?book=) — survives a refresh. */
  initialBookRoomId?: string;
}

/**
 * One-page booking (same pattern as the Zehneria booking engine): the room
 * list with live deals, and tapping "Book Now" swaps the list for a compact
 * "selected room" row + the guest form right here — no separate /booking
 * page hop. "Modify" brings the list back.
 */
export default function ReservationsFlow({
  cards,
  rooms,
  nights,
  adults,
  children,
  checkIn,
  checkOut,
  coupon,
  taxPercent,
  advancePayment,
  bankDetails,
  highlightRoomId,
  initialBookRoomId,
}: Props) {
  const [bookId, setBookId] = useState<string | null>(
    initialBookRoomId && cards.some((c) => c.id === initialBookRoomId) ? initialBookRoomId : null,
  );
  const formRef = useRef<HTMLDivElement>(null);

  // Keep ?book= in the URL so refresh / back keeps the guest where they were.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (bookId) url.searchParams.set('book', bookId);
    else url.searchParams.delete('book');
    window.history.replaceState(null, '', url.toString());
    if (bookId) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [bookId]);

  // ?room= may be a room slug (room cards, LP) or id.
  const isHighlighted = (c: RoomCardVM) => !!highlightRoomId && (c.slug === highlightRoomId || c.id === highlightRoomId);
  const ordered = highlightRoomId
    ? [...cards].sort((a, b) => Number(isHighlighted(b)) - Number(isHighlighted(a)))
    : cards;

  const selectedCard = bookId ? cards.find((c) => c.id === bookId) : null;
  const selectedRoom = bookId ? rooms.find((r) => r.id === bookId) ?? null : null;

  const occupancy = `${adults} Adult${adults !== 1 ? 's' : ''}${
    children > 0 ? `, ${children} Child${children !== 1 ? 'ren' : ''}` : ''
  } · ${nights} night${nights !== 1 ? 's' : ''}`;

  if (selectedCard && selectedRoom) {
    return (
      <div ref={formRef} className="scroll-mt-32">
        {/* Selected room — compact, with Modify to go back to the list */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-100 border border-gray-200 px-5 py-3 mt-6">
          <div className="min-w-0">
            <p className="font-montserrat text-xs text-gray-500 uppercase tracking-wider">Selected room ({occupancy})</p>
            <p className="font-playfair font-semibold text-lg text-[#1A0B2E]">
              {selectedCard.name}
              {selectedCard.dealName && (
                <span className="ml-2 align-middle font-montserrat text-xs font-semibold text-[#E30613]">
                  {selectedCard.dealName} · {selectedCard.dealPct}% off
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <p className="font-montserrat text-sm text-[#1A0B2E]">
              <span className="font-semibold">{formatCurrency(selectedCard.price)}</span>
              <span className="text-gray-500"> /night + tax</span>
            </p>
            <button
              type="button"
              onClick={() => setBookId(null)}
              className="inline-flex items-center gap-1.5 font-montserrat text-sm font-semibold text-[#1A0B2E] underline underline-offset-2 hover:text-[#E30613]"
            >
              <Pencil size={14} /> Modify
            </button>
          </div>
        </div>

        <div className="bg-[#1A0B2E] text-white px-5 py-3 mb-4 mt-3">
          <p className="font-montserrat font-semibold text-sm tracking-wide">Guest Information</p>
        </div>

        <BookingForm
          key={bookId}
          rooms={rooms}
          preselectedRoom={selectedRoom}
          taxPercent={taxPercent}
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialAdults={adults}
          initialChildren={children}
          initialCoupon={coupon || undefined}
          advancePayment={advancePayment}
          bankDetails={bankDetails}
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#1A0B2E] text-white px-5 py-3 mb-3 mt-6">
        <p className="font-montserrat font-semibold text-sm tracking-wide">
          Select Room <span className="text-white/60 font-normal ml-2">({occupancy})</span>
        </p>
      </div>

      {cards.length === 0 && (
        <div className="bg-white border border-gray-200 p-6 text-center text-sm text-gray-600 font-montserrat">
          No rooms match your search. Please adjust dates or occupancy.
        </div>
      )}

      {ordered.map((room) => (
        <ReservationRoomCard
          key={room.id}
          room={room}
          nights={nights}
          highlighted={isHighlighted(room)}
          onBook={setBookId}
        />
      ))}
    </>
  );
}
