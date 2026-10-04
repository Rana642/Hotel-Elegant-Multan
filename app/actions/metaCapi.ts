'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  sendBookingPurchaseEvent,
  sendStayCompletedEvent,
  type BookingSource,
} from '@/lib/metaCapi';

// Booking → Meta Conversions API. See lib/metaCapi.ts's header for the two
// signals: Purchase at submit, StayCompleted when admin marks the stay
// completed.

/** Guest-browser signals only available at submit-time (see
 *  readMetaBrowserCookies' doc comment in lib/metaCapi.ts) — captured by
 *  the caller (app/actions/booking.ts, inside the guest's own request) and
 *  threaded through here since this internal helper also re-reads the
 *  booking row from the DB, which has no cookie/IP columns to fall back on. */
interface SubmitTimeSignals {
  fbc?: string | null;
  fbp?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  /** Split first/last as the guest typed them in the two form fields —
   *  preferred over re-splitting booking.guest_name (see lib/metaCapi.ts).
   *  Same live-request-only availability caveat as the fields above. */
  guestFirstName?: string;
  guestLastName?: string;
}

type BookingRow = {
  booking_ref: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  grand_total: number;
  nights: number;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  gclid: string | null;
  rooms?: { name?: string } | null;
};

const VALID_SOURCES: BookingSource[] = ['website', 'walkin', 'phone', 'ota'];

function bookingSource(booking: BookingRow): BookingSource {
  // Whitelist to the known enum — a stray DB value must not pick up an
  // unknown action_source at Meta's end.
  return VALID_SOURCES.includes(booking.source as BookingSource)
    ? (booking.source as BookingSource)
    : 'website';
}

function capiInput(booking: BookingRow) {
  return {
    bookingRef: booking.booking_ref,
    guestName: booking.guest_name,
    guestPhone: booking.guest_phone,
    guestEmail: booking.guest_email,
    roomName: booking.rooms?.name || 'Hotel Room',
    grandTotal: booking.grand_total,
    nights: booking.nights,
    source: bookingSource(booking),
    // Ad attribution captured at first-touch (public form) or entered by
    // staff via the Ad source dropdown. When present, CAPI sends the event
    // as action_source 'website' so Meta credits the ad even for bookings
    // that closed on WhatsApp/phone/walk-in.
    utmSource: booking.utm_source,
    utmMedium: booking.utm_medium,
    utmCampaign: booking.utm_campaign,
    fbclid: booking.fbclid,
    gclid: booking.gclid,
  };
}

async function loadBooking(bookingId: string): Promise<BookingRow | null> {
  const service = createServiceClient();
  const { data } = await service
    .from('bookings')
    .select('*, rooms(name)')
    .eq('id', bookingId)
    .single();
  return (data as BookingRow | null) ?? null;
}

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'Not authenticated';
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  return adminRow ? null : 'Not an admin';
}

/**
 * Booking-submit path — fires Meta Purchase for every new booking. Guest
 * browser signals (fbc/fbp/IP/UA) are attached only for WEBSITE bookings:
 * a staff-entered phone/WhatsApp/walk-in booking is submitted from the staff
 * member's browser, so its cookies/IP would point Meta at the wrong person —
 * those match on hashed phone/email + the Ad source staff picked instead.
 * Swallows errors so it never breaks the booking flow.
 */
export async function fireBookingSubmittedCapi(bookingId: string, signals: SubmitTimeSignals = {}): Promise<void> {
  try {
    const booking = await loadBooking(bookingId);
    if (!booking) return;
    const isWebsite = bookingSource(booking) === 'website';
    await sendBookingPurchaseEvent({ ...capiInput(booking), ...(isWebsite ? signals : {}) });
  } catch (e) {
    console.error('[capi submit fire]', e);
  }
}

/**
 * Admin marked the booking COMPLETED (guest actually stayed) — StayCompleted
 * quality signal. The booking row is re-read fresh, so an extended stay
 * carries its true final grand_total. Admin-only; CAPI failures are
 * non-fatal (the status update already succeeded before this runs).
 */
export async function fireBookingCompletedCapi(bookingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const authError = await requireAdmin();
  if (authError) return { success: false, error: authError };

  const booking = await loadBooking(bookingId);
  if (!booking) return { success: false, error: 'Booking not found' };

  const result = await sendStayCompletedEvent(capiInput(booking));
  return { success: result.success, error: result.error };
}
