'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Admin-only status flips for an inquiry row. RLS on `inquiries` already
// enforces admin-only writes, but we also do an explicit is_admin check
// here so a bad session errors out with a clear message instead of a
// silent noop from the policy.

type Status = 'new' | 'converted' | 'closed' | 'spam';

export async function updateInquiryStatus(inquiryId: string, status: Status) {
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
    .update({ status })
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
