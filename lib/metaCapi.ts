import { createHash } from 'crypto';
import { cookies } from 'next/headers';

// Meta Conversions API sender — server-to-server events with hashed customer
// data for Meta's Advanced Matching.
//
// Two distinct signals, fired at two different moments, on purpose:
//
//   1. Purchase — fired the instant a booking is SUBMITTED (see
//      fireBookingSubmittedCapi in app/actions/metaCapi.ts), unconditionally,
//      before anyone knows whether the guest will actually show up. This is
//      the fast, high-volume signal the ad algorithm optimises on — real
//      booking intent existed the moment the guest submitted, whether or
//      not they later cancel/no-show. Waiting for the stay to actually
//      happen before sending anything starves Meta of signal for weeks and
//      keeps ad sets stuck in the learning phase.
//
//   2. StayCompleted — fired only when admin marks a booking COMPLETED
//      (guest actually stayed). A SEPARATE event name/event_id from
//      Purchase, deliberately: reusing the Purchase event_id here would
//      mean the same real event_id gets sent twice, often weeks apart,
//      which risks Meta NOT deduplicating it (its dedup window is not
//      guaranteed to span that gap) and double-counting revenue. StayCompleted
//      instead exists purely as an extra "this was a real, paying guest"
//      quality signal — useful for Lookalike Audiences and long-term
//      targeting quality — with zero risk of inflating the Purchase/ROAS
//      numbers the ad account reports on.
//
// Both use a stable event_id per booking so a double status-flip can't
// double-count within their own event type.

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

/** Reads Meta's `_fbc` / `_fbp` cookies from the current request — call this
 *  from inside a Server Action invoked by the GUEST's own browser (booking
 *  submit, inquiry modal submit). Both cookies are set by the Pixel snippet
 *  in app/layout.tsx: `_fbp` on every visitor, `_fbc` only once an ad click
 *  (fbclid) has been seen. Never call this from an admin-triggered action
 *  (e.g. marking a booking Completed) — that request carries the ADMIN's
 *  cookies, not the guest's, and sending them would misattribute the event. */
export async function readMetaBrowserCookies(): Promise<{ fbc: string | null; fbp: string | null }> {
  const store = await cookies();
  return {
    fbc: store.get('_fbc')?.value || null,
    fbp: store.get('_fbp')?.value || null,
  };
}

export type BookingSource = 'website' | 'walkin' | 'phone' | 'ota';

interface BookingCapiInput {
  bookingRef: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  roomName: string;
  grandTotal: number;
  nights: number;
  /** Where the booking originated — controls Meta action_source so OTA /
   *  walk-in / phone bookings don't pollute ad attribution. */
  source: BookingSource;
  /** UTM / ad attribution captured at first-touch. Present when guest came
   *  from an ad (or admin tagged the booking with an ad source). Lets us
   *  override the source-based action_source so ad-driven bookings that
   *  closed on WhatsApp/phone still get credited to the ad in Meta. */
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  /** Raw `_fbc` cookie value — set by Meta's own pixel with the correct
   *  original-click timestamp, so it's strictly better than reconstructing
   *  one from a stored fbclid (which can only guess "now" as the click
   *  time). Only available when this event fires inside the guest's own
   *  request (Purchase at submit-time) — StayCompleted is admin-triggered
   *  days later, so it has none and falls back to the fbclid guess. */
  fbc?: string | null;
  /** Raw `_fbp` cookie value — Meta's browser-id cookie, set for every
   *  Pixel visitor regardless of ad origin. Same availability caveat as fbc. */
  fbp?: string | null;
  /** Guest's IP / user-agent at the moment of THIS event. Only meaningful
   *  when the event fires inside the guest's own request — never pass the
   *  admin's IP/UA for StayCompleted, that would misattribute the event to
   *  the wrong person. */
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}

// Meta's action_source is the signal it uses to decide whether an event is
// attributable to a website ad campaign. Only 'website' events feed the ad
// optimiser directly; the others are treated as offline/other-channel data —
// still useful for Advanced Matching, audiences, and Lookalikes, but no
// longer inflate ad ROAS with bookings the ads didn't produce.
const ACTION_SOURCE_MAP: Record<BookingSource, string> = {
  website: 'website',
  walkin:  'physical_store',
  phone:   'phone_call',
  ota:     'other',
};

interface CapiResult {
  success: boolean;
  error?: string;
  eventsReceived?: number;
}

/** Shared builder + sender for both booking-level events (Purchase and
 *  StayCompleted) — identical user_data/custom_data shape, only the event
 *  name and event_id differ between the two call sites below. */
