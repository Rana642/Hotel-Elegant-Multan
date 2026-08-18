'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, Mail, BedDouble, MessageSquare, Ticket, X, Check, Loader2, AlertTriangle, MapPin } from 'lucide-react';
import { Room } from '@/types';
import { formatCurrency, calcNights, calcPricing, getRoomPricing, EXTRA_BED_PRICE } from '@/lib/utils';
import { calculatePricing } from '@/lib/pricing';
import { createBooking, checkAvailability } from '@/app/actions/booking';
import { applyCoupon } from '@/app/actions/coupon';
import { trackEvent } from '@/lib/analytics';
import { readGuestProfile, saveGuestProfile } from '@/lib/guestProfile';
import DateRangePicker from '@/components/DateRangePicker';
import OccupancyPicker from '@/components/OccupancyPicker';
import { saveBookingIntent, readBookingIntent } from '@/lib/bookingIntent';

interface Props {
  rooms: Room[];
  preselectedRoom: Room | null;
  /** Hotel-wide sales tax rate as a whole number percent (e.g. 16 for 16%).
   *  Server is the source of truth — this is only used to render the preview
   *  breakdown on the form; the booking action re-reads the setting when
   *  committing so a rate change is instantly authoritative. */
  taxPercent: number;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialExtraBeds?: number;
  /** Coupon code carried from the hero search / an ad link — pre-applied on
   *  load when valid for the selected room + dates. */
  initialCoupon?: string;
}

