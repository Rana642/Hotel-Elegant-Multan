'use server';

import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { generateBookingRef, calcNights, calcPricing, getRoomPricing } from '@/lib/utils';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { addDays, parseISO, format, eachDayOfInterval } from 'date-fns';
import { resolveNotificationEmail } from '@/lib/emailNotify';
import { validateCoupon, normalizeCouponCode, type CouponRow } from '@/lib/coupon';
import { calculatePricing } from '@/lib/pricing';
import { getHotelTaxPercent } from '@/lib/tax';
import { checkRoomAvailability } from '@/lib/availability';
import { getLastMinuteConfig } from '@/lib/lastMinuteConfig';
import { evaluateLastMinute, lastMinutePrice } from '@/lib/lastMinute';

// Sentinel stored in bookings.coupon_code when a last-minute rate was used —
// avoids a schema change while still flagging the booking as the special
// non-refundable, advance-payment rate for admin + emails. (Not exported —
// a "use server" module may only export async functions.)
const LAST_MINUTE_MARKER = 'LAST-MINUTE';

/**
 * Lightweight client-facing availability check — same logic the booking
 * submission enforces, exposed so the room-detail sidebar and the full
 * booking form can warn the guest BEFORE they fill in every field, instead
 * of only finding out "fully booked" after hitting submit.
 */
export async function checkAvailability(roomId: string, checkIn: string, checkOut: string) {
  return checkRoomAvailability(roomId, checkIn, checkOut);
}

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
  /** First-touch attribution from sessionStorage. Any field may be missing. */
  attribution?: Record<string, string>;
  /** Where the booking was recorded from. Public form always leaves this as
   *  the default 'website'; admin manual-entry form passes 'phone'/'walkin'/
   *  'ota' to reflect how the guest actually contacted the hotel. */
  source?: 'website' | 'phone' | 'walkin' | 'ota';
  /** Optional coupon code the guest applied on the booking form. Re-validated
   *  server-side; failed validation just proceeds without a discount rather
   *  than blocking the booking (defensive UX — never lose a booking to a
   *  coupon edge case). */
  couponCode?: string;
  /** Set true when the guest ticked the Last-Minute Offer terms. Required
   *  server-side before a last-minute (non-refundable, advance-payment) rate
   *  can be committed. */
  lastMinuteAgreed?: boolean;
}

// Bounded set of attribution fields we persist — everything else in the input
// is ignored. Prevents anyone crafting a request with 100 junk fields.
// ga_client_id feeds the completion-time GA4 Measurement Protocol call (see
// app/actions/ga4.ts) — without it, that server-side event can't be linked
// back to the guest's original ad-click session.
const ATTRIBUTION_FIELDS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'referrer', 'landing_path', 'ga_client_id',
] as const;

