'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendBookingCompletedGa4Event } from '@/lib/ga4Mp';

/**
 * Fire the GA4 Measurement Protocol "booking_submitted" event for a booking
 * that has just been marked COMPLETED — the Google-side counterpart to
 * fireBookingCompletedCapi (Meta). Same trigger point, same reasoning: see
 * lib/ga4Mp.ts and lib/metaCapi.ts for why 'completed' rather than
 * 'confirmed'. Only callable by an authenticated admin. Failures are
 * non-fatal — the admin status update itself already succeeded.
 */
export async function fireBookingCompletedGa4(bookingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
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

  const service = createServiceClient();
  const { data: booking, error } = await service
    .from('bookings')
    .select('*, rooms(name)')
    .eq('id', bookingId)
    .single();
  if (error || !booking) return { success: false, error: 'Booking not found' };

  const result = await sendBookingCompletedGa4Event({
    bookingRef: booking.booking_ref,
    roomName: booking.rooms?.name || 'Hotel Room',
    grandTotal: booking.grand_total,
    gaClientId: booking.ga_client_id,
    utmSource: booking.utm_source,
    utmMedium: booking.utm_medium,
    utmCampaign: booking.utm_campaign,
  });

  return { success: result.success, error: result.error };
}