async function sendBookingCapiEvent(
  eventName: 'Purchase' | 'StayCompleted',
  eventId: string,
  input: BookingCapiInput,
): Promise<CapiResult> {
  if (!ACCESS_TOKEN) {
    return { success: false, error: 'META_ACCESS_TOKEN not configured' };
  }

  // Split guest name into first/last for Meta's fn/ln fields
  const parts = input.guestName.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  const userData: Record<string, string[] | string> = {};
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

  // fbc / fbp are Meta's ad-click / browser-id cookies — sending them lets
  // Meta connect this event to the exact ad click / browser session that
  // brought the guest. Prefer the real _fbc cookie (correct original-click
  // timestamp, set by Meta's own pixel) over reconstructing one from a
  // stored fbclid, which can only guess "now" as the click time. Format for
  // a reconstructed fbc is 'fb.1.<created_ms>.<fbclid>' (Meta's spec).
  if (input.fbc) {
    userData.fbc = input.fbc;
  } else if (input.fbclid) {
    userData.fbc = `fb.1.${Date.now()}.${input.fbclid}`;
  }
  if (input.fbp) userData.fbp = input.fbp;
  if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;

  // Attribution-aware override: when there's ANY ad-tracking parameter on
  // this booking (fbclid/gclid or a utm_source), we treat it as a website
  // conversion regardless of channel. The guest first touched us via an ad,
  // then just happened to close on WhatsApp/phone/walk-in. Sending it as
  // 'website' lets Meta match by hashed phone/fbc and credit the ad — that's
  // the whole point of the admin form's Ad Source dropdown.
  const hasAdAttribution = Boolean(
    input.fbclid || input.gclid || input.utmSource
  );
  const actionSource = hasAdAttribution
    ? 'website'
    : ACTION_SOURCE_MAP[input.source] || 'website';
  const isWebsite = actionSource === 'website';

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        // Stable per-booking, per-event-type id → if this fire is somehow
        // triggered twice for the same booking, Meta dedupes on this and
        // counts it once. Different event types never collide with each
        // other (see the header comment for why that separation matters).
        event_id: eventId,
        action_source: actionSource,
        // event_source_url is only meaningful (and required) for website
        // events. Omit it for offline sources — Meta expects that.
        ...(isWebsite
          ? { event_source_url: `https://elegant-suite.com/thank-you?ref=${input.bookingRef}` }
          : {}),
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
          // Extra hints for our own reports; Meta ignores unknown keys but
          // shows them in the raw event log, useful when auditing attribution.
          booking_source: input.source,
          ...(input.utmSource   ? { utm_source:   input.utmSource   } : {}),
          ...(input.utmMedium   ? { utm_medium:   input.utmMedium   } : {}),
          ...(input.utmCampaign ? { utm_campaign: input.utmCampaign } : {}),
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

/** Fires the instant a booking is submitted — see the header comment. This
 *  is the fast, unconditional intent signal the ad algorithm learns from. */
export async function sendBookingPurchaseEvent(input: BookingCapiInput): Promise<CapiResult> {
  return sendBookingCapiEvent('Purchase', `booking-completed-${input.bookingRef}`, input);
}

/** Fires only when admin marks a booking COMPLETED — see the header comment.
 *  A distinct event/event_id from Purchase, so it can never double-count
 *  revenue even when it lands weeks after the original Purchase fire. */
export async function sendStayCompletedEvent(input: BookingCapiInput): Promise<CapiResult> {
  return sendBookingCapiEvent('StayCompleted', `stay-completed-${input.bookingRef}`, input);
}

// ══════════════════════════════════════════════════════════════════════════
// LEAD event (pre-contact intent capture)
// ══════════════════════════════════════════════════════════════════════════
// Fired the moment a guest submits the "Name + intent" modal on a WhatsApp /
// Call button. Server-side so ad-blockers can't strip it, and we always have
// a hashed name → higher EMQ than the browser Pixel's cookie-only Lead.
// intent='booking' is the strong buying signal; intent='info' is a weaker
// research signal (still useful for Lookalikes, less for ROAS).

interface InquiryCapiInput {
  inquiryId: string;               // stable id → dedup key
  guestName: string;
  guestPhone?: string | null;
  guestEmail?: string | null;
  intent: 'booking' | 'info';
  channel: 'whatsapp' | 'call';
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  eventSourceUrl?: string | null;  // the page the button was clicked from
  /** Raw _fbc / _fbp cookie values — see BookingCapiInput for why these are
   *  preferred over reconstructing fbc from fbclid. Always available here
   *  since Lead fires inside the guest's own modal-submit request. */
  fbc?: string | null;
  fbp?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}

export async function sendInquiryLeadEvent(input: InquiryCapiInput): Promise<CapiResult> {
  if (!ACCESS_TOKEN) {
    return { success: false, error: 'META_ACCESS_TOKEN not configured' };
  }

  const parts = input.guestName.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName  = parts.slice(1).join(' ') || '';

  const userData: Record<string, string[] | string> = {};
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
  if (input.fbc) {
    userData.fbc = input.fbc;
  } else if (input.fbclid) {
    userData.fbc = `fb.1.${Date.now()}.${input.fbclid}`;
  }
  if (input.fbp) userData.fbp = input.fbp;
  if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        // Stable per-inquiry id → the same modal submission cannot double-count
        // even if the client retries or a network glitch replays it.
        event_id: `inquiry-${input.inquiryId}`,
        // Always 'website' here — the click originates on the site, before the
        // guest ever leaves for wa.me / tel:. Correct action_source is what
        // lets Meta credit this Lead back to the ad campaign that drove it.
        action_source: 'website',
        event_source_url: input.eventSourceUrl || 'https://elegant-suite.com/',
        user_data: userData,
        custom_data: {
          content_name: input.intent === 'booking' ? 'Booking intent' : 'Info inquiry',
          content_category: 'Hotel Inquiry',
          lead_event_source: input.channel, // whatsapp | call — for reporting
          intent: input.intent,
          ...(input.utmSource   ? { utm_source:   input.utmSource   } : {}),
          ...(input.utmMedium   ? { utm_medium:   input.utmMedium   } : {}),
          ...(input.utmCampaign ? { utm_campaign: input.utmCampaign } : {}),
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
