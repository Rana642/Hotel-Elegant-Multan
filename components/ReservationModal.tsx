'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Search, Ticket } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import OccupancyPicker from './OccupancyPicker';
import WhyBookDirect from './WhyBookDirect';
import { saveBookingIntent } from '@/lib/bookingIntent';

function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * "Reservations" popup — glassy modal launched from the header Reservation
 * button. Guest picks Date + Occupancy + optional Promo Code → Book Now →
 * routed to /reservations (room list with per-night rates and the deal
 * engine applied). Same UX pattern Silver Sand uses.
 */
export default function ReservationModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const today = localDate(0);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(localDate(1));
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [promo, setPromo] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function book() {
    saveBookingIntent({ checkIn, checkOut, adults, children, coupon: promo.trim() || undefined });
    const q = new URLSearchParams({
      checkIn, checkOut,
      adults: String(adults), children: String(children),
    });
    if (promo.trim()) q.set('coupon', promo.trim().toUpperCase());
    onClose();
    router.push(`/reservations?${q.toString()}`);
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-16 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl border border-white/20 bg-[#1A0B2E]/70 p-5 shadow-2xl backdrop-blur-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-playfair text-lg font-bold text-white">Reservations</h2>
            <p className="text-xs text-white/70 mt-0.5">
              Best direct rates — no advance payment
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="border border-white/20 bg-white/10 p-1.5 text-white/80 hover:text-white transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.1fr_1fr_0.8fr]">
          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
            triggerClassName="min-h-[52px] w-full flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-2 backdrop-blur-md hover:bg-white/15 transition-colors"
            labelClassName="text-white/70"
            valueClassName="text-white font-semibold"
          />
          <OccupancyPicker
            adults={adults}
            children={children}
            maxAdults={6}
            maxChildren={4}
            onChange={(v) => { setAdults(v.adults); setChildren(v.children); }}
            triggerClassName="min-h-[52px] w-full flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-2 backdrop-blur-md hover:bg-white/15 transition-colors"
            labelClassName="text-white/70"
            valueClassName="text-white font-semibold"
          />
          <label className="flex min-h-[52px] items-center gap-2 border border-white/25 bg-white/10 px-3 py-2 backdrop-blur-md">
            <Ticket className="size-5 shrink-0 text-[#E30613]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold tracking-widest uppercase text-white/70">Promo Code</span>
              <input
                value={promo}
                onChange={(e) => setPromo(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                placeholder="Optional"
                maxLength={32}
                className="block w-full bg-transparent text-sm font-semibold text-white placeholder:font-normal placeholder:normal-case placeholder:text-white/50 focus:outline-none"
              />
            </span>
          </label>
          <button
            onClick={book}
            className="flex min-h-[52px] items-center justify-center gap-2 bg-[#E30613] px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-[#c8050f]"
          >
            <Search className="size-4" /> Book Now
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-3">
          <WhyBookDirect className="inline-flex items-center gap-1.5 text-xs font-medium text-white/85 hover:text-white transition-colors" />
          <Link
            href="/manage-booking"
            onClick={onClose}
            className="text-xs font-semibold text-white/80 underline decoration-white/30 underline-offset-2 hover:text-white"
          >
            Manage Booking
          </Link>
        </div>
      </div>
    </div>
  );
}
