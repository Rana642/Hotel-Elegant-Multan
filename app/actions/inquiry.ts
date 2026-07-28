'use server';

import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { sendInquiryLeadEvent } from '@/lib/metaCapi';

// Public-facing server action fired by the pre-contact modal on every
// WhatsApp / Call button on the site. Records the click as an "inquiry"
// so admin can later convert it to a booking, AND fires a Meta CAPI
// Lead event with hashed name → far better signal quality than the old
// cookie-only browser Lead.

export interface CreateInquiryInput {
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  preferredChannel: 'whatsapp' | 'call';
  intent: 'booking' | 'info';
  checkIn?: string;      // optional, YYYY-MM-DD
  checkOut?: string;     // optional, YYYY-MM-DD
  /** First-touch attribution captured by <UtmCapture /> in sessionStorage. */
  attribution?: Record<string, string>;
  /** Page the button was clicked from — feeds Meta's event_source_url. */
  sourceUrl?: string;
}

interface CreateInquiryResult {
  success: boolean;
  inquiryId?: string;
  error?: string;
}

// Same bounded attribution field list the booking flow uses. Prevents anyone
// from writing 100 junk fields into an inquiry row by crafting a payload.
const ATTRIBUTION_FIELDS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'referrer', 'landing_path',
] as const;

function sanitizeAttribution(input: Record<string, string> | undefined): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of ATTRIBUTION_FIELDS) {
    const raw = input?.[key];
    out[key] = typeof raw === 'string' && raw.length > 0 ? raw.slice(0, 200) : null;
  }
  return out;
}

export async function createInquiry(input: CreateInquiryInput): Promise<CreateInquiryResult> {
  // Same two-tier rate limit as bookings — a 5/min burst window blocks
  // rapid-fire spam, a 30/hour sustained window catches slower flood
  // patterns. Inquiries are lighter than bookings so ceilings are looser.
  const ip = getClientIp(await headers());
  const burst = rateLimit(`inquiry:burst:${ip}`, 5, 60_000);
  if (!burst.allowed) {
    return { success: false, error: 'Bahut jaldi jaldi try kar rahe hain — thoda ruk kar dobara try karein.' };
  }
  const sustained = rateLimit(`inquiry:sustained:${ip}`, 30, 60 * 60_000);
  if (!sustained.allowed) {
    return { success: false, error: 'Bahut zyada requests — kuch der baad try karein.' };
  }

  // Minimum validation — everything else is optional.
  const name = input.guestName?.trim();
  if (!name || name.length < 2) {
    return { success: false, error: 'Please enter your name.' };
  }
  if (!['whatsapp', 'call'].includes(input.preferredChannel)) {
    return { success: false, error: 'Invalid channel.' };
  }
  if (!['booking', 'info'].includes(input.intent)) {
    return { success: false, error: 'Invalid intent.' };
  }

  const attribution = sanitizeAttribution(input.attribution);
  const supabase = createServiceClient();

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      guest_name: name.slice(0, 120),
      guest_phone: input.guestPhone?.trim().slice(0, 30) || null,
      guest_email: input.guestEmail?.trim().toLowerCase().slice(0, 120) || null,
      preferred_channel: input.preferredChannel,
      intent: input.intent,
      check_in:  input.checkIn  || null,
      check_out: input.checkOut || null,
      status: 'new',
      ...attribution,
    })
    .select('id')
    .single();

  if (error || !inquiry) {
    // Log-and-degrade — never block the WhatsApp/tel handoff on a DB error.
    // The guest is mid-click and expects the chat/call to open immediately.
    return { success: false, error: 'Could not save inquiry, but you can still contact us.' };
  }

  // Fire Meta CAPI Lead in the background — we don't await it because the
  // browser is about to navigate to wa.me/tel: and the round-trip to Meta
  // (~300ms typical) would add visible latency. `queueMicrotask` schedules
  // it after the response is sent but before the process idles.
  const inquiryId = inquiry.id as string;
  queueMicrotask(() => {
    sendInquiryLeadEvent({
      inquiryId,
      guestName: name,
      guestPhone: input.guestPhone,
      guestEmail: input.guestEmail,
      intent: input.intent,
      channel: input.preferredChannel,
      utmSource:   attribution.utm_source,
      utmMedium:   attribution.utm_medium,
      utmCampaign: attribution.utm_campaign,
      fbclid:      attribution.fbclid,
      gclid:       attribution.gclid,
      eventSourceUrl: input.sourceUrl,
    }).catch(() => {
      // Non-fatal: booking / inquiry is already saved. Meta being slow or
      // rejecting is not a reason to break the guest's flow.
    });
  });

  return { success: true, inquiryId };
}
