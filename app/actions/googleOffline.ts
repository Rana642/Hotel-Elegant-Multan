'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';

// Google Ads offline conversion for an admin-confirmed booking. The upload
// itself happens on the ABS side (holds the Google Ads credentials); this only
// sends the booking facts to ABS's /api/offline-conversions endpoint.
// Order ID = booking_ref, the same reference the website's Purchase conversion
// sends, so Google counts one booking once.

const ABS_URL = process.env.ABS_OFFLINE_CONVERSIONS_URL;
const ABS_SECRET = process.env.OFFLINE_CONVERSIONS_SECRET;

// Hotel Elegant Google Ads (ids are not secrets; the credentials stay in ABS).
const CUSTOMER_ID = '622-325-0696';
const LOGIN_CUSTOMER_ID = '885-934-7478';
// "Hotel Elegant - Confirmed booking (offline)", type UPLOAD_CLICKS (created 2026-11-19).
// Website "Hotel Booking Purchase" (7715590923) is WEBPAGE type and cannot take uploads.
const PURCHASE_ACTION_ID = '7909441411';

/** Karachi time as Google's "YYYY-MM-DD HH:MM:SS+05:00". */
function pktStamp(d = new Date()): string {
  const shifted = new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString();
  return `${shifted.slice(0, 10)} ${shifted.slice(11, 19)}+05:00`;
}

export async function sendBookingConfirmedGoogleAds(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  await requireStaff();
  if (!ABS_URL || !ABS_SECRET) return { success: false, error: 'ABS endpoint not configured' };

  const service = createServiceClient();
  const { data: b, error } = await service
    .from('bookings')
    .select('booking_ref, gclid, guest_email, guest_phone, grand_total, status')
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !b) return { success: false, error: 'booking not found' };

  // No gclid = not from a Google Ads click, so there is nothing to attribute.
  if (!b.gclid) return { success: true };
  if (!(Number(b.grand_total) > 0)) return { success: false, error: 'no amount' };

  try {
    const res = await fetch(ABS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-offline-secret': ABS_SECRET },
      body: JSON.stringify({
        customerId: CUSTOMER_ID,
        loginCustomerId: LOGIN_CUSTOMER_ID,
        conversionActionId: PURCHASE_ACTION_ID,
        gclid: b.gclid,
        orderId: b.booking_ref,
        conversionDateTime: pktStamp(),
        value: Number(b.grand_total),
        currency: 'PKR',
        email: b.guest_email,
        phone: b.guest_phone,
      }),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) return { success: false, error: json.error ?? `ABS ${res.status}` };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'request failed' };
  }
}
