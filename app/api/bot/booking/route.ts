import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { createBookingCore, type BookingInput } from '@/lib/bookingCore';
import { findActiveBookings, quoteStay, staysOverlap, validateStayDates } from '@/lib/botQuote';
import { rateLimit } from '@/lib/rateLimit';

/**
 * WhatsApp booking bot API (called by the ABS dashboard, never by browsers).
 *
 *   POST /api/bot/booking   signed like /api/portal/*: x-portal-ts + x-portal-signature = HMAC-SHA256(`${ts}.${rawBody}`, SUPABASE_SERVICE_ROLE_KEY)
 *   { action: 'quote',  checkIn, checkOut, adults, children }
 *   { action: 'lookup', guestPhone, bookingRef? }          → the guest's upcoming bookings (so nobody is booked twice)
 *   { action: 'create', roomId, checkIn, checkOut, adults, children, guestName, guestPhone, specialRequest?, ref?: {src, code}, allowAdditional? }
 *       refused with error 'duplicate' when this phone already has a pending/confirmed booking that overlaps the dates,
 *       unless the guest explicitly asked for an additional room (allowAdditional: true)
 *   { action: 'attach_receipt', bookingRef, guestPhone, receiptUrl }
 *   { action: 'cancel', bookingRef, guestPhone }          (only while the booking is still pending)
 *
 * Prices, tax, deals, availability and room blocking are decided here by the same code the website uses
 * (lib/bookingCore.ts); the caller never sends a price. The ABS dashboard already holds this key (encrypted) for reading bookings.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF_RE = /^[A-Za-z0-9-]{4,24}$/;

function validSignature(raw: string, ts: string, sig: string): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !/^\d{10,13}$/.test(ts) || !/^[a-f0-9]{64}$/.test(sig)) return false;
  if (Math.abs(Date.now() - Number(ts)) > 5 * 60 * 1000) return false;
  const expected = createHmac('sha256', key).update(`${ts}.${raw}`).digest('hex');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/** Pakistan numbers as 92XXXXXXXXXX; anything else keeps its digits (international guests). */
function normPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(2);
  else if (d.startsWith('0')) d = '92' + d.slice(1);
  else if (d.length === 10 && d.startsWith('3')) d = '92' + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

const sameGuest = (a: string, b: string) => a.slice(-10) === b.slice(-10);

