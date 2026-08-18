'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ticket } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import OccupancyPicker from './OccupancyPicker';
import WhyBookDirect from './WhyBookDirect';
import { saveBookingIntent } from '@/lib/bookingIntent';

interface Props {
  className?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
}

export default function BookingSearchBar({
  className = '',
  initialCheckIn = '',
  initialCheckOut = '',
  initialAdults = 1,
  initialChildren = 0,
}: Props) {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(initialCheckOut || tomorrow);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [coupon, setCoupon] = useState('');
  const [error, setError] = useState('');

  // Seed the booking intent from the current search so the "Continue your
  // booking" prompt surfaces right away (matching the reference) and keeps in
  // step as the guest tweaks dates / occupancy / coupon. saveBookingIntent
  // no-ops on an invalid range; the prompt is dismissible and clears once a
  // booking completes, so this is a nudge, not a nag.
  useEffect(() => {
    saveBookingIntent({ checkIn, checkOut, adults, children, coupon: coupon.trim() || undefined });
  }, [checkIn, checkOut, adults, children, coupon]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkOut <= checkIn) {
      setError('Please pick your dates');
      return;
    }
    setError('');
    saveBookingIntent({ checkIn, checkOut, adults, children, coupon: coupon.trim() || undefined });
    const qs = new URLSearchParams({ checkIn, checkOut, adults: String(adults), children: String(children) });
    if (coupon.trim()) qs.set('coupon', coupon.trim().toUpperCase());
    router.push(`/rooms?${qs.toString()}`);
  };

  // White translucent field to match the hero's frosted bar; on /rooms it sits
  // on a light panel and still reads fine.
  const field = 'flex items-center gap-2 bg-white/95 backdrop-blur px-4 py-3 text-left min-w-0';

  return (
    <form onSubmit={handleSearch} className={`${className}`}>
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2 md:p-1.5 flex flex-col md:flex-row gap-0.5">
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
          className="flex-1 min-w-0"
          triggerClassName={`w-full flex-1 ${field}`}
        />
        <OccupancyPicker
          adults={adults}
          children={children}
          maxAdults={4}
          maxChildren={3}
          onChange={(v) => { setAdults(v.adults); setChildren(v.children); }}
          className="md:w-52 min-w-0"
          triggerClassName={`w-full flex-1 ${field}`}
        />
        {/* Coupon code (optional) */}
        <label className={`md:w-44 ${field}`}>
          <Ticket size={16} className="text-[#E30613] shrink-0" />
          <span className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-montserrat font-semibold tracking-widest uppercase text-gray-500">
              Coupon Code
            </span>
            <input
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              placeholder="Optional"
              maxLength={32}
              className="font-montserrat text-sm text-gray-900 bg-transparent outline-none w-full placeholder:text-gray-400 placeholder:normal-case"
            />
          </span>
        </label>
        <button
          type="submit"
          className="btn-red flex items-center justify-center gap-2 md:px-8 py-4 md:py-3 text-xs"
        >
          Book Now
        </button>
      </div>

      {error && (
        <p className="text-red-300 text-xs font-montserrat mt-1 text-center drop-shadow">{error}</p>
      )}

      {/* Trust + utility links, matching the reference: benefits popover on the
          left, self-service booking lookup on the right. */}
      <div className="flex items-center justify-between mt-2.5 px-1">
        <WhyBookDirect className="inline-flex items-center gap-1.5 text-xs font-montserrat font-medium text-white/85 hover:text-white drop-shadow transition-colors" />
        <Link
          href="/manage-booking"
          className="text-xs font-montserrat font-medium text-white/85 hover:text-white underline underline-offset-2 decoration-white/40 drop-shadow transition-colors"
        >
          Manage Booking
        </Link>
      </div>
    </form>
  );
}
