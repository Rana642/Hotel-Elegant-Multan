'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Users, Search } from 'lucide-react';

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
      setError('Check-out must be after check-in');
      return;
    }
    setError('');
    router.push(
      `/rooms?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`
    );
  };

  return (
    <form onSubmit={handleSearch} className={`${className}`}>
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2 md:p-1.5 flex flex-col md:flex-row gap-0.5">
        {/* Check-in */}
        <label className="flex-1 flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-3 group">
          <CalendarDays size={16} className="text-[#E30613] shrink-0" />
          <div className="flex flex-col flex-1">
            <span className="text-[10px] font-montserrat font-semibold tracking-widest uppercase text-gray-500">
              Check-in
            </span>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="font-montserrat text-sm text-gray-900 bg-transparent outline-none w-full"
              required
            />
          </div>
        </label>

        {/* Check-out */}
        <label className="flex-1 flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-3">
          <CalendarDays size={16} className="text-[#E30613] shrink-0" />
          <div className="flex flex-col flex-1">
            <span className="text-[10px] font-montserrat font-semibold tracking-widest uppercase text-gray-500">
              Check-out
            </span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || tomorrow}
              onChange={(e) => setCheckOut(e.target.value)}
              className="font-montserrat text-sm text-gray-900 bg-transparent outline-none w-full"
              required
            />
          </div>
        </label>

        {/* Guests */}
        <div className="flex gap-0.5">
          <label className="w-24 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-3">
            <Users size={16} className="text-[#E30613] shrink-0" />
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-montserrat font-semibold tracking-widest uppercase text-gray-500">
                Adults
              </span>
              <select
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="font-montserrat text-sm text-gray-900 bg-transparent outline-none"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="w-24 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-3">
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-montserrat font-semibold tracking-widest uppercase text-gray-500">
                Children
              </span>
              <select
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="font-montserrat text-sm text-gray-900 bg-transparent outline-none"
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="btn-red flex items-center justify-center gap-2 md:px-8 py-4 md:py-3 text-xs"
        >
          <Search size={15} />
          <span className="hidden sm:inline">Search</span>
          <span className="sm:hidden">Check Availability</span>
        </button>
      </div>
      {error && (
        <p className="text-red-300 text-xs font-montserrat mt-1 text-center">{error}</p>
      )}
    </form>
  );
}
