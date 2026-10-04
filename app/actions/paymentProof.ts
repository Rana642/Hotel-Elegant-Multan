'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, resolveNotificationEmail } from '@/lib/emailNotify';

/**
 * Attach a bank-transfer screenshot to a booking AFTER it was submitted.
 *
 * Deals require full advance payment, but the guest no longer has to pay
 * before submitting the form (that step killed conversions) — the thank-you
 * page shows the bank details and lets them upload proof here. Gated the same
 * way as the thank-you page itself: knowing the exact booking_ref.
 */
export async function attachPaymentScreenshot(
  bookingRef: string,
  screenshotUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const ref = String(bookingRef || '').trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // Only accept files from our own public payment-screenshots bucket.
  const allowedPrefix = `${supabaseUrl}/storage/v1/object/public/payment-screenshots/`;
  if (!ref || !supabaseUrl || !screenshotUrl.startsWith(allowedPrefix)) {
    return { success: false, error: 'Upload failed — please try again or send it on WhatsApp.' };
  }

  const service = createServiceClient();
  const { data: booking } = await service
    .from('bookings')
    .select('id, booking_ref, guest_name, guest_phone, grand_total, status, advance_payment_screenshot_url')
    .eq('booking_ref', ref)
    .single();

  if (!booking) return { success: false, error: 'Booking not found.' };
  if (booking.status === 'cancelled') return { success: false, error: 'This booking was cancelled.' };

  const { error } = await service
    .from('bookings')
    .update({ advance_payment_screenshot_url: screenshotUrl })
    .eq('id', booking.id);
  if (error) return { success: false, error: 'Could not save the screenshot — please send it on WhatsApp.' };

  try {
    const { email } = await resolveNotificationEmail();
    await sendEmail({
      to: email,
      from: 'Hotel Elegant Bookings <noreply@elegant-suite.com>',
      subject: `Payment screenshot received — ${booking.booking_ref}`,
      html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1A0B2E">Payment screenshot — ${booking.booking_ref}</h2>
  <p>${booking.guest_name} (${booking.guest_phone}) uploaded a bank-transfer screenshot for a total of
  <b>PKR ${Number(booking.grand_total).toLocaleString('en-PK')}</b>. Verify the transfer before confirming.</p>
  <a href="${screenshotUrl}" target="_blank" style="color:#1A0B2E;text-decoration:underline">View payment screenshot</a><br>
  <img src="${screenshotUrl}" alt="Payment screenshot" style="max-width:280px;margin-top:8px;border:1px solid #ddd" />
</div>`,
    });
  } catch {
    // Email is best-effort — the screenshot is already on the booking.
  }

  return { success: true };
}
