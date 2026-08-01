// GA4 Measurement Protocol sender — the server-to-server equivalent of
// lib/metaCapi.ts, but for Google. Fires when a booking is marked COMPLETED
// (see BookingStatusForm.tsx), sending the SAME custom event name
// ('booking_submitted') that Google Ads' "Purchase" conversion action
// already imports as a GA4 key event. The early client-side dataLayer push
// of that same event name was retired (see BookingConversionTracker.tsx) so
// there's exactly one source of truth for it now — this one, firing only
// once a stay is confirmed to have actually happened, with the true final
// value (including any extension made via ExtendStayForm).
//
// Deliberately bypasses GTM entirely — Measurement Protocol is a direct
// server-to-Google API call, independent of the website's dataLayer/GTM
// pipeline, so no GTM changes were needed to wire this up.

const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
const API_SECRET = process.env.GA4_API_SECRET;
// Debug endpoint validates the payload and returns feedback but does NOT
// record real data — flip GA4_MP_DEBUG=true temporarily while verifying a
// new API secret, then unset it so real events start counting.
const DEBUG = process.env.GA4_MP_DEBUG === 'true';
const ENDPOINT = DEBUG
  ? 'https://www.google-analytics.com/debug/mp/collect'
  : 'https://www.google-analytics.com/mp/collect';

interface BookingGa4Input {
  bookingRef: string;
  roomName: string;
  grandTotal: number;
  /** Captured from the guest's `_ga` cookie at first-touch (see
   *  UtmCapture.tsx). Falls back to a fresh pseudo-id when absent (e.g. the
   *  booking was created by admin, or the guest had cookies blocked) — the
   *  event still counts toward revenue totals, just without being linked to
   *  the original ad-click session. */
  gaClientId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

interface Ga4Result {
  success: boolean;
  error?: string;
}

function fallbackClientId(): string {
  // GA4's own format is "<random>.<unix_seconds>" — mirror that shape so a
  // fallback id doesn't look obviously synthetic in reports.
  return `${Math.floor(Math.random() * 1_000_000_000)}.${Math.floor(Date.now() / 1000)}`;
}

export async function sendBookingCompletedGa4Event(input: BookingGa4Input): Promise<Ga4Result> {
  if (!MEASUREMENT_ID || !API_SECRET) {
    return { success: false, error: 'GA4_MEASUREMENT_ID / GA4_API_SECRET not configured' };
  }

  const clientId = input.gaClientId || fallbackClientId();

  const payload = {
    client_id: clientId,
    events: [
      {
        name: 'booking_submitted',
        params: {
          value: input.grandTotal,
          currency: 'PKR',
          booking_ref: input.bookingRef,
          room: input.roomName,
          ...(input.utmSource   ? { utm_source:   input.utmSource   } : {}),
          ...(input.utmMedium   ? { utm_medium:   input.utmMedium   } : {}),
          ...(input.utmCampaign ? { utm_campaign: input.utmCampaign } : {}),
        },
      },
    ],
  };

  try {
    const res = await fetch(`${ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (DEBUG) {
      // Debug endpoint always returns 200 with a validationMessages array —
      // surface it so a bad payload shows up in server logs during setup.
      const json = await res.json().catch(() => null);
      const messages = json?.validationMessages;
      if (messages && messages.length > 0) {
        return { success: false, error: `GA4 validation: ${JSON.stringify(messages)}` };
      }
      return { success: true };
    }

    // The real collect endpoint returns 204 No Content on success and never
    // echoes back per-event acceptance — HTTP status is all we get.
    if (!res.ok) {
      return { success: false, error: `GA4 Measurement Protocol returned HTTP ${res.status}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
