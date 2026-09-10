import type { Metadata } from 'next';
import { getRooms } from '@/lib/rooms';
import { getHotelTaxPercent } from '@/lib/tax';
import { getRoomPricing } from '@/lib/utils';
import { getActiveDeals, pickDeal, pickNearMissDeal } from '@/lib/deals';
import { pktNow } from '@/lib/lastMinute';
import ReservationsBar from './ReservationsBar';
import ReservationRoomCard, { type RoomCardVM } from './ReservationRoomCard';
import UpcomingDealBanner from './UpcomingDealBanner';

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

// Bed types per room slug — matches what's on Booking.com.
const BED: Record<string, string> = {
  'executive-king': '1 Extra-Large Double Bed',
  'family-suite': '1 King + 1 Single Bed (separate living area)',
  'presidential-suite': '1 King + 1 Sofa Bed (with dining area)',
  'junior-suite': '1 King Bed (seating area)',
  'triple-sharing': '1 Double + 1 Single Bed',
};

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

  const cards: RoomCardVM[] = rooms
    .filter((room) => room.max_adults + room.max_children >= adults + children)
    .map((room) => {
      const { original, effective: normalPrice, hasOffer } = getRoomPricing(room);
      const basePrice = Number(room.price_per_night) || 0;
      const deal = pickDeal(deals, room.id, checkIn, today, nights, nowTime);
      const price = deal ? Math.round(basePrice * (1 - deal.discountPct / 100)) : normalPrice;
      const originalStrike = deal ? basePrice : (hasOffer ? original : null);

      const q = new URLSearchParams({
        roomId: room.id, checkIn, checkOut,
        adults: String(adults), children: String(children),
      });
      if (coupon) q.set('coupon', coupon);

      return {
        id: room.id,
        name: room.name,
        description: room.description || '',
        bed: BED[room.slug] || '',
        maxAdults: room.max_adults,
        maxChildren: room.max_children,
        amenities: room.amenities || [],
        images: (room.room_images || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i) => i.url)
          .slice(0, 8),
        basePrice,
        price,
        originalStrike,
        gstPercent: taxPercent,
        dealName: deal?.name ?? null,
        dealPct: deal?.discountPct ?? 0,
        refundable: deal?.refundable ?? true,
        dealStartTime: deal?.startTime ?? null,
        dealEndTime: deal?.endTime ?? null,
        dealWeekdays: deal?.weekdays ?? [],
        bookHref: `/booking?${q.toString()}`,
      };
    });

  // "Starts in Xh Ym" teaser — only when no room already has a deal LIVE
  // right now (that's already shown inline on the card), but a deal would
  // otherwise qualify once its daily window opens.
  const anyActiveDeal = cards.some((c) => c.dealPct > 0);
  const upcomingDeal = anyActiveDeal
    ? null
    : cards.reduce<ReturnType<typeof pickNearMissDeal>>((found, card) => {
        if (found) return found;
        return pickNearMissDeal(deals, card.id, checkIn, today, nights);
      }, null);

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

        {upcomingDeal && (
          <div className="mt-3">
            <UpcomingDealBanner
              name={upcomingDeal.name}
              discountPct={upcomingDeal.discountPct}
              startTime={upcomingDeal.startTime}
              endTime={upcomingDeal.endTime}
              weekdays={upcomingDeal.weekdays}
            />
          </div>
        )}

        <div className="bg-[#1A0B2E] text-white px-5 py-3 mb-3 mt-6">
          <p className="font-montserrat font-semibold text-sm tracking-wide">
            Select Room{' '}
            <span className="text-white/60 font-normal ml-2">
              ({adults} Adult{adults !== 1 ? 's' : ''}
              {children > 0 ? `, ${children} Child${children !== 1 ? 'ren' : ''}` : ''} · {nights} night{nights !== 1 ? 's' : ''})
            </span>
          </p>
        </div>

        {cards.length === 0 && (
          <div className="bg-white border border-gray-200 p-6 text-center text-sm text-gray-600 font-montserrat">
            No rooms match your search. Please adjust dates or occupancy.
          </div>
        )}

        {cards.map((room) => (
          <ReservationRoomCard key={room.id} room={room} nights={nights} />
        ))}

        <div className="bg-[#1A0B2E] text-white px-5 py-3 mt-6">
          <p className="font-playfair font-semibold text-base">Hotel Elegant Executive Suites, Multan</p>
          <p className="text-white/70 text-xs mt-1">77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan</p>
          <p className="text-white/70 text-xs">0317-333-0998 · info@elegant-suite.com</p>
        </div>
      </div>
    </div>
  );
}
