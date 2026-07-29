'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Check, Loader2, Trash2 } from 'lucide-react';
import { updateNotificationEmail } from './actions';

interface Props {
  /** Empty when the effective recipient is coming from env var / default —
   *  the form starts empty and the fallback banner below tells admin
   *  where the current live value is coming from. */
  initialValue: string;
  fallbackHint?: string;
}

export default function RecipientForm({ initialValue, fallbackHint }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    startTransition(async () => {
      const result = await updateNotificationEmail(email);
      if (!result.success) {
        setError(result.error || 'Save failed.');
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleRemove = () => {
    // Two-step guard: only offer Remove when there's actually something to
    // remove (initialValue set), and require a confirm since it silently
    // routes future notifications to a different mailbox.
    if (!initialValue) return;
    const ok = window.confirm(
      `Remove ${initialValue} as the notification recipient?\n\nFuture bookings will fall back to the env var / default address until you set a new one here.`
    );
    if (!ok) return;
    setError('');
    setSaved(false);
    startTransition(async () => {
      const result = await updateNotificationEmail('');
      if (!result.success) {
        setError(result.error || 'Remove failed.');
        return;
      }
      setEmail('');
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <form onSubmit={handleSave}>
      <label className="block text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5 font-montserrat">
        Email address
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="bookings@yourhotel.com"
          className="flex-1 min-w-0 border border-gray-200 px-3.5 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E] rounded"
          autoComplete="off"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-red py-2.5 px-5 text-xs disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isPending ? 'Saving…' : initialValue ? 'Replace' : 'Save'}
        </button>
        {initialValue && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            title={`Remove ${initialValue}`}
            className="py-2.5 px-4 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-montserrat font-semibold uppercase tracking-wider rounded flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            <Trash2 size={14} />
            Remove
          </button>
        )}
      </div>

      {fallbackHint && !saved && !error && (
        <p className="text-[11px] text-gray-400 mt-2 font-montserrat">
          {fallbackHint}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded mt-3 font-montserrat">
          {error}
        </p>
      )}

      {saved && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded mt-3 font-montserrat flex items-center gap-1.5">
          <Check size={14} /> Saved. Next booking notification will go to this address.
        </p>
      )}
    </form>
  );
}
