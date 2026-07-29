'use client';

import { useState, useTransition } from 'react';
import { Loader2, MailCheck, MailX } from 'lucide-react';
import { sendTestNotification } from './actions';

export default function TestNotifyButton({ disabled = false }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | null
    | { ok: true; messageId?: string }
    | { ok: false; error: string }
  >(null);

  const handleClick = () => {
    setResult(null);
    startTransition(async () => {
      const r = await sendTestNotification();
      if (r.success) {
        setResult({ ok: true, messageId: r.messageId });
      } else {
        setResult({ ok: false, error: r.error || 'Unknown error' });
      }
    });
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled || isPending}
        className="btn-red py-2.5 px-6 text-xs disabled:opacity-50 flex items-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <MailCheck size={14} />
            Send test email
          </>
        )}
      </button>

      {result?.ok && (
        <div className="mt-4 flex items-start gap-2 bg-green-50 border border-green-200 px-4 py-3 rounded">
          <MailCheck size={16} className="text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-montserrat text-green-800 font-semibold">Sent successfully</p>
            <p className="text-xs text-green-700 font-montserrat mt-0.5">
              Check the recipient inbox in the next 30 seconds.
              {result.messageId && (
                <> Resend message id: <code className="bg-green-100 px-1 rounded text-[10px] font-mono">{result.messageId}</code></>
              )}
            </p>
          </div>
        </div>
      )}

      {result && !result.ok && (
        <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 px-4 py-3 rounded">
          <MailX size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-montserrat text-red-800 font-semibold">Send failed</p>
            <p className="text-xs text-red-700 font-montserrat mt-0.5 break-words">
              {result.error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
