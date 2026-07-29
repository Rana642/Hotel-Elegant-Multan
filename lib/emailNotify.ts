// Shared Resend sender used by the booking notifier + the admin
// notification-health test page. Isolated in one file so both callers
// share the same env-var reading, error logging, and result shape.

import 'server-only';

export interface EmailResult {
  success: boolean;
  /** true when RESEND_API_KEY isn't set — the app degrades silently,
   *  but the health page uses this to render a clear "not configured"
   *  banner instead of showing a mysterious failure. */
  notConfigured?: boolean;
  error?: string;
  /** Resend's message id on success — useful when checking Resend's dashboard. */
  messageId?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Optional from override; defaults to the booking-notification sender
   *  we've registered with Resend for elegant-suite.com. */
  from?: string;
}

const DEFAULT_FROM = 'Hotel Elegant <noreply@elegant-suite.com>';

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      success: false,
      notConfigured: true,
      error: 'RESEND_API_KEY is not configured on this environment.',
    };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: input.from || DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      // Log so Hostinger's stdout/logs actually show the failure — the
      // booking flow used to swallow this entirely and the user had no
      // way to tell whether an email had shipped.
      console.error('[emailNotify] resend error', { to: input.to, subject: input.subject, error });
      return { success: false, error: error.message || 'Resend returned an error.' };
    }
    return { success: true, messageId: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[emailNotify] threw', { to: input.to, subject: input.subject, message });
    return { success: false, error: message };
  }
}

/** Config snapshot used by /admin/settings/notifications to render the
 *  health card. Returns just the presence + non-secret hints — never
 *  echoes the API key back. */
export function readEmailConfig() {
  const key = process.env.RESEND_API_KEY || '';
  return {
    resendConfigured: Boolean(key),
    resendKeyHint: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : null,
    notificationEmail: process.env.HOTEL_NOTIFICATION_EMAIL || 'info@elegant-suite.com',
    isDefaultRecipient: !process.env.HOTEL_NOTIFICATION_EMAIL,
  };
}
