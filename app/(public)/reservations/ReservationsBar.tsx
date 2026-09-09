'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Search, Building2 } from 'lucide-react';
import DateRangePicker from '@/components/DateRangePicker';
import OccupancyPicker from '@/components/OccupancyPicker';
import { saveBookingIntent } from '@/lib/bookingIntent';

/** Top edit bar on the reservations page — mirrors Silver Sand's UX so the
 *  guest can retweak the search without leaving the room list. */
export default function ReservationsBar({
  initialCheckIn,
  initialCheckOut,
  initialAdults,
  initialChildren,
  initialCoupon,
}: {
  initialCheckIn: string;
  initialCheckOut: string;
  initialAdults: number;
  initialChildren: number;
  initialCoupon: string;
}) {
  const router = useRouter();
  const [checkIn, setCheckIn]   = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [adults, setAdults]     = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [coupon, setCoupon]     = useState(initialCoupon);

  const apply = () => {
    saveBookingIntent({ checkIn, checkOut, adults, children, coupon: coupon.trim() || undefined });
    const q = new URLSearchParams({
      checkIn, checkOut, adults: String(adults), children: String(children),
    });
    if (coupon.trim()) q.set('coupon', coupon.trim().toUpperCase());
    router.push(`/reservations?${q.toString()}`);
  };

  const field = 'min-h-[52px] w-full flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-2 text-white hover:bg-white/15 transition-colors backdrop-blur-md';

  return (
    <div className="bg-[#1A0B2E] p-4">
      <p className="font-playfair font-bold text-lg text-white mb-3">Reservations</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_1.3fr_1.1fr_1fr_auto]">
        <label className={field}>
          <Building2 className="size-5 shrink-0 text-white/80" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold tracking-widest uppercase text-white/60">Property</span>
            <span className="block text-sm text-white truncate">Hotel Elegant Mult…</span>
          </span>
        </label>
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
          triggerClassName={field}
        />
        <OccupancyPicker
          adults={adults}
          children={children}
          maxAdults={6}
          maxChildren={4}
          onChange={(v) => { setAdults(v.adults); setChildren(v.children); }}
          triggerClassName={field}
        />
        <label className={field}>
          <Ticket className="size-5 shrink-0 text-[#E30613]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold tracking-widest uppercase text-white/60">Promo Code</span>
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              placeholder="Optional"
              maxLength={32}
              className="block w-full bg-transparent text-sm font-semibold text-white placeholder:font-normal placeholder:normal-case placeholder:text-white/50 focus:outline-none"
            />
          </span>
        </label>
        <button
          onClick={apply}
          className="min-h-[52px] flex items-center justify-center gap-2 bg-white text-[#1A0B2E] px-6 text-sm font-montserrat font-semibold hover:bg-white/90 transition-colors"
        >
          <Search className="size-4" /> Check Availability
        </button>
      </div>
    </div>
  );
}
