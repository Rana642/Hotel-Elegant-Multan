'use server';

import { headers } from 'next/headers';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { readMetaBrowserCookies } from '@/lib/metaCapi';
import { checkRoomAvailability } from '@/lib/availability';
import { createBookingCore, type BookingInput, type BookingResult } from '@/lib/bookingCore';

/**
 * Lightweight client-facing availability check — same logic the booking
 * submission enforces, exposed so the room-detail sidebar and the full
 * booking form can warn the guest BEFORE they fill in every field, instead
 * of only finding out "fully booked" after hitting submit.
 */
export async function checkAvailability(roomId: string, checkIn: string, checkOut: string) {
  return checkRoomAvailability(roomId, checkIn, checkOut);
}

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  // Two-tier rate limit per IP: a burst window blunts form-spam bots, a wider
  // sustained window catches slower drip-flooding. Each real booking runs
  // several DB writes; without this, spam can pin the process pool and 503 the
  // host (which is what happened on 2026-07-22).
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  // Captured now (not later near the CAPI fire) so the read happens while
  // the request context is still definitely live — see
  // readMetaBrowserCookies' doc comment in lib/metaCapi.ts for why this
  // only works because this action is invoked by the guest's own browser.
  const userAgent = hdrs.get('user-agent');
  const { fbc, fbp } = await readMetaBrowserCookies();
  const burst = rateLimit(`booking:burst:${ip}`, 5, 60_000);
  if (!burst.allowed) {
    return {
      success: false,
      error: `Too many booking attempts. Please wait ${burst.retryAfter}s and try again, or contact us on WhatsApp.`,
    };
  }
  const sustained = rateLimit(`booking:sustained:${ip}`, 20, 60 * 60_000);
  if (!sustained.allowed) {
    return {
      success: false,
      error: 'Too many booking attempts today. Please contact us on WhatsApp to book — we reply immediately.',
    };
  }
  return createBookingCore(input, { ip: ip === 'unknown' ? null : ip, userAgent, fbc, fbp });
}
