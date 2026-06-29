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
💰 *Estimated Total:* ${formatCurrency(details.grandTotal)}

Please confirm my reservation. Thank you!`;

  return buildWhatsAppLink(msg);
}
