'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

// Status flips are open to any staff (both reception and admin can work
// inquiries). Permanent DELETE is admin-only — requireAdmin() below
// bounces reception before the row is touched.

type Status = 'new' | 'converted' | 'closed' | 'spam';

/** `notes` doubles as the staff remark shown next to a closed/spam inquiry
 *  (e.g. "no response after 3 days", "found a cheaper OTA rate"). Optional —
 *  staff mid-shift shouldn't be blocked from closing a row just because they
 *  didn't type a reason. Reopening a row leaves the last remark in place
 *  rather than clearing it, so the history of why it was closed survives a
 *  reopen/re-close cycle; pass an explicit empty string to clear it. */
export async function updateInquiryStatus(inquiryId: string, status: Status, notes?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (!adminRow) return { success: false, error: 'Not an admin' };

  const update: { status: Status; notes?: string } = { status };
  if (notes !== undefined) update.notes = notes.trim().slice(0, 500);

  const { error } = await supabase
    .from('inquiries')
    .update(update)
    .eq('id', inquiryId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/inquiries');
  return { success: true };
}

/** Called from the New Booking flow once staff finalises a booking that
 *  came from an inquiry — flips status to 'converted' and links the row. */
export async function markInquiryConverted(inquiryId: string, bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (!adminRow) return { success: false, error: 'Not an admin' };

  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'converted', booking_id: bookingId })
    .eq('id', inquiryId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/inquiries');
  return { success: true };
}

/** Permanently delete an inquiry row. Admin-only — requireAdmin() short-
 *  circuits with a redirect if a receptionist ever hits this action. Uses
 *  the service client so the row is removed even from behind RLS. */
export async function deleteInquiry(inquiryId: string) {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service.from('inquiries').delete().eq('id', inquiryId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/inquiries');
  revalidatePath('/admin/dashboard');
  return { success: true };
}
