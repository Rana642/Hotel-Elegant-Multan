'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, User, Phone, Mail, Users, BedDouble, MessageSquare } from 'lucide-react';
import { Room } from '@/types';
import { formatCurrency, calcNights, calcPricing, EXTRA_BED_PRICE } from '@/lib/utils';
import { createBooking } from '@/app/actions/booking';

interface Props {
  rooms: Room[];
  preselectedRoom: Room | null;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialExtraBeds?: number;
}

export default function BookingForm({
  rooms,
  preselectedRoom,
  initialCheckIn,
  initialCheckOut,
  initialAdults = 1,
  initialChildren = 0,
  initialExtraBeds = 0,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [roomId, setRoomId] = useState(preselectedRoom?.id || rooms[0]?.id || '');
  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(initialCheckOut || tomorrow);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [extraBeds, setExtraBeds] = useState(initialExtraBeds);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [error, setError] = useState('');

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const nights = checkOut > checkIn ? calcNights(checkIn, checkOut) : 0;
  const price = selectedRoom?.price_per_night || 0;
  const { roomTotal, extraBedTotal, grandTotal } = calcPricing(price, nights, extraBeds);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomId) { setError('Please select a room.'); return; }
    if (checkOut <= checkIn) { setError('Check-out must be after check-in.'); return; }
    if (!guestName.trim()) { setError('Please enter your name.'); return; }
    if (!guestPhone.trim()) { setError('Please enter your phone / WhatsApp number.'); return; }

    startTransition(async () => {
      const result = await createBooking({
        roomId,
        checkIn,
        checkOut,
        adults,
        children,
        extraBeds,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim(),
        specialRequest: specialRequest.trim(),
      });

      if (result.success && result.bookingRef) {
        router.push(`/thank-you?ref=${result.bookingRef}`);
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    });
  };

  const inputClass =
    'w-full border border-gray-200 px-4 py-3 font-montserrat text-sm text-gray-900 outline-none focus:border-[#1A0B2E] transition-colors bg-white';

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
      {/* Left: Form fields */}
      <div className="lg:col-span-2 space-y-6 bg-white p-8 border border-gray-100">
        {/* Room selection */}
        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Room
          </label>
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
            <BedDouble size={14} className="text-[#E30613] shrink-0" />
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex-1 py-3 font-montserrat text-sm text-gray-900 outline-none bg-white"
              required
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.price_per_night ? ` — ${formatCurrency(r.price_per_night)}/night` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
              Check-in Date
            </label>
            <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
              <CalendarDays size={14} className="text-[#E30613] shrink-0" />
              <input
                type="date"
                value={checkIn}
                min={today}
                onChange={(e) => setCheckIn(e.target.value)}
                className="flex-1 py-3 font-montserrat text-sm outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
              Check-out Date
            </label>
            <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
              <CalendarDays size={14} className="text-[#E30613] shrink-0" />
              <input
                type="date"
                value={checkOut}
                min={checkIn || tomorrow}
                onChange={(e) => setCheckOut(e.target.value)}
                className="flex-1 py-3 font-montserrat text-sm outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Guests */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Adults', value: adults, set: setAdults, max: selectedRoom?.max_adults || 4 },
            { label: 'Children', value: children, set: setChildren, max: selectedRoom?.max_children || 3 },
            { label: 'Extra Beds', value: extraBeds, set: setExtraBeds, max: 2 },
          ].map(({ label, value, set, max }) => (
            <div key={label}>
              <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
                {label}
              </label>
              <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
                <Users size={14} className="text-[#E30613] shrink-0" />
                <select
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="flex-1 py-3 font-montserrat text-sm outline-none bg-white"
                >
                  {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
        {extraBeds > 0 && (
          <p className="text-xs font-montserrat text-gray-400">
            Extra bed: {formatCurrency(EXTRA_BED_PRICE)} per bed per night
          </p>
        )}

        <hr className="border-gray-100" />

        {/* Guest details */}
        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Full Name *
          </label>
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
            <User size={14} className="text-[#E30613] shrink-0" />
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your full name"
              className="flex-1 py-3 font-montserrat text-sm outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Phone / WhatsApp *
          </label>
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
            <Phone size={14} className="text-[#E30613] shrink-0" />
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+92 3xx xxx xxxx"
              className="flex-1 py-3 font-montserrat text-sm outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Email (optional — for confirmation)
          </label>
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
            <Mail size={14} className="text-[#E30613] shrink-0" />
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 py-3 font-montserrat text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Special Requests (optional)
          </label>
          <div className="flex items-start gap-2 border border-gray-200 px-3 pt-3 focus-within:border-[#1A0B2E] transition-colors">
            <MessageSquare size={14} className="text-[#E30613] shrink-0 mt-0.5" />
            <textarea
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder="Late check-in, floor preference, etc."
              rows={3}
              className="flex-1 pb-3 font-montserrat text-sm outline-none resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-montserrat">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="btn-red w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Submitting...' : 'Confirm Booking Request'}
        </button>
        <p className="text-xs font-montserrat text-gray-400 text-center">
          No payment now — we confirm your room via WhatsApp or call
        </p>
      </div>

      {/* Right: Price summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-4">
            Price Summary
          </h2>

          {selectedRoom && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">
                {selectedRoom.name}
              </p>
              {price > 0 && (
                <p className="font-montserrat text-xs text-gray-400">
                  {formatCurrency(price)}/night
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 text-sm font-montserrat">
            {nights > 0 && price > 0 ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {formatCurrency(price)} × {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                  <span className="font-medium text-[#1A0B2E]">{formatCurrency(roomTotal)}</span>
                </div>
                {extraBeds > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Extra beds ({extraBeds} × {formatCurrency(EXTRA_BED_PRICE)} × {nights})
                    </span>
                    <span className="font-medium text-[#1A0B2E]">{formatCurrency(extraBedTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-gray-100 pt-3 mt-3">
                  <span className="text-[#1A0B2E]">Estimated Total</span>
                  <span className="text-[#E30613] text-base">{formatCurrency(grandTotal)}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-xs">Select dates to see price estimate</p>
            )}
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-100 text-xs font-montserrat text-green-700 leading-relaxed">
            ✓ <strong>No payment now</strong> — pay at checkout (Visa, Mastercard, Cash)<br />
            ✓ Confirmation via WhatsApp or call<br />
            ✓ Flexible cancellation
          </div>
        </div>
      </div>
    </form>
  );
}
