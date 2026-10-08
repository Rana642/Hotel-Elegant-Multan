import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { sendStayCompletedEvent } from '@/lib/metaCapi';
import { sendBookingCompletedGa4Event } from '@/lib/ga4Mp';

/**
 * "Guest stayed" signals for a booking marked COMPLETED from the Ads by
 * Shoaib client portal (which writes the status straight to this DB) — the
 * same Meta StayCompleted CAPI + GA4 server event the admin's status form
 * fires (app/admin/bookings/[id]/BookingStatusForm.tsx).
 *
 * Auth without a new secret: the caller signs `${bookingId}.${ts}` with
 * HMAC-SHA256 keyed by this site's SUPABASE_SERVICE_ROLE_KEY (the portal
 * holds the same key, encrypted, to read bookings). Requests older than
 * 5 minutes are refused, and the booking must really be 'completed'.
 * Meta dedupes on event_id `stay-completed-<ref>`, so a retry can't double-count.
 */
export const dynamic = 'force-dynamic';

const BOOKING_SOURCES = ['website', 'walkin', 'phone', 'ota'] as const;

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

  const service = createServiceClient();
  const { data: b } = await service.from('bookings').select('*, rooms(name)').eq('id', bookingId).single();
  if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (b.status !== 'completed') return NextResponse.json({ error: 'Booking is not completed' }, { status: 409 });

  const roomName = b.rooms?.name || 'Hotel Room';
  const [meta, ga4] = await Promise.allSettled([
    sendStayCompletedEvent({
      bookingRef: b.booking_ref,
      guestName: b.guest_name,
      guestPhone: b.guest_phone,
      guestEmail: b.guest_email,
      roomName,
      grandTotal: b.grand_total,
      nights: b.nights,
      source: (BOOKING_SOURCES as readonly string[]).includes(b.source) ? b.source : 'website',
      utmSource: b.utm_source,
      utmMedium: b.utm_medium,
      utmCampaign: b.utm_campaign,
      fbclid: b.fbclid,
      gclid: b.gclid,
    }),
    sendBookingCompletedGa4Event({
      bookingRef: b.booking_ref,
      roomName,
      grandTotal: b.grand_total,
      gaClientId: b.ga_client_id,
      utmSource: b.utm_source,
      utmMedium: b.utm_medium,
      utmCampaign: b.utm_campaign,
    }),
  ]);

  return NextResponse.json({
    meta: meta.status === 'fulfilled' ? meta.value.success : false,
    ga4: ga4.status === 'fulfilled' ? ga4.value.success : false,
  });
}
