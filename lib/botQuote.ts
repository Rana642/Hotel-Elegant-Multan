import { createServiceClient } from '@/lib/supabase/server';
import { calcNights, calcPricing, getRoomPricing } from '@/lib/utils';
import { calculatePricing } from '@/lib/pricing';
import { getCombinedTaxPercent } from '@/lib/tax';
import { checkRoomAvailability } from '@/lib/availability';
import { dealForRoomOnDate, applyDeal } from '@/lib/deals';

/**
 * Rooms, availability and the final price for a stay, for the WhatsApp booking bot.
 * Uses the same helpers createBookingCore uses (offer price, promotion deal, extra beds, tax), so the number the bot
 * shows the guest is the number the booking is saved with.
 */

export interface StayQuoteInput {
  checkIn: string; // yyyy-MM-dd
  checkOut: string;
  adults: number;
  children: number;
}

export interface RoomQuote {
  roomId: string;
  name: string;
  maxAdults: number;
  available: boolean;
  /** Why it can't be booked (sold out date, too many adults), when it can't. */
  reason?: string;
  nights: number;
  pricePerNight: number;
  /** Final total the guest pays at the hotel, tax included. */
  grandTotal: number;
  dealName: string | null;
  refundable: boolean;
  /** A promotion that needs a bank-transfer screenshot first. */
  requiresAdvance: boolean;
}

export type StayQuoteResult = { ok: true; nights: number; rooms: RoomQuote[] } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in Pakistan, yyyy-MM-dd. */
function todayKarachi(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
}

export function validateStayDates(checkIn: string, checkOut: string): string | null {
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) return 'Dates must look like 2026-12-05.';
  if (checkIn < todayKarachi()) return 'Check-in can not be in the past.';
  if (checkOut <= checkIn) return 'Check-out must be after check-in.';
  const nights = calcNights(checkIn, checkOut);
  if (nights < 1 || nights > 30) return 'A stay booked on WhatsApp can be 1 to 30 nights.';
  return null;
}

export async function quoteStay(input: StayQuoteInput): Promise<StayQuoteResult> {
  const bad = validateStayDates(input.checkIn, input.checkOut);
  if (bad) return { ok: false, error: bad };
  const adults = Math.max(1, Math.min(8, Math.floor(input.adults) || 1));
  const nights = calcNights(input.checkIn, input.checkOut);

  const supabase = createServiceClient();
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, offer_price, max_adults, is_active')
    .eq('is_active', true)
    .order('price_per_night', { ascending: true });
  if (error || !rooms) return { ok: false, error: 'Could not load the rooms.' };

  const taxPercent = await getCombinedTaxPercent().then((t) => t.combinedPercent);
  const out: RoomQuote[] = [];
  for (const room of rooms) {
    const base = Number(room.price_per_night) || 0;
    let pricePerNight = getRoomPricing(room).effective;
    const deal = base > 0 ? await dealForRoomOnDate(room.id, input.checkIn, nights) : null;
    if (deal) pricePerNight = applyDeal(base, deal);
    const { roomTotal, extraBedTotal } = calcPricing(pricePerNight, nights, 0);
    const pricing = calculatePricing({ roomTotal, extraBedTotal, couponDiscount: 0, taxPercent });

    let available = true;
    let reason: string | undefined;
    if (adults > room.max_adults) {
      available = false;
      reason = `Sleeps up to ${room.max_adults} adults.`;
    } else {
      const a = await checkRoomAvailability(room.id, input.checkIn, input.checkOut);
      if (!a.available) {
        available = false;
        reason = `Fully booked on ${a.soldOutDate}.`;
      }
    }
    out.push({
      roomId: room.id,
      name: room.name,
      maxAdults: room.max_adults,
      available,
      reason,
      nights,
      pricePerNight,
      grandTotal: pricing.total,
      dealName: deal?.name ?? null,
      refundable: deal ? Boolean(deal.refundable) : true,
      requiresAdvance: Boolean(deal && deal.requiresAdvancePayment),
    });
  }
  return { ok: true, nights, rooms: out };
}
