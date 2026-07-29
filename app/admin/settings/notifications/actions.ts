'use server';

import { requireAdmin } from '@/lib/auth';
import { sendEmail, readEmailConfig } from '@/lib/emailNotify';

/** Fire a real Resend email to the configured notification address so the
 *  admin can verify inbox delivery end-to-end. Admin-only — reception can't
 *  hit this. Returns Resend's own error text so the admin sees the exact
 *  reason (unverified domain, bad key, throttle, etc.) instead of a
 *  generic "email failed". */
export async function sendTestNotification() {
  await requireAdmin();
  const cfg = readEmailConfig();

  if (!cfg.resendConfigured) {
    return {
      success: false,
      error: 'RESEND_API_KEY is not set on the server. Add it to your Hostinger env vars, then redeploy.',
    };
  }

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1A0B2E">✅ Test notification</h2>
  <p style="color:#666">This is a test email sent from your admin panel at ${new Date().toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.</p>
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
