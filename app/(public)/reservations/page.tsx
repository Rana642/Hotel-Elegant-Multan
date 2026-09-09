import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Users, BedDouble, Wifi, Car, Coffee, Clock, Info } from 'lucide-react';
import { getRooms } from '@/lib/rooms';
import { getHotelTaxPercent } from '@/lib/tax';
import { formatCurrency, getRoomPricing } from '@/lib/utils';
import { getActiveDeals, pickDeal } from '@/lib/deals';
import { pktNow } from '@/lib/lastMinute';
import ReservationsBar from './ReservationsBar';

export const metadata: Metadata = {
  title: { absolute: 'Book Your Stay — Hotel Elegant Executive Suites Multan' },
  description: 'Check room availability and best direct rates at Hotel Elegant Executive Suites, Multan. Pay at hotel, WhatsApp confirmation, free WiFi & parking.',
  alternates: { canonical: '/reservations' },
};

export const dynamic = 'force-dynamic';

interface SP {
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
  coupon?: string;
}

function isYmd(s?: string) { return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function nightsBetween(a: string, b: string) {
  return Math.max(1, Math.round((+new Date(b + 'T00:00:00Z') - +new Date(a + 'T00:00:00Z')) / 86400000));
}
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const clock = pktNow();
  const today = clock.today;
  const nowTime = `${String(clock.hour).padStart(2, '0')}:00`;

  const checkIn  = isYmd(sp.checkIn)  && sp.checkIn!  >= today   ? sp.checkIn!  : today;
  const checkOut = isYmd(sp.checkOut) && sp.checkOut! >  checkIn ? sp.checkOut! : addDays(checkIn, 1);
  const adults   = Math.max(1, Number(sp.adults)   || 1);
  const children = Math.max(0, Number(sp.children) || 0);
  const coupon   = (sp.coupon || '').trim();
  const nights   = nightsBetween(checkIn, checkOut);

  const [rooms, taxPercent, deals] = await Promise.all([
    getRooms(),
    getHotelTaxPercent(),
    getActiveDeals(),
  ]);

  const bookHref = (roomId: string) => {
    const q = new URLSearchParams({
      roomId, checkIn, checkOut, adults: String(adults), children: String(children),
    });
    if (coupon) q.set('coupon', coupon);
    return `/booking?${q.toString()}`;
  };

  return (
    <div className="pt-24 pb-16 bg-[#1A0B2E]/[0.03] min-h-screen">
      <div className="container-xl max-w-5xl">
        <ReservationsBar
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialAdults={adults}
          initialChildren={children}
          initialCoupon={coupon}
        />

        <div className="bg-[#1A0B2E] text-white px-5 py-3 mb-3 mt-6">
          <p className="font-montserrat font-semibold text-sm tracking-wide">
            Select Room <span className="text-white/60 font-normal ml-2">({adults} Adult{adults !== 1 ? 's' : ''}{children > 0 ? `, ${children} Child${children !== 1 ? 'ren' : ''}` : ''} · {nights} night{nights !== 1 ? 's' : ''})</span>
          </p>
        </div>

        {rooms.map((room) => {
          const capacity = room.max_adults + room.max_children;
          if (capacity < adults + children) return null;
          const { original, effective: normalPrice, hasOffer, discountPct } = getRoomPricing(room);
          const basePrice = Number(room.price_per_night) || 0;
          const deal = pickDeal(deals, room.id, checkIn, today, nights, nowTime);
          const price = deal ? Math.round(basePrice * (1 - deal.discountPct / 100)) : normalPrice;
          const finalOriginal = deal ? basePrice : (hasOffer ? original : basePrice);
          const showStrike = deal ? true : hasOffer;
          const savePct = deal ? deal.discountPct : (hasOffer ? discountPct : 0);
          const gst = Math.round(price * taxPercent / 100);
          const dealName = deal?.name || null;
          const nonRefundable = deal && !deal.refundable;
          const featured = room.room_images?.find((i) => i.is_featured) || room.room_images?.[0];

          return (
            <div key={room.id} className="bg-white border border-gray-200 mb-4 overflow-hidden">
              {/* Room header row */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-100">
                <div className="relative w-full sm:w-48 aspect-[4/3] shrink-0 bg-gray-100">
                  {featured?.url && (
                    <Image
                      src={featured.url}
                      alt={featured.alt || room.name}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="font-playfair font-bold text-xl text-[#1A0B2E]">{room.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-montserrat">
                      <span className="inline-flex items-center gap-1"><Users size={13} /> {room.max_adults} Adults{room.max_children ? ` + ${room.max_children}` : ''}</span>
                      {(room.amenities?.length ?? 0) > 0 && <span className="inline-flex items-center gap-1"><BedDouble size={13} /> {room.amenities[0]}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {savePct > 0 && showStrike && (
                      <p className="text-xs text-gray-400 line-through">{formatCurrency(finalOriginal)}</p>
                    )}
                    <p className="text-xs text-gray-500">From <span className="font-bold text-lg text-[#1A0B2E]">{formatCurrency(price)}</span>/night</p>
                    {taxPercent > 0 && <p className="text-[11px] text-gray-400">+ {taxPercent}% GST</p>}
                    <p className="text-[11px] text-gray-500 mt-1">Total <span className="font-semibold text-[#1A0B2E]">{formatCurrency(price * nights)}</span> for {nights} night{nights !== 1 ? 's' : ''} + tax</p>
                  </div>
                </div>
              </div>

              {/* Rate card */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[250px]">
                    <p className="font-montserrat font-semibold text-sm text-[#1A0B2E]">
                      {dealName ? dealName : 'Best Available Rate'}
                      {savePct > 0 && <span className="ml-2 inline-block bg-[#E30613] text-white text-[10px] font-bold px-2 py-0.5">{savePct}% OFF</span>}
                    </p>
                    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 font-montserrat">
                      <li className="flex items-center gap-1.5"><BedDouble size={13} className="text-[#E30613]" /> {nonRefundable ? 'Advance payment required' : 'Book Now, Pay at Hotel'}</li>
                      <li className="flex items-center gap-1.5"><Clock size={13} className="text-[#E30613]" /> Early Check-in & Check-out (subject to availability)</li>
                      <li className="flex items-center gap-1.5"><Coffee size={13} className="text-[#E30613]" /> Free breakfast</li>
                      <li className="flex items-center gap-1.5"><Car size={13} className="text-[#E30613]" /> Free Parking Available</li>
                      <li className="flex items-center gap-1.5"><Wifi size={13} className="text-[#E30613]" /> Free Wi-Fi</li>
                    </ul>
                    <p className="text-[11px] text-gray-500 mt-2">
                      {nonRefundable ? (
                        <span className="inline-flex items-center gap-1 text-[#E30613] font-semibold"><Info size={12} /> Non-Refundable</span>
                      ) : (
                        <>Best direct rate — no payment now, pay when you arrive.</>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="mb-2">
                      {savePct > 0 && showStrike && <p className="text-xs text-gray-400 line-through">{formatCurrency(finalOriginal)}</p>}
                      <p className="text-lg font-bold text-[#1A0B2E]">{formatCurrency(price)}<span className="text-xs font-normal text-gray-500">/night</span></p>
                      <p className="text-[11px] text-gray-500">Total {formatCurrency(price * nights)} for {nights} night{nights !== 1 ? 's' : ''}</p>
                    </div>
                    <Link
                      href={bookHref(room.id)}
                      className="inline-block bg-[#1A0B2E] hover:bg-[#2a1247] text-white text-xs font-montserrat font-semibold uppercase tracking-wider px-6 py-2.5 transition-colors"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="bg-[#1A0B2E] text-white px-5 py-3 mt-6">
          <p className="font-playfair font-semibold text-base">Hotel Elegant Executive Suites, Multan</p>
          <p className="text-white/70 text-xs mt-1">77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan</p>
          <p className="text-white/70 text-xs">0317-333-0998 · info@elegant-suite.com</p>
        </div>
      </div>
    </div>
  );
}