export default function BookingForm({
  rooms,
  preselectedRoom,
  taxPercent,
  initialCheckIn,
  initialCheckOut,
  initialAdults = 1,
  initialChildren = 0,
  initialExtraBeds = 0,
  initialCoupon,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [roomId, setRoomId] = useState(preselectedRoom?.id || rooms[0]?.id || '');
  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(initialCheckOut || tomorrow);

  // Debounced Search event — fires only after the guest stops fiddling with
  // dates for ~1s, so we don't spam Meta with an event on every keystroke.
  // Meta's 'Search' is the standard signal for "actively evaluating a
  // purchase", useful for retargeting + audience Lookalikes.
  const searchFiredRef = useRef(false);
  useEffect(() => {
    if (searchFiredRef.current) return; // fire at most once per page mount
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    const t = setTimeout(() => {
      const room = rooms.find((r) => r.id === roomId);
      trackEvent('search_availability', {
        content_ids: room ? [room.id] : [],
        content_name: room?.name,
        content_category: 'Hotel Room',
        currency: 'PKR',
        search_string: `${checkIn} to ${checkOut}`,
        num_adults: 1,
      });
      searchFiredRef.current = true;
    }, 1200);
    return () => clearTimeout(t);
  }, [checkIn, checkOut, roomId, rooms]);

  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [extraBeds, setExtraBeds] = useState(initialExtraBeds);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [error, setError] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  // Guard against wrong-city bookings: guest must tick a checkbox confirming
  // this is for MULTAN. Same hotel brand can appear in other cities, and
  // multi-hotel search results have historically caused Multan bookings to be
  // submitted meant for other cities — leading to no-show cancellations. The
  // banner above + this required checkbox make the location impossible to
  // miss without a real conscious confirmation.
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  // One-shot hydration from the browser-local guest profile (populated on
  // a prior inquiry submit or booking). After first client mount so SSR +
  // first paint stay identical — a beat later the fields snap in. Never
  // clobbers a field the URL/prefill already filled.
  useEffect(() => {
    const profile = readGuestProfile();
    let hydrated = false;
    setGuestName((prev)  => { if (!prev && profile.name)  { hydrated = true; return profile.name;  } return prev; });
    setGuestPhone((prev) => { if (!prev && profile.phone) { hydrated = true; return profile.phone; } return prev; });
    setGuestEmail((prev) => { if (!prev && profile.email) { hydrated = true; return profile.email; } return prev; });
    if (hydrated) setPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coupon state — applied result is what discounts the final total. Guest
  // types code → clicks Apply → server action validates → we show discount
  // preview or error inline. The applied code + discount amount go with
  // the booking submission.
  const [couponCode, setCouponCode] = useState('');
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponPending, setCouponPending] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number; label: string } | null>(null);

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const nights = checkOut > checkIn ? calcNights(checkIn, checkOut) : 0;
  const { original, effective: price, hasOffer, discountPct } = getRoomPricing(
    selectedRoom ?? { price_per_night: 0, offer_price: null }
  );
  const { roomTotal, extraBedTotal } = calcPricing(price, nights, extraBeds);
  const couponDiscount = applied?.discount ?? 0;
  const pricing = calculatePricing({ roomTotal, extraBedTotal, couponDiscount, taxPercent });
  const grandTotal = pricing.total;

  // Proactive availability check — see BookingSection.tsx for the same
  // pattern on the room-detail page. Debounced so switching room/dates
  // doesn't fire a check per keystroke; disables Confirm + shows a warning
  // instead of letting the guest fill the whole form only to be rejected.
  const [soldOut, setSoldOut] = useState(false);
  useEffect(() => {
    if (!roomId || nights < 1) { setSoldOut(false); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      checkAvailability(roomId, checkIn, checkOut)
        .then((result) => { if (!cancelled) setSoldOut(!result.available); })
        .catch(() => { if (!cancelled) setSoldOut(false); }); // fail open — final check still happens at submit
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [roomId, checkIn, checkOut, nights]);

  // Persist booking intent so the site-wide "Continue your booking" prompt can
  // offer to resume if the guest leaves before submitting. Cleared on the
  // thank-you page once a booking actually completes.
  useEffect(() => {
    if (nights < 1) return;
    // Preserve any coupon already carried in the intent (or one the guest just
    // applied) so resuming later keeps the discount.
    const existingCoupon = readBookingIntent()?.coupon;
    saveBookingIntent({ checkIn, checkOut, adults, children, roomId, roomName: selectedRoom?.name, coupon: applied?.code || existingCoupon });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut, adults, children, roomId, nights, applied?.code]);

  // If the room / dates / nights change AFTER a coupon was applied, drop
  // the applied coupon — it might no longer be valid for the new context
  // (min_nights, room whitelist, stay-window). Guest can re-apply.
  useEffect(() => {
    if (applied) {
      setApplied(null);
      setCouponError('Coupon removed because your booking details changed. Re-apply if needed.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, nights]);

  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponPending(true);
    const result = await applyCoupon({
      code: couponCode,
      roomId,
      nights,
      roomTotal,
      checkIn,
    });
    setCouponPending(false);
    if (!result.success) {
      setCouponError(result.error || 'Coupon apply failed.');
      setApplied(null);
      return;
    }
    setApplied({
      code: result.couponCode!,
      discount: result.discount!,
      label: result.discountLabel || 'Discount',
    });
  };

  // One-shot: pre-apply a coupon carried from the hero search (URL ?coupon= or
  // the saved booking intent) once the room + dates are ready, so the discount
  // is validated against the real booking context. Guarded so it never fights
  // the guest if they later change or clear it.
  const autoCouponRef = useRef(false);
  useEffect(() => {
    if (autoCouponRef.current) return;
    const code = (initialCoupon || readBookingIntent()?.coupon || '').trim().toUpperCase();
    if (!code) { autoCouponRef.current = true; return; }
    if (!roomId || nights < 1 || roomTotal <= 0) return; // wait until pricing is ready
    autoCouponRef.current = true;
    setCouponCode(code);
    setCouponOpen(true);
    (async () => {
      setCouponPending(true);
      const result = await applyCoupon({ code, roomId, nights, roomTotal, checkIn });
      setCouponPending(false);
      if (result.success) {
        setApplied({ code: result.couponCode!, discount: result.discount!, label: result.discountLabel || 'Discount' });
        setCouponError('');
      } else {
        setCouponError(result.error || 'Coupon could not be applied to this booking.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCoupon, roomId, nights, roomTotal, checkIn]);

  const clearCoupon = () => {
    setApplied(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomId) { setError('Please select a room.'); return; }
    if (checkOut <= checkIn) { setError('Check-out must be after check-in.'); return; }
    if (soldOut) { setError('This room is sold out for the selected dates. Please choose different dates or another room.'); return; }
    if (!guestName.trim()) { setError('Please enter your name.'); return; }
    if (!guestPhone.trim()) { setError('Please enter your phone / WhatsApp number.'); return; }
    if (!locationConfirmed) { setError('Please confirm this booking is for Multan, Pakistan.'); return; }

    // First-touch attribution: written by <UtmCapture /> on the visitor's
    // very first page in this session. Server validates + persists it with
    // the booking so admin/reports can attribute each booking to its source.
    let attribution: Record<string, string> | undefined;
    try {
      const raw = sessionStorage.getItem('he_ad_attribution');
      if (raw) attribution = JSON.parse(raw) as Record<string, string>;
    } catch {
      /* sessionStorage unavailable or corrupted — non-critical */
    }

    // Save to browser-local profile so this + future forms (contact modal,
    // next booking) auto-fill next time.
    saveGuestProfile({
      name:  guestName.trim(),
      phone: guestPhone.trim(),
      email: guestEmail.trim() || undefined,
    });

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
        attribution,
        couponCode: applied?.code || undefined,
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
      <div className="lg:col-span-2 space-y-6 bg-white p-4 sm:p-6 lg:p-8 border border-gray-100 min-w-0">
        {/* Location banner — appears above every other field so a guest
            who arrived here from a multi-city search cannot miss which
            hotel they're booking. Prevents wrong-city bookings that
            historically caused no-show cancellations. */}
        <div className="flex items-center gap-2 bg-[#1A0B2E]/5 border border-[#1A0B2E]/10 px-3 py-2.5 rounded">
          <MapPin size={16} className="text-[#E30613] shrink-0" />
          <p className="font-montserrat text-xs sm:text-sm text-[#1A0B2E]">
            You are booking <span className="font-semibold">Hotel Elegant Executive Suites</span>,
            <span className="font-semibold"> Multan, Pakistan</span>
          </p>
        </div>

        {/* Room selection */}
        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Room
          </label>
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors min-w-0 w-full">
            <BedDouble size={14} className="text-[#E30613] shrink-0" />
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex-1 min-w-0 w-full py-3 font-montserrat text-sm text-gray-900 outline-none bg-white"
              required
            >
              {rooms.map((r) => {
                const eff = getRoomPricing(r).effective;
                return (
                  <option key={r.id} value={r.id}>
                    {r.name}{eff ? ` — ${formatCurrency(eff)}/night` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Dates
          </label>
          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
            triggerClassName="w-full flex items-center gap-2 border border-gray-200 px-3 py-2 text-left hover:border-[#1A0B2E] transition-colors"
          />
        </div>

        {/* Occupancy */}
        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Occupancy
          </label>
          <OccupancyPicker
            adults={adults}
            children={children}
            extraBeds={extraBeds}
            maxAdults={selectedRoom?.max_adults || 4}
            maxChildren={selectedRoom?.max_children || 3}
            maxExtraBeds={2}
            onChange={(v) => {
              setAdults(v.adults);
              setChildren(v.children);
              if (typeof v.extraBeds === 'number') setExtraBeds(v.extraBeds);
            }}
            triggerClassName="w-full flex items-center gap-2 border border-gray-200 px-3 py-2 text-left hover:border-[#1A0B2E] transition-colors"
          />
        </div>

        <hr className="border-gray-100" />

        {prefilled && (
          <div className="rounded bg-green-50 border border-green-100 px-3 py-2 text-[11px] text-green-700 font-montserrat">
            ✓ Details auto-filled from your last visit. Edit if anything has changed.
          </div>
        )}

        {/* Guest details */}
        <div>
          <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
            Full Name *
          </label>
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors min-w-0 w-full">
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
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors min-w-0 w-full">
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
          <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors min-w-0 w-full">
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

        {/* Coupon — expandable, doesn't clutter the form unless the guest
            has one. Apply/preview is real-time via server action; if the
            room / dates change after apply, the applied coupon is cleared
            (see the useEffect above) so guests can't sneak past constraints. */}
        <div className="border border-gray-100 rounded">
          {applied ? (
            <div className="flex items-center justify-between gap-3 bg-green-50 border-b border-green-100 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Check size={16} className="text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-montserrat font-semibold text-sm text-green-800 truncate">
                    Coupon <span className="font-mono">{applied.code}</span> — {applied.label}
                  </p>
                  <p className="text-xs text-green-700 font-montserrat">
                    You saved {formatCurrency(applied.discount)}
                  </p>
                </div>
              </div>
              <button type="button" onClick={clearCoupon} title="Remove coupon" className="text-gray-500 hover:text-red-600 p-1 shrink-0">
                <X size={16} />
              </button>
            </div>
          ) : couponOpen ? (
            <div className="px-4 py-3 space-y-2">
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-gray-500 font-montserrat">
                Coupon code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="RAMZAN10"
                  className="flex-1 min-w-0 border border-gray-200 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#1A0B2E] rounded"
                  maxLength={32}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponPending || !couponCode || !roomId || nights < 1}
                  className="py-2.5 px-5 bg-[#1A0B2E] text-white text-xs font-montserrat font-semibold uppercase tracking-wider rounded disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {couponPending ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p className="text-xs text-red-600 font-montserrat mt-1">{couponError}</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setCouponOpen(true); setCouponError(''); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-montserrat text-[#1A0B2E] hover:bg-gray-50 rounded transition-colors"
            >
              <Ticket size={16} className="text-[#E30613]" />
              <span className="font-semibold">Have a coupon?</span>
              <span className="text-xs text-gray-500 hidden sm:inline">Enter code to apply a discount</span>
            </button>
          )}
        </div>

        {soldOut && !error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-montserrat">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>This room is sold out for the selected dates. Try different dates, another room, or WhatsApp us for last-minute availability.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-montserrat">
            {error}
          </div>
        )}

        {/* Location confirmation — mandatory tick so the guest actively
            confirms this is the Multan property. Button stays disabled
            until ticked. */}
        <label className="flex items-start gap-3 border border-gray-200 rounded px-3 py-3 cursor-pointer hover:border-[#1A0B2E] transition-colors">
          <input
            type="checkbox"
            checked={locationConfirmed}
            onChange={(e) => setLocationConfirmed(e.target.checked)}
            className="mt-0.5 accent-[#E30613] shrink-0"
          />
          <span className="font-montserrat text-xs sm:text-sm text-gray-700 leading-snug">
            I confirm this booking is for <span className="font-semibold">Hotel Elegant Executive Suites, Multan, Pakistan</span>.
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending || soldOut || !locationConfirmed}
          className="btn-red w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Submitting...' : soldOut ? 'Sold Out for These Dates' : 'Confirm Booking Request'}
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
                <>
                  <p className="font-montserrat text-xs text-gray-400">
                    {hasOffer && (
                      <span className="line-through mr-1">{formatCurrency(original)}</span>
                    )}
                    {formatCurrency(price)}/night
                    {hasOffer && (
                      <span className="ml-1 text-[#E30613] font-semibold">({discountPct}% off)</span>
                    )}
                  </p>
                  {taxPercent > 0 && (
                    <p className="font-montserrat text-[11px] text-gray-400 mt-0.5">
                      + {formatCurrency(Math.round(price * taxPercent / 100))} GST per night
                    </p>
                  )}
                </>
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
                {hasOffer && (
                  <div className="flex justify-between text-green-600">
                    <span>Offer saving ({discountPct}% off)</span>
                    <span className="font-medium">−{formatCurrency((original - price) * nights)}</span>
                  </div>
                )}
                {extraBeds > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Extra beds ({extraBeds} × {formatCurrency(EXTRA_BED_PRICE)} × {nights})
                    </span>
                    <span className="font-medium text-[#1A0B2E]">{formatCurrency(extraBedTotal)}</span>
                  </div>
                )}
                {applied && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon <span className="font-mono">{applied.code}</span></span>
                    <span className="font-medium">−{formatCurrency(applied.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-gray-100 pt-3 mt-3">
                  <span className="text-[#1A0B2E]">Estimated Total</span>
                  <span className="text-[#E30613] text-base">{formatCurrency(grandTotal)}</span>
                </div>
                {pricing.taxPercent > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-gray-200 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>+ {pricing.taxPercent}% GST (Exclusive)</span>
                      <span>+{formatCurrency(pricing.taxAmount)}</span>
                    </div>
                  </div>
                )}
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
