import { differenceInDays, format, parseISO } from 'date-fns';

export const EXTRA_BED_PRICE = 2500;
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '923173330998';

export function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'HE-';
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

export function calcNights(checkIn: string, checkOut: string): number {
  return differenceInDays(parseISO(checkOut), parseISO(checkIn));
}

/**
 * Resolve a room's display/charge pricing. When offer_price is set and lower
 * than the regular price, it becomes the effective (charged) price and the
 * regular price is shown struck-through.
 */
export function getRoomPricing(room: {
  price_per_night: number | null;
  offer_price?: number | null;
}) {
  const original = room.price_per_night || 0;
  const offer = room.offer_price ?? null;
  const hasOffer = offer != null && offer > 0 && offer < original;
  const effective = hasOffer ? (offer as number) : original;
  const discountPct = hasOffer ? Math.round((1 - (offer as number) / original) * 100) : 0;
  return { original, offer, effective, hasOffer, discountPct };
}

export function calcPricing(
  pricePerNight: number,
  nights: number,
  extraBeds: number
) {
  const roomTotal = pricePerNight * nights;
  const extraBedTotal = extraBeds * EXTRA_BED_PRICE * nights;
  const grandTotal = roomTotal + extraBedTotal;
  return { roomTotal, extraBedTotal, grandTotal };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd MMM yyyy');
}

/** Format an ISO timestamp as Pakistan Standard Time (Asia/Karachi, UTC+5).
 *  Servers run in UTC on Hostinger; without the explicit timeZone every
 *  admin surface would show the wrong hour to reception in Multan
 *  (5 hours behind wall-clock). Format matches booking-slip style:
 *  '30 Jul 2026, 02:15 PM'. */
export function formatKarachiTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Karachi',
  });
}

/** Compact 'x ago' for freshness at-a-glance on admin lists. Zone-agnostic
 *  (relative difference), but pairs cleanly with formatKarachiTime() when
 *  both are shown together. */
export function timeAgoKarachi(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function buildWhatsAppLink(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function buildBookingWhatsApp(details: {
  bookingRef: string;
  guestName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  grandTotal: number;
}): string {
  const msg = `Hello Hotel Elegant Executive Suites Multan! 🏨

I just submitted a booking request and would like instant confirmation.

📋 *Booking Ref:* ${details.bookingRef}
👤 *Name:* ${details.guestName}
🛏️ *Room:* ${details.roomName}
📅 *Check-in:* ${formatDate(details.checkIn)}
📅 *Check-out:* ${formatDate(details.checkOut)}
🌙 *Nights:* ${details.nights}
👥 *Guests:* ${details.adults} adults${details.children > 0 ? `, ${details.children} children` : ''}
💰 *Estimated Total:* ${formatCurrency(details.grandTotal)} (+ tax at hotel)

Please confirm my reservation. Thank you!`;

  return buildWhatsAppLink(msg);
}
