'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Search, Building2, CalendarDays, Pencil } from 'lucide-react';
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
  collapsed = false,
}: {
  initialCheckIn: string;
  initialCheckOut: string;
  initialAdults: number;
  initialChildren: number;
  initialCoupon: string;
  /** Dates already chosen (e.g. in the room popup) — on mobile show a
   *  one-line summary with Modify instead of the full search box, so the
   *  selected room is visible without scrolling. Desktop keeps the bar. */
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [checkIn, setCheckIn]   = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [adults, setAdults]     = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [coupon, setCoupon]     = useState(initialCoupon);
  const [open, setOpen]         = useState(!collapsed);

  const apply = () => {
    saveBookingIntent({ checkIn, checkOut, adults, children, coupon: coupon.trim() || undefined });
    const q = new URLSearchParams({
      checkIn, checkOut, adults: String(adults), children: String(children),
    });
    if (coupon.trim()) q.set('coupon', coupon.trim().toUpperCase());
    router.push(`/reservations?${q.toString()}`);
  };

  // Shared field skin: subtle white tint on the deep purple so borders + text
  // pop, with a hairline separator that stays legible in both idle and hover.
  const field = 'min-h-[56px] w-full flex items-center gap-2.5 border border-white/20 bg-white/[0.06] px-3.5 py-2 text-white hover:bg-white/[0.11] hover:border-white/35 focus-within:bg-white/[0.11] focus-within:border-white/50 transition-colors backdrop-blur-md';
  const labelCls = 'text-white/60';
  const valueCls = 'text-white font-semibold';

  const fmt = (ymd: string) =>
    new Date(`${ymd}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <>
    {!open && (
      <div className="lg:hidden flex items-center gap-3 bg-[#1A0B2E] px-4 py-3 text-white shadow-lg">
        <CalendarDays className="size-5 shrink-0 text-white/70" />
        <p className="flex-1 min-w-0 font-montserrat text-sm">
          <span className="font-semibold">{fmt(initialCheckIn)} – {fmt(initialCheckOut)}</span>
          <span className="text-white/70">
            {' · '}{initialAdults} adult{initialAdults !== 1 ? 's' : ''}
            {initialChildren > 0 ? `, ${initialChildren} child${initialChildren !== 1 ? 'ren' : ''}` : ''}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 font-montserrat text-xs font-semibold uppercase tracking-wide text-white underline underline-offset-4"
        >
          <Pencil className="size-3.5" /> Modify
        </button>
      </div>
    )}
    <div className={`${open ? '' : 'hidden lg:block '}bg-gradient-to-br from-[#1A0B2E] via-[#22103d] to-[#1A0B2E] p-4 sm:p-5 shadow-lg ring-1 ring-white/5`}>
      <p className="font-playfair font-bold text-lg text-white mb-3.5 tracking-tight">Reservations</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_1.35fr_1.1fr_1fr_auto]">
        <label className={field}>
          <Building2 className="size-5 shrink-0 text-white/70" />
          <span className="flex flex-col min-w-0 flex-1">
            <span className={`text-[10px] font-montserrat font-semibold tracking-widest uppercase ${labelCls}`}>Property</span>
            <span className={`font-montserrat text-sm truncate ${valueCls}`}>Hotel Elegant, Multan</span>
          </span>
        </label>

        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
          triggerClassName={field}
          labelClassName={labelCls}
          valueClassName={valueCls}
        />

        <OccupancyPicker
          adults={adults}
          children={children}
          maxAdults={6}
          maxChildren={4}
          onChange={(v) => { setAdults(v.adults); setChildren(v.children); }}
          triggerClassName={field}
          labelClassName={labelCls}
          valueClassName={valueCls}
        />

        <label className={field}>
          <Ticket className="size-5 shrink-0 text-[#E30613]" />
          <span className="flex flex-col min-w-0 flex-1">
            <span className={`text-[10px] font-montserrat font-semibold tracking-widest uppercase ${labelCls}`}>Promo Code</span>
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
              placeholder="Optional"
              maxLength={32}
              className="block w-full bg-transparent font-montserrat text-sm font-semibold text-white placeholder:font-normal placeholder:normal-case placeholder:text-white/45 focus:outline-none"
            />
          </span>
        </label>

        <button
          onClick={apply}
          className="min-h-[56px] flex items-center justify-center gap-2 bg-[#E30613] hover:bg-[#c8050f] px-6 text-sm font-montserrat font-semibold text-white shadow-md hover:shadow-lg transition-colors uppercase tracking-wide"
        >
          <Search className="size-4" /> Check Availability
        </button>
      </div>
    </div>
    </>
  );
}
