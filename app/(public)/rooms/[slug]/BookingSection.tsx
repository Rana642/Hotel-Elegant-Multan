'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, Users } from 'lucide-react';
import { Room } from '@/types';
import { formatCurrency, calcNights, calcPricing, EXTRA_BED_PRICE } from '@/lib/utils';

interface Props {
  room: Room;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
}

export default function BookingSection({
  room,
  initialCheckIn,
  initialCheckOut,
  initialAdults = 1,
  initialChildren = 0,
}: Props) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(initialCheckOut || tomorrow);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [extraBeds, setExtraBeds] = useState(0);

  const nights = checkOut > checkIn ? calcNights(checkIn, checkOut) : 0;
  const price = room.price_per_night || 0;
  const { roomTotal, extraBedTotal, grandTotal } = calcPricing(price, nights, extraBeds);

  return (
    <div className="sticky top-24 border border-gray-200 p-6 bg-white shadow-sm">
      <p className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-1">{room.name}</p>
      {price > 0 && (
        <p className="font-montserrat text-sm text-gray-500 mb-6">
          <span className="font-bold text-lg text-[#1A0B2E]">{formatCurrency(price)}</span>/night
        </p>
      )}

      {/* Dates */}
      <div className="space-y-3 mb-4">
        <label className="block">
          <span className="font-montserrat text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1 block">
            Check-in
          </span>
          <div className="flex items-center gap-2 border border-gray-200 px-3 py-2.5">
            <CalendarDays size={14} className="text-[#E30613]" />
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="font-montserrat text-sm flex-1 outline-none"
            />
          </div>
        </label>

        <label className="block">
          <span className="font-montserrat text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1 block">
            Check-out
          </span>
          <div className="flex items-center gap-2 border border-gray-200 px-3 py-2.5">
            <CalendarDays size={14} className="text-[#E30613]" />
            <input
              type="date"
              value={checkOut}
              min={checkIn || tomorrow}
              onChange={(e) => setCheckOut(e.target.value)}
              className="font-montserrat text-sm flex-1 outline-none"
            />
          </div>
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="font-montserrat text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1 block">
              Adults
            </span>
            <div className="flex items-center gap-1 border border-gray-200 px-2 py-2.5">
              <Users size={12} className="text-[#E30613]" />
              <select
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="font-montserrat text-sm flex-1 outline-none bg-transparent"
              >
                {Array.from({ length: room.max_adults }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="block">
            <span className="font-montserrat text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1 block">
              Children
            </span>
            <div className="flex items-center gap-1 border border-gray-200 px-2 py-2.5">
              <select
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="font-montserrat text-sm flex-1 outline-none bg-transparent"
              >
                {Array.from({ length: room.max_children + 1 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="block">
            <span className="font-montserrat text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1 block">
              Extra Beds
            </span>
            <div className="flex items-center border border-gray-200 px-2 py-2.5">
              <select
                value={extraBeds}
                onChange={(e) => setExtraBeds(Number(e.target.value))}
                className="font-montserrat text-sm flex-1 outline-none bg-transparent"
              >
                {[0, 1, 2].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </label>
        </div>
      </div>

      {/* Price Summary */}
      {nights > 0 && price > 0 && (
        <div className="bg-[#1A0B2E]/5 p-4 mb-4 space-y-2 text-sm font-montserrat">
          <div className="flex justify-between">
            <span className="text-gray-600">{formatCurrency(price)} × {nights} night{nights > 1 ? 's' : ''}</span>
            <span className="font-semibold text-[#1A0B2E]">{formatCurrency(roomTotal)}</span>
          </div>
          {extraBeds > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Extra bed{extraBeds > 1 ? 's' : ''} ({extraBeds} × {formatCurrency(EXTRA_BED_PRICE)} × {nights})</span>
              <span className="font-semibold text-[#1A0B2E]">{formatCurrency(extraBedTotal)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#1A0B2E]/20 pt-2 font-semibold">
            <span className="text-[#1A0B2E]">Est. Total</span>
            <span className="text-[#E30613] text-base">{formatCurrency(grandTotal)}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            * Pay at hotel — no advance payment required
          </p>
        </div>
      )}

      <Link
        href={`/booking?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&extraBeds=${extraBeds}`}
        className="btn-red w-full text-center block py-4"
      >
        Book Now
      </Link>
      <p className="text-xs font-montserrat text-gray-400 text-center mt-3">
        No payment now · Confirm via WhatsApp
      </p>
    </div>
  );
}
