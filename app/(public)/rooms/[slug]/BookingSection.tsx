'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, MessageCircle, AlertTriangle } from 'lucide-react';
import { Room } from '@/types';
import { formatCurrency, calcNights, calcPricing, getRoomPricing, EXTRA_BED_PRICE } from '@/lib/utils';
import { calculatePricing } from '@/lib/pricing';
import { trackEvent } from '@/lib/analytics';
import { checkAvailability } from '@/app/actions/booking';
import ContactIntentButton from '@/app/_components/ContactIntentButton';
import DateRangePicker from '@/components/DateRangePicker';
import OccupancyPicker from '@/components/OccupancyPicker';
import { saveBookingIntent } from '@/lib/bookingIntent';
import { evaluateLastMinute, lastMinutePrice, type LastMinuteConfig } from '@/lib/lastMinute';

interface Props {
  room: Room;
  /** Hotel-wide sales tax rate as a whole-number percent (16 = 16%). Shown
   *  informationally under Est. Total; NOT added to the online total. */
  taxPercent: number;
  /** Last-minute campaign config — evaluated client-side (PKT) for the picked
   *  dates so the deal price shows here too. */
  lastMinuteConfig?: LastMinuteConfig | null;
}

export default function BookingSection({ room, taxPercent, lastMinuteConfig = null }: Props) {
  // Read booking prefill from the URL on the client so the page itself can
  // stay statically cached (server-side searchParams forces dynamic rendering)
  const searchParams = useSearchParams();
  const initialCheckIn = searchParams.get('checkIn') || undefined;
  const initialCheckOut = searchParams.get('checkOut') || undefined;
  const initialAdults = Number(searchParams.get('adults')) || 1;
  const initialChildren = Number(searchParams.get('children')) || 0;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(initialCheckOut || tomorrow);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [extraBeds, setExtraBeds] = useState(0);

  const nights = checkOut > checkIn ? calcNights(checkIn, checkOut) : 0;
  const { original, effective: normalPrice, hasOffer, discountPct } = getRoomPricing(room);

  // Last-minute deal for the picked check-in (judged in Pakistan time).
  const basePrice = Number(room.price_per_night) || 0;
  const lmEval = evaluateLastMinute({ config: lastMinuteConfig, checkIn, roomId: room.id });
  const lmActive = Boolean(lmEval.active && basePrice > 0);
  const price = lmActive ? lastMinutePrice(basePrice, lmEval.discountPercent) : normalPrice;

  const { roomTotal, extraBedTotal } = calcPricing(price, nights, extraBeds);
  const pricing = calculatePricing({ roomTotal, extraBedTotal, couponDiscount: 0, taxPercent });
  const grandTotal = pricing.total;

  // Proactive availability check — debounced so we're not hammering the DB
  // on every keystroke while the guest is still picking dates. Runs the same
  // multi-unit logic the booking submission enforces server-side, just
  // surfaced here so a sold-out date shows BEFORE the guest fills the whole
  // form (was previously a silent trap: price calculated normally, then
  // "fully booked" only appeared after Book Now → full form → submit).
  const [soldOut, setSoldOut] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  useEffect(() => {
    if (nights < 1) { setSoldOut(false); return; }
    let cancelled = false;
    setCheckingAvailability(true);
    const t = setTimeout(() => {
      checkAvailability(room.id, checkIn, checkOut)
        .then((result) => { if (!cancelled) setSoldOut(!result.available); })
        .catch(() => { if (!cancelled) setSoldOut(false); }) // fail open — final check still happens at submit
        .finally(() => { if (!cancelled) setCheckingAvailability(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [room.id, checkIn, checkOut, nights]);

  return (
    <div className="sticky top-24 border border-gray-200 p-6 bg-white shadow-sm">
      <p className="font-playfair font-semibold text-xl text-[#1A0B2E] mb-1">{room.name}</p>
      {price > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {(lmActive || hasOffer) && (
              <span className="font-montserrat text-sm text-gray-400 line-through">
                {formatCurrency(lmActive ? basePrice : original)}
              </span>
            )}
            <p className="font-montserrat text-sm text-gray-500">
              <span className="font-bold text-lg text-[#1A0B2E]">{formatCurrency(price)}</span>/night
            </p>
            {lmActive ? (
              <span className="bg-[#E30613] text-white text-[10px] font-bold px-2 py-0.5 tracking-wide uppercase">
                Last Minute {lmEval.discountPercent}% OFF
              </span>
            ) : hasOffer ? (
              <span className="bg-[#E30613] text-white text-[10px] font-bold px-2 py-0.5 tracking-wide">
                {discountPct}% OFF
              </span>
            ) : null}
          </div>
          {taxPercent > 0 && (
            <p className="font-montserrat text-[11px] text-gray-400 mt-0.5">
              + {formatCurrency(Math.round(price * taxPercent / 100))} GST per night
            </p>
          )}
        </div>
      )}

      {/* Dates + occupancy */}
      <div className="space-y-3 mb-4">
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
          triggerClassName="w-full flex items-center gap-2 border border-gray-200 px-3 py-2.5 text-left hover:border-[#1A0B2E] transition-colors"
        />
        <OccupancyPicker
          adults={adults}
          children={children}
          extraBeds={extraBeds}
          maxAdults={room.max_adults}
          maxChildren={room.max_children}
          maxExtraBeds={2}
          onChange={(v) => {
            setAdults(v.adults);
            setChildren(v.children);
            if (typeof v.extraBeds === 'number') setExtraBeds(v.extraBeds);
          }}
          triggerClassName="w-full flex items-center gap-2 border border-gray-200 px-3 py-2.5 text-left hover:border-[#1A0B2E] transition-colors"
        />
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
          {pricing.taxPercent > 0 && (
            <div className="pt-2 mt-1 border-t border-dashed border-[#1A0B2E]/15">
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>+ {pricing.taxPercent}% GST (Exclusive)</span>
                <span>+{formatCurrency(pricing.taxAmount)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {soldOut && !checkingAvailability && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 mb-3 text-xs font-montserrat">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Sold out for these dates. Try different dates or WhatsApp us — we may have last-minute availability.</span>
        </div>
      )}

      {soldOut ? (
        <button
          type="button"
          disabled
          className="w-full text-center block py-4 bg-gray-200 text-gray-500 font-montserrat font-semibold text-sm tracking-wider uppercase cursor-not-allowed"
        >
          Sold Out
        </button>
      ) : (
        <Link
          href={`/booking?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&extraBeds=${extraBeds}`}
          onClick={() => {
            saveBookingIntent({ checkIn, checkOut, adults, children, roomId: room.id, roomName: room.name });
            trackEvent('book_now_click', { location: 'room_detail', room: room.name });
          }}
          className="btn-red w-full text-center block py-4"
        >
          Book Now
        </Link>
      )}

      {/* Direct contact — Call + WhatsApp. Wrapped in ContactIntentButton so
          we capture the guest's name + intent (and fire a hashed Meta Lead)
          BEFORE handing off to tel:/wa.me. Skip link inside the modal keeps
          the fast path open for anyone who doesn't want the extra field. */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <ContactIntentButton
          channel="call"
          ariaLabel="Call the hotel"
          className="flex items-center justify-center gap-2 py-3 border border-[#1A0B2E] text-[#1A0B2E] font-montserrat font-semibold text-xs tracking-wider uppercase hover:bg-[#1A0B2E] hover:text-white transition-colors"
        >
          <Phone size={14} /> Call
        </ContactIntentButton>
        <ContactIntentButton
          channel="whatsapp"
          ariaLabel="WhatsApp the hotel"
          roomName={room.name}
          className="flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-montserrat font-semibold text-xs tracking-wider uppercase hover:bg-green-600 transition-colors"
        >
          <MessageCircle size={14} /> WhatsApp
        </ContactIntentButton>
      </div>

      <p className="text-xs font-montserrat text-gray-400 text-center mt-3">
        No payment now · Confirm via WhatsApp
      </p>
    </div>
  );
}