/** The chat's "(Ref: FB-EFC1)" source tag → the attribution fields the hotel's reports already understand. */
function attributionFromRef(ref: unknown): Record<string, string> {
  const out: Record<string, string> = { landing_path: 'whatsapp' };
  if (!ref || typeof ref !== 'object') return out;
  const src = String((ref as { src?: unknown }).src ?? '').toUpperCase();
  const code = String((ref as { code?: unknown }).code ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
  if (src === 'FB') Object.assign(out, { utm_source: 'facebook', utm_medium: 'whatsapp_chat' });
  else if (src === 'GA') Object.assign(out, { utm_source: 'google', utm_medium: 'cpc' });
  else if (src === 'GS') Object.assign(out, { utm_source: 'google', utm_medium: 'organic', referrer: 'google.com' });
  if (code && src) out.utm_content = code;
  return out;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-portal-ts') ?? '', req.headers.get('x-portal-signature') ?? '')) {
    return bad('Unauthorised.', 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return bad('Invalid JSON.');
  }
  const action = body.action;

  if (action === 'quote') {
    const r = await quoteStay({
      checkIn: String(body.checkIn ?? ''),
      checkOut: String(body.checkOut ?? ''),
      adults: Number(body.adults) || 1,
      children: Number(body.children) || 0,
    });
    return r.ok ? NextResponse.json({ success: true, nights: r.nights, rooms: r.rooms }) : bad(r.error);
  }

  const phone = normPhone(body.guestPhone);
  if (!phone) return bad('A valid guest phone number is required.');

  if (action === 'lookup') {
    const bookingRef = String(body.bookingRef ?? '');
    const bookings = await findActiveBookings(phone, REF_RE.test(bookingRef) ? bookingRef : undefined);
    return NextResponse.json({ success: true, bookings });
  }

  if (action === 'create') {
    // One guest can't spam bookings: 3 new bookings an hour per phone number.
    const rl = rateLimit(`botbooking:${phone}`, 3, 60 * 60_000);
    if (!rl.allowed) return bad('Too many bookings from this number. Please try again later.', 429);

    const roomId = String(body.roomId ?? '');
    if (!UUID_RE.test(roomId)) return bad('Unknown room.');
    const checkIn = String(body.checkIn ?? '');
    const checkOut = String(body.checkOut ?? '');
    const dateError = validateStayDates(checkIn, checkOut);
    if (dateError) return bad(dateError);
    const guestName = String(body.guestName ?? '').trim().replace(/\s+/g, ' ');
    if (guestName.length < 2 || guestName.length > 100) return bad('A guest name is required.');
    const adults = Math.floor(Number(body.adults));
    const children = Math.floor(Number(body.children) || 0);
    if (!(adults >= 1 && adults <= 8) || !(children >= 0 && children <= 6)) return bad('Check the number of guests.');

    // A guest who already booked (typically on the website, then opened WhatsApp) must not be booked again for the same stay.
    if (body.allowAdditional !== true) {
      const clash = (await findActiveBookings(phone)).filter((b) => b.matchedBy === 'phone' && staysOverlap(b.checkIn, b.checkOut, checkIn, checkOut));
      if (clash.length) return NextResponse.json({ success: false, error: 'duplicate', existing: clash }, { status: 409 });
    }

    const input: BookingInput = {
      roomId,
      checkIn,
      checkOut,
      adults,
      children,
      extraBeds: 0,
      guestName,
      guestPhone: `+${phone}`,
      guestEmail: '',
      specialRequest: String(body.specialRequest ?? '').slice(0, 300),
      source: 'whatsapp',
      attribution: attributionFromRef(body.ref),
    };
    const result = await createBookingCore(input, { ip: null, userAgent: null, fbc: null, fbp: null });
    if (!result.success || !result.bookingId) return bad(result.error || 'Could not create the booking.', 409);

    const { data: b } = await createServiceClient()
      .from('bookings')
      .select('booking_ref, grand_total, status, nights, rooms(name)')
      .eq('id', result.bookingId)
      .single();
    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      bookingRef: b?.booking_ref ?? result.bookingRef,
      grandTotal: Number(b?.grand_total) || null,
      status: b?.status ?? 'pending',
      nights: b?.nights ?? null,
      roomName: (b?.rooms as { name?: string } | null)?.name ?? null,
    });
  }

  if (action === 'attach_receipt' || action === 'cancel') {
    const ref = String(body.bookingRef ?? '');
    if (!REF_RE.test(ref)) return bad('Unknown booking.');
    const supabase = createServiceClient();
    const { data: b } = await supabase.from('bookings').select('id, guest_phone, status').eq('booking_ref', ref).maybeSingle();
    // The caller must name the same guest the booking was made for.
    if (!b || !sameGuest(String(b.guest_phone ?? '').replace(/\D/g, ''), phone)) return bad('Unknown booking.', 404);

    if (action === 'attach_receipt') {
      const url = String(body.receiptUrl ?? '');
      if (!/^https:\/\//i.test(url) || url.length > 500) return bad('A valid receipt link is required.');
      const { error } = await supabase.from('bookings').update({ advance_payment_screenshot_url: url }).eq('id', b.id);
      return error ? bad('Could not save the receipt.', 500) : NextResponse.json({ success: true });
    }

    if (b.status !== 'pending') return bad('Only a pending booking can be released.', 409);
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', b.id);
    if (error) return bad('Could not release the booking.', 500);
    await supabase.from('availability_blocks').delete().eq('booking_id', b.id);
    return NextResponse.json({ success: true });
  }

  return bad('Unknown action.');
}
