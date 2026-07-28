'use server';

import { createClient as createBaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

// Team-management actions. All require the caller to be a full admin —
// receptionists can't add/remove staff. The Supabase Auth admin API needs
// the service role key, which we already load server-side.

/** Same URL + service key we use in createServiceClient, but with the auth
 *  admin API enabled — that API is only exposed on this specific client. */
function authAdminClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function inviteStaff(input: {
  email: string;
  password: string;
  role: 'admin' | 'receptionist';
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const role = input.role;

  if (!/^\S+@\S+\.\S+$/.test(email)) return { success: false, error: 'Invalid email address.' };
  if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
  if (!['admin', 'receptionist'].includes(role)) return { success: false, error: 'Invalid role.' };

  const authClient = authAdminClient();

  // Create the Supabase Auth user with email pre-confirmed so the person
  // can sign in immediately — no confirm-email round trip.
  const { data: created, error: authErr } = await authClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !created?.user) {
    return { success: false, error: authErr?.message || 'Failed to create auth user.' };
  }

  // Now link the auth user into admin_users with the chosen role.
  const service = createServiceClient();
  const { error: insertErr } = await service.from('admin_users').insert({
    id: created.user.id,
    email,
    role,
  });

  if (insertErr) {
    // Roll back the auth user so we don't leave an orphaned account.
    await authClient.auth.admin.deleteUser(created.user.id).catch(() => {});
    return { success: false, error: `Could not link role: ${insertErr.message}` };
  }

  revalidatePath('/admin/settings/team');
  return { success: true };
}

export async function updateStaffRole(userId: string, role: 'admin' | 'receptionist') {
  const currentUser = await requireAdmin();
  if (userId === currentUser.id && role !== 'admin') {
    return { success: false, error: "You can't demote yourself — ask another admin." };
  }
  const service = createServiceClient();
  const { error } = await service.from('admin_users').update({ role }).eq('id', userId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/settings/team');
  return { success: true };
}

export async function removeStaff(userId: string) {
  const currentUser = await requireAdmin();
  if (userId === currentUser.id) {
    return { success: false, error: "You can't remove yourself." };
  }
  // Delete the auth user; ON DELETE CASCADE on admin_users.id drops the
  // admin_users row automatically.
  const { error } = await authAdminClient().auth.admin.deleteUser(userId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/settings/team');
  return { success: true };
}
