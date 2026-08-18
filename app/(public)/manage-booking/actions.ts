'use server';

import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// Self-service booking lookup. Gated by knowing the booking ref AND a matching
// contact (email or phone) on file — the same "order status" model as any
// hotel/airline. Rate-limited to blunt ref enumeration.

export interface ManageBookingResult {
  success: boolean;
  error?: string;
  booking?: {
    ref: string;
    guestName: string;
    roomName: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults: number;
    children: number;
    extraBeds: number;
    grandTotal: number;
    status: string;
    createdAt: string;
  };
}

// Compare phone numbers by digits only (drop +, spaces, leading zeros) so
// "+92 317…", "0317…" and "92317…" all match.
function normalizePhone(s: string): string {
  return (s || '').replace(/\D/g, '').replace(/^0+/, '');
}

export async function lookupBooking(refInput: string, contactInput: string): Promise<ManageBookingResult> {
  const ip = getClientIp(await headers());
  const rl = rateLimit(`managebooking:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return { success: false, error: `Too many attempts. Please try again in ${rl.retryAfter}s.` };
  }

  const ref = (refInput || '').trim().toUpperCase();
  const contact = (contactInput || '').trim();
  if (!ref || !contact) {
    return { success: false, error: 'Enter your Booking ID and the email or phone you booked with.' };
  }

  const service = createServiceClient();
  const { data } = await service
    .from('bookings')
    .select('*, rooms(name)')
    .eq('booking_ref', ref)
    .maybeSingle();

  if (!data) {
    return { success: false, error: 'No booking found with that Booking ID. Check the ID and try again.' };
  }

  // Identity check — the contact must match the email or phone on the booking.
  const email = (data.guest_email || '').trim().toLowerCase();
  const phone = normalizePhone(data.guest_phone || '');
  const contactLower = contact.toLowerCase();
  const contactPhone = normalizePhone(contact);
  const matches = (email && contactLower === email) || (phone && contactPhone && contactPhone === phone);

  if (!matches) {
    return { success: false, error: 'Those details don’t match this booking. Use the email or phone you booked with.' };
  }

  return {
    success: true,
    booking: {
      ref: data.booking_ref,
      guestName: data.guest_name,
      roomName: data.rooms?.name || 'Room',
      checkIn: data.check_in,
      checkOut: data.check_out,
      nights: data.nights,
      adults: data.adults,
      children: data.children,
      extraBeds: data.extra_beds || 0,
      grandTotal: data.grand_total,
      status: data.status,
      createdAt: data.created_at,
    },
  };
}
