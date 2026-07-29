'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { setDateOverride } from './actions';

interface Props {
  roomId: string;
  date: string;         // YYYY-MM-DD
  defaultTotal: number; // room.total_units — used when no override
  override?: number;    // effective_total from availability_overrides, if any
  minAllowed?: number;  // usually current bookings on this date, so we don't let
                        // admin drop the cap below existing reservations
}

// Editable per-date total cell in the calendar's Total row. Shows the
// effective cap (override if set, else room default). Click to edit; on
// save, if the new value equals the room default the override is cleared
// (returns the cell to its base state).
export default function DateTotalCell({ roomId, date, defaultTotal, override, minAllowed = 0 }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(override ?? defaultTotal);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const effective = override ?? defaultTotal;
  const isOverridden = override !== undefined;

  // Keep local value in sync when props change (e.g. after another cell save
  // triggers a refresh and this cell re-renders).
  useEffect(() => {
    if (!editing) setValue(override ?? defaultTotal);
  }, [override, defaultTotal, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const save = () => {
    const clamped = Math.max(minAllowed, Math.min(100, Math.floor(value) || 0));
    if (clamped === effective) { setEditing(false); return; }
    startTransition(async () => {
      // Pass null when new value equals the room default → server clears the
      // override row; otherwise upsert the override.
      const units = clamped === defaultTotal ? null : clamped;
      await setDateOverride({ roomId, date, units });
      setEditing(false);
      router.refresh();
    });
  };

  const cancel = () => {
    setValue(effective);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center justify-center">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => setValue(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          min={minAllowed}
          max={100}
          disabled={isPending}
          className="w-10 border border-[#1A0B2E] px-1 py-0.5 text-xs text-center font-semibold text-[#1A0B2E] outline-none rounded"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title={`Click to change the cap for ${date}${isOverridden ? ` (currently overridden from ${defaultTotal})` : ''}`}
      className={`w-full text-center text-sm font-semibold hover:bg-[#1A0B2E]/[0.05] rounded py-0.5 transition-colors ${
        isOverridden ? 'text-orange-600 underline decoration-dotted underline-offset-2' : 'text-[#1A0B2E]'
      }`}
    >
      {isPending ? <Loader2 size={11} className="inline animate-spin" /> : effective}
    </button>
  );
}
