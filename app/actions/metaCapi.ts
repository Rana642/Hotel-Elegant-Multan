'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendBookingPurchaseEvent } from '@/lib/metaCapi';

/**
 * Fire the Meta Conversions API "Purchase" event for a booking that has
 * just been marked confirmed in the admin dashboard. Only callable by an
 * authenticated admin (session-based). CAPI failures are non-fatal — the
 * admin status update itself already succeeded before this runs.
 */
export async function fireBookingConfirmedCapi(bookingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Auth: must be a logged-in admin (same is_admin() check as elsewhere)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (!adminRow) return { success: false, error: 'Not an admin' };

  // Load booking + room via service client (RLS-independent, we're authorised)
  const service = createServiceClient();
  const { data: booking, error } = await service
    .from('bookings')
    .select('*, rooms(name)')
    .eq('id', bookingId)
    .single();
  if (error || !booking) return { success: false, error: 'Booking not found' };

  const result = await sendBookingPurchaseEvent({
    bookingRef: booking.booking_ref,
    guestName: booking.guest_name,
    guestPhone: booking.guest_phone,
    guestEmail: booking.guest_email,
    roomName: booking.rooms?.name || 'Hotel Room',
    grandTotal: booking.grand_total,
    nights: booking.nights,
  });

  return { success: result.success, error: result.error };
}
