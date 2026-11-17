import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { fireBookingSubmittedCapi } from '@/app/actions/metaCapi';

/**
 * WhatsApp-bot booking whose advance payment staff just CONFIRMED from the Ads by Shoaib client portal: sends its Meta
 * Purchase (action_source 'chat'), exactly what the hotel admin's status form sends when it confirms such a booking
 * (app/actions/metaCapi.ts → fireBookingConfirmedCapi). The bot creates the booking unpaid and sends no Purchase then.
 *
 * Same auth as /api/portal/booking-completed: HMAC-SHA256 of `${bookingId}.${ts}` keyed by this site's
 * SUPABASE_SERVICE_ROLE_KEY (the portal holds the same key, encrypted); requests older than 5 minutes are refused.
 * The booking must really be 'confirmed' and made by the bot. Meta dedupes on the stable event_id.
 */
export const dynamic = 'force-dynamic';

function validSignature(bookingId: string, ts: string, sig: string): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !/^\d{10,13}$/.test(ts) || !/^[a-f0-9]{64}$/.test(sig)) return false;
  if (Math.abs(Date.now() - Number(ts)) > 5 * 60 * 1000) return false;
  const expected = createHmac('sha256', key).update(`${bookingId}.${ts}`).digest('hex');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { bookingId?: string } | null;
  const bookingId = body?.bookingId ?? '';
  const ts = request.headers.get('x-portal-ts') ?? '';
  const sig = request.headers.get('x-portal-signature') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(bookingId) || !validSignature(bookingId, ts, sig)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: b } = await createServiceClient().from('bookings').select('status, source, landing_path').eq('id', bookingId).single();
  if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (b.source !== 'whatsapp' && b.landing_path !== 'whatsapp') return NextResponse.json({ skipped: 'not a WhatsApp booking' });
  if (b.status !== 'confirmed') return NextResponse.json({ error: 'Booking is not confirmed' }, { status: 409 });

  await fireBookingSubmittedCapi(bookingId, {});
  return NextResponse.json({ ok: true });
}
