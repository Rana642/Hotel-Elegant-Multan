import { createHash } from 'crypto';

// Meta Conversions API sender — server-to-server events with hashed customer
// data for Meta's Advanced Matching. Fires when a booking is CONFIRMED
// (higher-signal than the browser Pixel's booking_submitted, which includes
// unconfirmed / cancelled requests). Uses a stable event_id so if the same
// booking is confirmed twice (e.g. cancel → re-confirm), Meta dedupes it.

const PIXEL_ID = process.env.META_PIXEL_ID || '27407654508906433';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE; // only set during testing
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;

function sha256Lower(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;
  return createHash('sha256').update(s).digest('hex');
}

/** Meta wants phones in E.164 form without leading + (digits only). */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  // Pakistani local formats ("0317..." / "317...") → prefix country code 92.
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return '92' + digits.slice(1);
  if (digits.length === 10) return '92' + digits;
  return digits;
}

interface BookingCapiInput {
  bookingRef: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  roomName: string;
  grandTotal: number;
  nights: number;
}

interface CapiResult {
  success: boolean;
  error?: string;
  eventsReceived?: number;
}

export async function sendBookingPurchaseEvent(input: BookingCapiInput): Promise<CapiResult> {
  if (!ACCESS_TOKEN) {
    return { success: false, error: 'META_ACCESS_TOKEN not configured' };
  }

  // Split guest name into first/last for Meta's fn/ln fields
  const parts = input.guestName.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  const userData: Record<string, string[]> = {};
  const em = sha256Lower(input.guestEmail);
  if (em) userData.em = [em];
  const ph = sha256Lower(normalizePhone(input.guestPhone));
  if (ph) userData.ph = [ph];
  const fn = sha256Lower(firstName);
  if (fn) userData.fn = [fn];
  const ln = sha256Lower(lastName);
  if (ln) userData.ln = [ln];
  const country = sha256Lower('pk');
  if (country) userData.country = [country];

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        // Stable per-booking id → if this same booking is confirmed twice
        // (cancel → re-confirm), Meta dedupes on this and counts it once.
        event_id: `booking-confirmed-${input.bookingRef}`,
        action_source: 'website',
        event_source_url: `https://elegant-suite.com/thank-you?ref=${input.bookingRef}`,
        user_data: userData,
        custom_data: {
          currency: 'PKR',
          value: input.grandTotal,
          content_ids: [input.bookingRef],
          content_name: input.roomName,
          content_category: 'Hotel Booking',
          content_type: 'product',
          order_id: input.bookingRef,
          num_items: input.nights,
        },
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(`${GRAPH_URL}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { events_received?: number; error?: { message?: string } };
    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message || `Meta returned HTTP ${res.status}` };
    }
    return { success: true, eventsReceived: json.events_received };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
