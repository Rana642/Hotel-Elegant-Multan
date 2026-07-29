'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Pencil, Loader2 } from 'lucide-react';
import { updateRoomTotalUnits } from './actions';

interface Props {
  roomId: string;
  currentTotal: number;
  /** Only admins can change inventory. When false, we render a static badge
   *  and no click affordance so reception's UI stays clean. */
  canEdit: boolean;
}

// Small pill that toggles into an inline number input on click. Save via
// Enter or the check button, cancel via Esc or the X button. Optimistic
// value swap on success + router.refresh() so the calendar cells re-render
// with the new capacity in the same tick.
export default function TotalUnitsEditor({ roomId, currentTotal, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentTotal);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <span className="ml-3 text-[10px] text-gray-500">
        × {currentTotal} unit{currentTotal === 1 ? '' : 's'} total
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setEditing(true); setError(''); }}
        title="Edit total units for this room"
        className="ml-3 inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-[#1A0B2E] cursor-pointer group"
      >
        × <span className="font-semibold text-[#1A0B2E]">{currentTotal}</span> unit{currentTotal === 1 ? '' : 's'} total
        <Pencil size={10} className="opacity-40 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  const save = () => {
    setError('');
    if (value === currentTotal) { setEditing(false); return; }
    startTransition(async () => {
      const result = await updateRoomTotalUnits(roomId, value);
      if (!result.success) {
        setError(result.error || 'Save failed.');
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  const cancel = () => {
    setValue(currentTotal);
    setEditing(false);
    setError('');
  };

  return (
    <span className="ml-3 inline-flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500">× </span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') cancel();
        }}
        min={1}
        max={100}
        autoFocus
        disabled={isPending}
        className="w-14 border border-[#1A0B2E] px-2 py-0.5 text-xs font-semibold text-[#1A0B2E] outline-none rounded"
      />
      <span className="text-[10px] text-gray-500">unit{value === 1 ? '' : 's'} total</span>
      <button
        onClick={save}
        disabled={isPending}
        title="Save"
        className="w-5 h-5 flex items-center justify-center rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
      </button>
      <button
        onClick={cancel}
        disabled={isPending}
        title="Cancel"
        className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-50"
      >
        <X size={11} />
      </button>
      {error && (
        <span className="text-[10px] text-red-600 ml-2">{error}</span>
      )}
    </span>
  );
}