/** Cap each value at 200 chars and coerce to string; drop anything else. */
function sanitizeAttribution(input: Record<string, string> | undefined): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of ATTRIBUTION_FIELDS) {
    const raw = input?.[key];
    out[key] = typeof raw === 'string' && raw.length > 0 ? raw.slice(0, 200) : null;
  }
  return out;
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

  // Get room + price (server-side, never trust client). Try with the new
  // total_units column first; fall back gracefully if the multi-unit
  // migration hasn't been applied yet — booking still works, just in the
  // legacy single-unit mode.
  interface RoomRow {
    id: string; name: string;
    price_per_night: number | null; offer_price: number | null;
    max_adults: number; max_children: number;
    is_active: boolean; total_units?: number;
  }
  let room: RoomRow | null = null;
  let roomError: unknown = null;
  const withUnits = await supabase
    .from('rooms')
    .select('id, name, price_per_night, offer_price, max_adults, max_children, is_active, total_units')
    .eq('id', input.roomId)
    .single();
  if (withUnits.data) {
    room = withUnits.data as RoomRow;
  } else {
    const fallback = await supabase
      .from('rooms')
      .select('id, name, price_per_night, offer_price, max_adults, max_children, is_active')
      .eq('id', input.roomId)
      .single();
    room = fallback.data as RoomRow | null;
    roomError = fallback.error;
  }

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
  const basePrice = Number(room.price_per_night) || 0;
  let pricePerNight = getRoomPricing(room).effective;

  // ── LAST-MINUTE DEAL (server-authoritative, judged in Pakistan time) ──
  // If the deal window is open for this room + check-in, it overrides normal
  // pricing (discount off the base rack rate), blocks coupons, and requires
  // the guest to have accepted the non-refundable / advance-payment terms.
  let isLastMinute = false;
  const lmConfig = await getLastMinuteConfig();
  const lm = evaluateLastMinute({ config: lmConfig, checkIn: input.checkIn, roomId: input.roomId });
  if (lm.active && basePrice > 0) {
    if (!input.lastMinuteAgreed) {
      return { success: false, error: 'Please accept the Last-Minute Offer terms (non-refundable, advance payment) to continue.' };
    }
    isLastMinute = true;
    pricePerNight = lastMinutePrice(basePrice, lm.discountPercent);
  }

  const { roomTotal, extraBedTotal } = calcPricing(pricePerNight, nights, input.extraBeds);
  const lastMinuteSaving = isLastMinute ? Math.max(0, (basePrice - pricePerNight) * nights) : 0;

  // Coupon: re-validate server-side. Even if the client already applied it,
  // we re-check here so a race (coupon deactivated between apply and submit,
  // usage_limit reached, guest tampered with the code) can't leak a
  // discount that shouldn't apply. A failed re-validation just drops the
  // discount silently — better UX than rejecting the whole booking.
  // NON-STACKABLE: a last-minute rate ignores any coupon entirely.
  let couponDiscount = 0;
  let couponCodeApplied: string | null = null;
  if (!isLastMinute && input.couponCode) {
    const code = normalizeCouponCode(input.couponCode);
    const { data: couponRow } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    const check = validateCoupon(couponRow as CouponRow | null, {
      roomId: input.roomId,
      nights,
      roomTotal,
      checkIn: input.checkIn,
    });
    if (check.valid) {
      // Atomically bump times_used — RPC ensures a coupon at usage_limit
      // can never be consumed twice in a race. If the bump fails (someone
      // else took the last slot), we drop the discount silently.
      const { data: consumed } = await supabase.rpc('consume_coupon', { p_code: code });
      if (consumed === true) {
        couponDiscount = check.discount;
        couponCodeApplied = code;
      }
    }
  }

  // Server-authoritative pricing: pull the current tax rate from settings
  // and run every booking through the same pure helper the form previews
  // with. If the admin changed the rate mid-session, the guest's preview
  // might briefly differ from what we commit — the committed number wins
  // and that's the number in the confirmation email, so no dispute later.
  const taxPercent = await getHotelTaxPercent();
  const pricing = calculatePricing({ roomTotal, extraBedTotal, couponDiscount, taxPercent });
  const grandTotal = pricing.total;
  const taxAmount = pricing.taxAmount;

  // ── AVAILABILITY CHECK (atomic, server-authoritative) ────────────────
  // Same multi-unit logic the client-facing checkAvailability() above uses
  // for the proactive warning — this is the real, race-safe enforcement.
  const availability = await checkRoomAvailability(input.roomId, input.checkIn, input.checkOut);
  if (!availability.available) {
    return {
      success: false,
      error: `Sorry, this room is fully booked on ${availability.soldOutDate}. Please choose different dates or another room.`,
    };
  }

  // Recompute the date list here for the block-insert step below.
  const dates = eachDayOfInterval({
    start: parseISO(input.checkIn),
    end: addDays(parseISO(input.checkOut), -1),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  // ── CREATE BOOKING ───────────────────────────────────────────────────
  const bookingRef = generateBookingRef();

  const attribution = sanitizeAttribution(input.attribution);

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
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      special_request: input.specialRequest || null,
      status: 'pending',
      source: input.source || 'website',
      coupon_code: isLastMinute ? LAST_MINUTE_MARKER : couponCodeApplied,
      discount_amount: isLastMinute ? lastMinuteSaving : couponDiscount,
      ...attribution,
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
    couponCode: isLastMinute ? LAST_MINUTE_MARKER : couponCodeApplied,
    discountAmount: isLastMinute ? lastMinuteSaving : couponDiscount,
    isLastMinute,
    paymentWindowMins: lmConfig.paymentWindowMins,
    jazzcashNumber: lmConfig.jazzcashNumber,
    jazzcashName: lmConfig.jazzcashName,
    subtotal: pricing.subtotal,
    discountedSubtotal: pricing.discountedSubtotal,
    taxPercent,
    taxAmount,
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
  couponCode?: string | null;
  discountAmount?: number;
  isLastMinute?: boolean;
  paymentWindowMins?: number;
  jazzcashNumber?: string;
  jazzcashName?: string;
  subtotal?: number;
  discountedSubtotal?: number;
  taxPercent?: number;
  taxAmount?: number;
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
      ${details.couponCode ? `<tr><td style="padding:4px 0;color:#059669">${details.isLastMinute ? 'Last-Minute Deal' : `Coupon ${details.couponCode}`}</td><td style="color:#059669;font-weight:600">−${formatPKR(details.discountAmount || 0)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:#666;font-weight:bold;border-top:1px solid #ddd">Est. Total</td><td style="font-weight:bold;color:#E30613;border-top:1px solid #ddd">${formatPKR(details.grandTotal)}</td></tr>
      ${details.taxPercent && details.taxPercent > 0 ? `
      <tr><td style="padding:8px 0 2px;color:#999;font-size:12px;border-top:1px dashed #ddd">+ ${details.taxPercent}% GST (Exclusive)</td><td style="padding-top:8px;border-top:1px dashed #ddd;color:#999;font-size:12px">+${formatPKR(details.taxAmount || 0)}</td></tr>` : ''}
    </table>
  </div>

  ${details.isLastMinute ? `
  <div style="background:#FEF2F2;border:1px solid #FECACA;padding:16px;margin:8px 0">
    <p style="color:#B91C1C;font-weight:bold;margin:0 0 6px">⚡ Last-Minute Non-Refundable Rate — advance payment required</p>
    <p style="color:#666;margin:0 0 6px">To lock this special rate, please send <b>${formatPKR(details.grandTotal)}</b> via JazCash to <b>${details.jazzcashNumber || '(number shared on WhatsApp)'}</b>${details.jazzcashName ? ` — ${details.jazzcashName}` : ''}, then WhatsApp the payment screenshot to <a href="https://wa.me/923173330998" style="color:#25D366">+92 317 333 0998</a> within <b>${details.paymentWindowMins || 30} minutes</b>.</p>
    <p style="color:#999;font-size:12px;margin:0">This rate is 100% non-refundable and cannot be amended or cancelled. Your room is confirmed only after payment is received.</p>
  </div>` : `
  <p style="color:#666"><strong>No payment has been taken.</strong> Payment is settled at checkout${details.taxPercent && details.taxPercent > 0 ? ` (room total + ${details.taxPercent}% GST)` : ''}.</p>`}
  <p style="color:#666">Questions? <a href="https://wa.me/923173330998" style="color:#25D366">WhatsApp us on +92 317 333 0998</a></p>

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
    ${details.couponCode ? `<tr><td style="color:#059669"><b>${details.isLastMinute ? 'Last-Minute' : 'Coupon'}</b></td><td style="color:#059669"><b>${details.isLastMinute ? 'Deal' : details.couponCode}</b> (−${formatPKR(details.discountAmount || 0)})</td></tr>` : ''}
    <tr><td><b>Est. Total</b></td><td><b style="color:#E30613">${formatPKR(details.grandTotal)}</b></td></tr>
    ${details.taxPercent && details.taxPercent > 0 ? `<tr><td style="color:#999;font-size:12px">+ GST @ ${details.taxPercent}% (Exclusive)</td><td style="color:#999;font-size:12px">+${formatPKR(details.taxAmount || 0)}</td></tr>` : ''}
  </table>
  ${details.isLastMinute ? `<p style="background:#FEF2F2;border:1px solid #FECACA;padding:12px;color:#B91C1C;font-weight:bold">⚡ LAST-MINUTE (non-refundable) — expect a JazCash payment screenshot on WhatsApp. Confirm the booking only after payment is received.</p>` : ''}
  <p>Login to the admin dashboard to confirm or manage this booking.</p>
</div>`;

    // Recipient comes from the admin-editable setting first (falls back
    // to env var, then hardcoded default). Admin can change it in
    // /admin/settings/notifications and the next booking picks it up
    // instantly — no redeploy needed.
    const { email: adminRecipient } = await resolveNotificationEmail();

    const results = await Promise.all([
      details.guestEmail
        ? resend.emails.send({
            from: 'Hotel Elegant <noreply@elegant-suite.com>',
            to: details.guestEmail,
            subject: `Booking Request Received — Ref: ${details.bookingRef}`,
            html: guestHtml,
          })
        : Promise.resolve({ data: null, error: null }),
      resend.emails.send({
        from: 'Hotel Elegant Bookings <noreply@elegant-suite.com>',
        to: adminRecipient,
        subject: `New Booking — ${details.bookingRef} · ${details.roomName}`,
        html: adminHtml,
      }),
    ]);
    // Surface any per-email errors to server logs so we can actually see
    // why a booking didn't produce an inbox ping. Non-fatal — the booking
    // row is already persisted; we just don't want silent black-hole.
    results.forEach((r, i) => {
      if (r && 'error' in r && r.error) {
        console.error(
          `[booking notify] email ${i === 0 ? 'to guest' : 'to admin'} failed for ${details.bookingRef}`,
          r.error
        );
      }
    });
  } catch (e) {
    console.error(`[booking notify] threw for ${details.bookingRef}`, e);
    // Non-fatal — booking is already saved.
  }
}
