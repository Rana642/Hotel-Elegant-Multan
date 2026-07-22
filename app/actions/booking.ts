'use server';

import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { generateBookingRef, calcNights, calcPricing, getRoomPricing } from '@/lib/utils';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { addDays, parseISO, format, eachDayOfInterval } from 'date-fns';

interface BookingInput {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  extraBeds: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequest: string;
}

interface BookingResult {
  success: boolean;
  bookingRef?: string;
  bookingId?: string;
  error?: string;
}

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  // Two-tier rate limit per IP: a burst window blunts form-spam bots, a wider
  // sustained window catches slower drip-flooding. Each real booking runs
  // several DB writes; without this, spam can pin the process pool and 503 the
  // host (which is what happened on 2026-07-22).
  const ip = getClientIp(await headers());
  const burst = rateLimit(`booking:burst:${ip}`, 5, 60_000);
  if (!burst.allowed) {
    return {
      success: false,
      error: `Too many booking attempts. Please wait ${burst.retryAfter}s and try again, or contact us on WhatsApp.`,
    };
  }
  const sustained = rateLimit(`booking:sustained:${ip}`, 20, 60 * 60_000);
  if (!sustained.allowed) {
    return {
      success: false,
      error: 'Too many booking attempts today. Please contact us on WhatsApp to book — we reply immediately.',
    };
  }

  const supabase = createServiceClient();

  // Validate dates
  if (input.checkOut <= input.checkIn) {
    return { success: false, error: 'Check-out must be after check-in.' };
  }

  const nights = calcNights(input.checkIn, input.checkOut);
  if (nights < 1 || nights > 90) {
    return { success: false, error: 'Stay must be between 1 and 90 nights.' };
  }

  // Get room + price (server-side, never trust client)
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, name, price_per_night, offer_price, max_adults, max_children, is_active')
    .eq('id', input.roomId)
    .single();

  if (roomError || !room) {
    return { success: false, error: 'Room not found.' };
  }
  if (!room.is_active) {
    return { success: false, error: 'This room is no longer available.' };
  }
  if (input.adults > room.max_adults) {
    return { success: false, error: `This room accommodates max ${room.max_adults} adults.` };
  }

  // Charge the offer price when one is active (never trust client-sent prices)
  const { effective: pricePerNight } = getRoomPricing(room);
  const { roomTotal, extraBedTotal, grandTotal } = calcPricing(pricePerNight, nights, input.extraBeds);

  // ── AVAILABILITY CHECK (atomic) ──────────────────────────────────────
  // Get all dates in range [checkIn, checkOut) — checkOut night is NOT occupied
  const dates = eachDayOfInterval({
    start: parseISO(input.checkIn),
    end: addDays(parseISO(input.checkOut), -1),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  const { data: existing } = await supabase
    .from('availability_blocks')
    .select('date')
    .eq('room_id', input.roomId)
    .in('date', dates);

  if (existing && existing.length > 0) {
    return {
      success: false,
      error: `Sorry, this room is already booked for some of those dates (${existing[0].date}). Please choose different dates or another room.`,
    };
  }

  // ── CREATE BOOKING ───────────────────────────────────────────────────
  const bookingRef = generateBookingRef();

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_ref: bookingRef,
      room_id: input.roomId,
      guest_name: input.guestName,
      guest_phone: input.guestPhone,
      guest_email: input.guestEmail || null,
      check_in: input.checkIn,
      check_out: input.checkOut,
      adults: input.adults,
      children: input.children,
      extra_beds: input.extraBeds,
      nights,
      room_total: roomTotal,
      extra_bed_total: extraBedTotal,
      grand_total: grandTotal,
      special_request: input.specialRequest || null,
      status: 'pending',
      source: 'website',
    })
    .select('id')
    .single();

  if (bookingError || !booking) {
    return { success: false, error: 'Failed to create booking. Please try again.' };
  }

  // ── BLOCK AVAILABILITY DATES ─────────────────────────────────────────
  const blocks = dates.map((date) => ({
    room_id: input.roomId,
    date,
    reason: 'booking' as const,
    booking_id: booking.id,
  }));

  const { error: blockError } = await supabase.from('availability_blocks').insert(blocks);

  if (blockError) {
    // If blocking fails, cancel the booking
    await supabase.from('bookings').delete().eq('id', booking.id);
    return { success: false, error: 'Double-booking detected. Please try again.' };
  }

  // ── SEND NOTIFICATIONS ───────────────────────────────────────────────
  await sendNotifications({
    bookingRef,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    roomName: room.name,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    adults: input.adults,
    children: input.children,
    grandTotal,
    extraBeds: input.extraBeds,
  });

  return { success: true, bookingRef, bookingId: booking.id };
}

