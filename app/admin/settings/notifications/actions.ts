'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { sendEmail, readEmailConfig, resolveNotificationEmail } from '@/lib/emailNotify';
import { createServiceClient } from '@/lib/supabase/server';
import { formatKarachiTime } from '@/lib/utils';

/** Save (or clear) the admin-editable recipient. Stored in the `settings`
 *  table under key='notification_email'. Passing empty string clears it,
 *  which lets the resolver fall back to the env var / default. Effect is
 *  instant — next booking notification uses the new value. */
export async function updateNotificationEmail(rawEmail: string) {
  await requireAdmin();
  const email = rawEmail.trim().toLowerCase();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address (or leave blank to reset).' };
  }

  const service = createServiceClient();
  // Upsert on the `key` primary key. Storing empty string same as "not set"
  // — the resolver treats empty as absent and falls through to env var.
  const { error } = await service
    .from('settings')
    .upsert({ key: 'notification_email', value: email || null, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/settings/notifications');
  return { success: true, saved: email };
}

/** Fire a real Resend email to the configured notification address so the
 *  admin can verify inbox delivery end-to-end. Admin-only — reception can't
 *  hit this. Returns Resend's own error text so the admin sees the exact
 *  reason (unverified domain, bad key, throttle, etc.) instead of a
 *  generic "email failed". */
export async function sendTestNotification() {
  await requireAdmin();
  const cfg = await readEmailConfig();

  if (!cfg.resendConfigured) {
    return {
      success: false,
      error: 'RESEND_API_KEY is not set on the server. Add it to your Hostinger env vars, then redeploy.',
    };
  }

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1A0B2E">✅ Test notification</h2>
  <p style="color:#666">This is a test email sent from your admin panel at ${formatKarachiTime(new Date())} PKT.</p>
  <p style="color:#666">If you're reading this, real booking notifications will also arrive here.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:12px">Hotel Elegant Executive Suites — automatic diagnostic email.</p>
</div>`;

  const result = await sendEmail({
    to: cfg.notificationEmail,
    subject: '✅ Test notification from Hotel Elegant admin',
    html,
  });

  return result;
}
