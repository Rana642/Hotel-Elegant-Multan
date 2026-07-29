import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { readEmailConfig } from '@/lib/emailNotify';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import TestNotifyButton from './TestNotifyButton';
import RecipientForm from './RecipientForm';

export const metadata: Metadata = { title: 'Notifications' };
export const revalidate = 0;

export default async function NotificationsPage() {
  await requireAdmin();
  const cfg = await readEmailConfig();

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/settings" className="text-gray-400 hover:text-[#E30613] text-sm font-montserrat">
          <ArrowLeft className="inline" size={14} /> Settings
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-montserrat font-semibold text-sm text-[#1A0B2E]">Notifications</span>
      </div>

      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-2">Email Notifications</h1>
      <p className="font-montserrat text-sm text-gray-500 mb-8">
        When a guest submits the booking form, a summary email is sent to the address configured
        below. Guests with an email address also get a confirmation.
      </p>

      {/* Config health card */}
      <div className="bg-white border border-gray-100 p-5 mb-6">
        <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-4">
          Current configuration
        </h2>

        <div className="space-y-3">
          {/* Resend key status */}
          <div className="flex items-start gap-3">
            {cfg.resendConfigured ? (
              <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-montserrat text-sm text-[#1A0B2E] font-medium">
                Resend API key
              </p>
              <p className="text-xs text-gray-500 mt-0.5 font-montserrat">
                {cfg.resendConfigured ? (
                  <>
                    Configured — key ending in{' '}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      {cfg.resendKeyHint}
                    </code>
                  </>
                ) : (
                  <>
                    <span className="text-red-600 font-semibold">Not configured.</span> No booking
                    emails can be sent until you add <code className="bg-gray-100 px-1 rounded text-[11px]">RESEND_API_KEY</code>{' '}
                    to your Hostinger environment variables and redeploy.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Notification recipient — now editable below via RecipientForm */}
          <div className="flex items-start gap-3">
            {cfg.isDefaultRecipient ? (
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-montserrat text-sm text-[#1A0B2E] font-medium">
                Notification recipient
              </p>
              <p className="text-xs text-gray-500 mt-0.5 font-montserrat break-all">
                {cfg.notificationEmail}
                <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-400">
                  ({cfg.recipientSource === 'admin' ? 'set in admin' : cfg.recipientSource === 'env' ? 'from env var' : 'default fallback'})
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Editable recipient form — the admin-editable value overrides the env
          var so aap here anytime bina redeploy naya email set kar sakein. */}
      <div className="bg-white border border-gray-100 p-5 mb-6">
        <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-2">
          Change notification recipient
        </h2>
        <p className="text-xs text-gray-500 font-montserrat mb-4">
          Enter the email address that should receive every new booking notification.
          Change takes effect immediately — the next booking will go to the address you set here.
          Leave blank to fall back to the environment variable / hardcoded default.
        </p>
        <RecipientForm
          initialValue={cfg.recipientSource === 'admin' ? cfg.notificationEmail : ''}
          fallbackHint={
            cfg.recipientSource === 'admin'
              ? undefined
              : `Currently using ${cfg.recipientSource === 'env' ? 'the HOTEL_NOTIFICATION_EMAIL env var' : 'the hardcoded default'}: ${cfg.notificationEmail}`
          }
        />
      </div>

      {/* Test send */}
      <div className="bg-white border border-gray-100 p-5">
        <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-2">
          Send test email
        </h2>
        <p className="text-xs text-gray-500 mb-4 font-montserrat">
          Click below to fire a real email to <strong className="text-[#1A0B2E]">{cfg.notificationEmail}</strong>.
          Check that inbox within 30 seconds; if nothing arrives, the buttons below will show
          the exact Resend error so you know what to fix.
        </p>
        <TestNotifyButton disabled={!cfg.resendConfigured} />
        {!cfg.resendConfigured && (
          <p className="text-[11px] text-gray-400 mt-2 font-montserrat">
            Fix the API key first, then come back to test.
          </p>
        )}
      </div>

      {/* Debug tips */}
      <div className="mt-8 max-w-2xl">
        <h3 className="font-montserrat font-semibold text-xs uppercase tracking-widest text-gray-500 mb-2">
          If test email doesn't arrive
        </h3>
        <ul className="text-xs text-gray-500 font-montserrat space-y-1.5 list-disc pl-5">
          <li>Check the recipient's spam / promotions folder.</li>
          <li>Confirm the sending domain (<code className="bg-gray-100 px-1 rounded">elegant-suite.com</code>) is verified in the Resend dashboard.</li>
          <li>If Resend returns a <em>"You can only send testing emails to your own email address"</em> error, add the notification recipient to Resend's verified list — or verify your domain to allow any recipient.</li>
          <li>Look at Hostinger's server logs for lines starting with <code className="bg-gray-100 px-1 rounded">[booking notify]</code> or <code className="bg-gray-100 px-1 rounded">[emailNotify]</code> — real booking failures now log there too.</li>
        </ul>
      </div>
    </div>
  );
}
