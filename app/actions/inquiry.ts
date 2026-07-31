'use server';

import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { sendInquiryLeadEvent } from '@/lib/metaCapi';
import { sendEmail, resolveNotificationEmail } from '@/lib/emailNotify';
import { formatDate, formatKarachiTime } from '@/lib/utils';

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

  // Fire admin notification email in the background — same fire-and-forget
  // pattern as CAPI. Reception now gets pinged the moment a WhatsApp/Call
  // modal is submitted, not just when the guest actually completes a
  // booking. Especially important for missed calls or WA drops where the
  // guest never sends the message — this email + the phone number saved
  // in the modal is reception's only callback path.
  queueMicrotask(() => {
    sendInquiryEmail({
      inquiryId,
      guestName: name,
      guestPhone: input.guestPhone,
      guestEmail: input.guestEmail,
      preferredChannel: input.preferredChannel,
      intent: input.intent,
      checkIn:  input.checkIn,
      checkOut: input.checkOut,
      attribution,
      sourceUrl: input.sourceUrl,
      createdAt: new Date(),
    }).catch((e) => {
      console.error(`[inquiry notify] threw for ${inquiryId}`, e);
    });
  });

  return { success: true, inquiryId };
}

// ─────────────────────────────────────────────────────────────────────────
// Admin email notification for new inquiries.
//
// Kept in this file (not a shared helper) because it's a single call site
// with a specific body — the booking notifier is similarly local and this
// keeps the two shapes parallel + independently editable. If a third
// notifier ever shows up, factor the shared HTML shell out then.
// ─────────────────────────────────────────────────────────────────────────

interface InquiryEmailInput {
  inquiryId: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  preferredChannel: 'whatsapp' | 'call';
  intent: 'booking' | 'info';
  checkIn?: string;
  checkOut?: string;
  attribution: Record<string, string | null>;
  sourceUrl?: string;
  createdAt: Date;
}

async function sendInquiryEmail(input: InquiryEmailInput): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elegant-suite.com';
  const { email: adminRecipient } = await resolveNotificationEmail();

  const intentLabel = input.intent === 'booking' ? 'Booking request' : 'Inquiry';
  const channelLabel = input.preferredChannel === 'whatsapp' ? 'WhatsApp' : 'Call';
  const channelColor = input.preferredChannel === 'whatsapp' ? '#25D366' : '#E30613';

  // Compact one-liner attribution — same style the admin inquiries list uses.
  const attr =
    input.attribution.fbclid || input.attribution.utm_source === 'facebook' ? 'Facebook Ads' :
    input.attribution.gclid  || input.attribution.utm_source === 'google'   ? 'Google Ads'   :
    input.attribution.utm_source ? input.attribution.utm_source :
    input.attribution.referrer  ? input.attribution.referrer  :
    'Direct';

  const datesLine = input.checkIn && input.checkOut
    ? `${formatDate(input.checkIn)} → ${formatDate(input.checkOut)}`
    : input.checkIn ? `Check-in ${formatDate(input.checkIn)}` : '—';

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <div style="display:inline-block;background:${channelColor};color:#fff;padding:4px 10px;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;border-radius:3px;margin-bottom:12px">
    ${channelLabel} · ${intentLabel}
  </div>
  <h2 style="color:#1A0B2E;font-size:20px;margin:0 0 6px">New Inquiry — ${input.guestName}</h2>
  <p style="color:#888;font-size:12px;margin:0 0 20px">Received: ${formatKarachiTime(input.createdAt)} PKT</p>

  <div style="background:rgba(26,11,46,0.05);padding:18px 20px;margin:0 0 20px;border-left:4px solid ${channelColor}">
    <table style="width:100%;font-size:14px;color:#333;border-collapse:collapse">
      <tr><td style="padding:4px 0;color:#666;width:120px">Guest</td><td style="font-weight:600">${input.guestName}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Phone</td><td><a href="tel:${input.guestPhone || ''}" style="color:#E30613;text-decoration:none">${input.guestPhone || '—'}</a></td></tr>
      <tr><td style="padding:4px 0;color:#666">Email</td><td>${input.guestEmail || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Wants to</td><td>${input.intent === 'booking' ? 'Book a room' : 'Ask a question'}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Preferred channel</td><td>${channelLabel}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Dates</td><td>${datesLine}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Source</td><td>${attr}</td></tr>
      ${input.sourceUrl ? `<tr><td style="padding:4px 0;color:#666">Page</td><td style="font-size:12px;color:#888;word-break:break-all">${input.sourceUrl}</td></tr>` : ''}
    </table>
  </div>

  <div style="text-align:center;margin:24px 0">
    <a href="${siteUrl}/admin/inquiries" style="display:inline-block;background:#E30613;color:#fff;padding:12px 28px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;border-radius:3px">Open in Admin →</a>
  </div>

  ${input.guestPhone ? `
  <p style="color:#666;font-size:13px;line-height:1.5">
    <strong>Quick actions:</strong>
    &nbsp;<a href="tel:${input.guestPhone}" style="color:#E30613">Call ${input.guestPhone}</a>
    &nbsp;·&nbsp;
    <a href="https://wa.me/${input.guestPhone.replace(/\D/g, '')}" style="color:#25D366">WhatsApp</a>
  </p>` : ''}

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:11px">
    You are receiving this because you are set as the booking notification recipient in
    <a href="${siteUrl}/admin/settings/notifications" style="color:#999">admin settings</a>.
    This inquiry was captured from the pre-contact modal — reception should follow up promptly
    if the guest didn't complete the WhatsApp / Call handoff.
  </p>
</div>`;

  const subject = `${intentLabel} via ${channelLabel} — ${input.guestName}${input.guestPhone ? ' · ' + input.guestPhone : ''}`;

  const result = await sendEmail({
    to: adminRecipient,
    from: 'Hotel Elegant Inquiries <noreply@elegant-suite.com>',
    subject,
    html,
  });

  if (!result.success && !result.notConfigured) {
    console.error(`[inquiry notify] email failed for ${input.inquiryId}`, result.error);
  }
}
