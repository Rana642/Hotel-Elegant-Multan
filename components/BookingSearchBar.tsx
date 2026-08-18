'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DateRangePicker from './DateRangePicker';
import OccupancyPicker from './OccupancyPicker';
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
  const [error, setError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkOut <= checkIn) {
      setError('Please pick your dates');
      return;
    }
    setError('');
    // Remember the intent so the "Continue your booking" prompt can offer to
    // resume if the guest wanders off before finishing.
    saveBookingIntent({ checkIn, checkOut, adults, children });
    router.push(
      `/rooms?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`
    );
  };

  // White translucent field to match the hero's frosted bar; on /rooms it sits
  // on a light panel and still reads fine.
  const field = 'flex-1 flex items-center gap-2 bg-white/95 backdrop-blur px-4 py-3 text-left min-w-0';

  return (
    <form onSubmit={handleSearch} className={`${className}`}>
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2 md:p-1.5 flex flex-col md:flex-row gap-0.5">
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
          className="flex-1 min-w-0"
          triggerClassName={`w-full ${field}`}
        />
        <OccupancyPicker
          adults={adults}
          children={children}
          maxAdults={4}
          maxChildren={3}
          onChange={(v) => { setAdults(v.adults); setChildren(v.children); }}
          className="md:w-60 min-w-0"
          triggerClassName={`w-full ${field}`}
        />
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
    </form>
  );
}