async function sendNotifications(details: {
  bookingRef: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  grandTotal: number;
  extraBeds: number;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return; // Degrade gracefully

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);

    const formatD = (d: string) =>
      new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatPKR = (n: number) =>
      new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

    const guestHtml = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1A0B2E;font-size:24px">Booking Request Received</h2>
  <p style="color:#666">Dear ${details.guestName},</p>
  <p style="color:#666">Thank you for choosing Hotel Elegant Executive Suites. We have received your booking request and will confirm via WhatsApp or phone shortly.</p>

  <div style="background:rgba(26,11,46,0.05);padding:20px;margin:24px 0;border-left:4px solid #E30613">
    <table style="width:100%;font-size:14px;color:#333">
      <tr><td style="padding:4px 0;color:#666">Booking Ref</td><td style="font-weight:bold">${details.bookingRef}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Room</td><td>${details.roomName}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Check-in</td><td>${formatD(details.checkIn)}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Check-out</td><td>${formatD(details.checkOut)}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Nights</td><td>${details.nights}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Guests</td><td>${details.adults} adults${details.children > 0 ? `, ${details.children} children` : ''}${details.extraBeds > 0 ? `, ${details.extraBeds} extra bed(s)` : ''}</td></tr>
      <tr><td style="padding:4px 0;color:#666;font-weight:bold">Est. Total</td><td style="font-weight:bold;color:#E30613">${formatPKR(details.grandTotal)}</td></tr>
    </table>
  </div>

  <p style="color:#666"><strong>No payment has been taken.</strong> You pay at the hotel on checkout.</p>
  <p style="color:#666">Need instant confirmation? <a href="https://wa.me/923173330998" style="color:#25D366">WhatsApp us on +92 317 333 0998</a></p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:12px">Hotel Elegant Executive Suites · 77-A Gulgasht Colony, Multan, Punjab 60750 · info@elegant-suite.com</p>
</div>`;

    const adminHtml = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#E30613">New Booking Request — ${details.bookingRef}</h2>
  <table style="width:100%;font-size:14px;color:#333">
    <tr><td><b>Guest</b></td><td>${details.guestName}</td></tr>
    <tr><td><b>Phone</b></td><td>${details.guestPhone}</td></tr>
    <tr><td><b>Email</b></td><td>${details.guestEmail || '—'}</td></tr>
    <tr><td><b>Room</b></td><td>${details.roomName}</td></tr>
    <tr><td><b>Check-in</b></td><td>${formatD(details.checkIn)}</td></tr>
    <tr><td><b>Check-out</b></td><td>${formatD(details.checkOut)}</td></tr>
    <tr><td><b>Nights</b></td><td>${details.nights}</td></tr>
    <tr><td><b>Guests</b></td><td>${details.adults} adults${details.children > 0 ? `, ${details.children} children` : ''}${details.extraBeds > 0 ? `, ${details.extraBeds} extra bed(s)` : ''}</td></tr>
    <tr><td><b>Est. Total</b></td><td><b style="color:#E30613">${formatPKR(details.grandTotal)}</b></td></tr>
  </table>
  <p>Login to the admin dashboard to confirm or manage this booking.</p>
</div>`;

    await Promise.all([
      details.guestEmail
        ? resend.emails.send({
            from: 'Hotel Elegant <noreply@elegant-suite.com>',
            to: details.guestEmail,
            subject: `Booking Request Received — Ref: ${details.bookingRef}`,
            html: guestHtml,
          })
        : Promise.resolve(),
      resend.emails.send({
        from: 'Hotel Elegant Bookings <noreply@elegant-suite.com>',
        to: process.env.HOTEL_NOTIFICATION_EMAIL || 'info@elegant-suite.com',
        subject: `New Booking — ${details.bookingRef} · ${details.roomName}`,
        html: adminHtml,
      }),
    ]);
  } catch {
    // Email failure is non-fatal — booking is already saved
  }
}
