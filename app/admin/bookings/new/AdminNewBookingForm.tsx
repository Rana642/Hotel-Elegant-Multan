'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking } from '@/app/actions/booking';
import { formatCurrency, calcNights, calcPricing, EXTRA_BED_PRICE } from '@/lib/utils';

interface Room { id: string; name: string; price_per_night: number | null; max_adults: number; max_children: number; }
interface Props { rooms: Room[]; }

export default function AdminNewBookingForm({ rooms }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [extraBeds, setExtraBeds] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const nights = checkOut > checkIn ? calcNights(checkIn, checkOut) : 0;
  const price = selectedRoom?.price_per_night || 0;
  const { roomTotal, extraBedTotal, grandTotal } = calcPricing(price, nights, extraBeds);

  const inputClass = 'w-full border border-gray-200 px-4 py-2.5 font-montserrat text-sm outline-none focus:border-[#1A0B2E] transition-colors';
  const labelClass = 'block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-1.5';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await createBooking({ roomId, checkIn, checkOut, adults, children, extraBeds, guestName, guestPhone, guestEmail, specialRequest });
      if (result.success && result.bookingId) {
        router.push(`/admin/bookings/${result.bookingId}`);
      } else {
        setError(result.error || 'Failed to create booking.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8 max-w-4xl">
      <div className="lg:col-span-2 bg-white border border-gray-100 p-7 space-y-5">
        <div>
          <label className={labelClass}>Room</label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass}>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}{r.price_per_night ? ` — ${formatCurrency(r.price_per_night)}/night` : ''}</option>)}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Check-in</label><input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} required /></div>
          <div><label className={labelClass}>Check-out</label><input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} required /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Adults', value: adults, set: setAdults, max: selectedRoom?.max_adults || 4 },
            { label: 'Children', value: children, set: setChildren, max: selectedRoom?.max_children || 3 },
            { label: 'Extra Beds', value: extraBeds, set: setExtraBeds, max: 2 },
          ].map(({ label, value, set, max }) => (
            <div key={label}>
              <label className={labelClass}>{label}</label>
              <select value={value} onChange={(e) => set(Number(e.target.value))} className={inputClass}>
                {Array.from({ length: max + 1 }, (_, i) => i).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          ))}
        </div>
        <hr className="border-gray-100" />
        <div><label className={labelClass}>Guest Name *</label><input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClass} required /></div>
        <div><label className={labelClass}>Phone *</label><input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className={inputClass} required /></div>
        <div><label className={labelClass}>Email</label><input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Notes</label><textarea value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} rows={3} className={`${inputClass} resize-none`} /></div>
        {error && <p className="text-red-600 text-sm font-montserrat bg-red-50 border border-red-200 px-4 py-3">{error}</p>}
        <button type="submit" disabled={isPending} className="btn-red w-full py-3 disabled:opacity-50">
          {isPending ? 'Creating Booking...' : 'Create Walk-in Booking'}
        </button>
      </div>
      <div className="bg-white border border-gray-100 p-5 h-fit">
        <h2 className="font-montserrat font-semibold text-sm uppercase tracking-wide text-[#1A0B2E] mb-4">Summary</h2>
        {nights > 0 && price > 0 ? (
          <div className="space-y-2 text-sm font-montserrat">
            <div className="flex justify-between"><span className="text-gray-500">{formatCurrency(price)} × {nights} nights</span><span className="text-[#1A0B2E]">{formatCurrency(roomTotal)}</span></div>
            {extraBeds > 0 && <div className="flex justify-between"><span className="text-gray-500">Extra beds</span><span className="text-[#1A0B2E]">{formatCurrency(extraBedTotal)}</span></div>}
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span className="text-[#E30613]">{formatCurrency(grandTotal)}</span></div>
          </div>
        ) : <p className="text-gray-400 text-xs font-montserrat">Select dates to see estimate</p>}
      </div>
    </form>
  );
}
