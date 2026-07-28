'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// Admin-only booking mutations. Reception role can flip status through
// BookingStatusForm (open policy = is_staff), but PERMANENT DELETE
// belongs to admin — accidental deletion by reception would lose audit
// history plus the linked inquiry back-reference. requireAdmin() bounces
// reception before any row is touched.

export async function deleteBooking(bookingId: string) {
  await requireAdmin();

  const service = createServiceClient();

  // Free the blocked dates first — the FK is ON DELETE SET NULL, not
  // CASCADE, so without this the room stays blocked forever with an
  // orphaned availability_blocks row.
  const { error: blocksError } = await service
    .from('availability_blocks')
    .delete()
    .eq('booking_id', bookingId);
  if (blocksError) {
    return { success: false, error: 'Could not free blocked dates. Booking was not deleted.' };
  }

  const { error: bookingError } = await service
    .from('bookings')
    .delete()
    .eq('id', bookingId);
  if (bookingError) {
    return { success: false, error: 'Could not delete booking.' };
  }

  revalidatePath('/admin/bookings');
  revalidatePath('/admin/dashboard');
  return { success: true };
}
