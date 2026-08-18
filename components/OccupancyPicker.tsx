'use client';

import { useRef, useState } from 'react';
import { Users, Minus, Plus } from 'lucide-react';
import Popover from './Popover';

/**
 * "Select Occupancy" — merges the separate Adults / Children (and optionally
 * Extra Beds) selects into one field with a stepper popover. Controlled by the
 * parent; Extra Beds row appears only when `extraBeds` is a number (the full
 * booking form passes it, the compact search bars don't).
 */
interface Value {
  adults: number;
  children: number;
  extraBeds?: number;
}
interface Props {
  adults: number;
  children: number;
  /** Pass a number to enable the Extra Beds row; omit to hide it. */
  extraBeds?: number;
  maxAdults?: number;
  maxChildren?: number;
  maxExtraBeds?: number;
  onChange: (v: Value) => void;
  label?: string;
  triggerClassName?: string;
  className?: string;
}

function summarize(adults: number, children: number, extraBeds?: number): string {
  const parts = [`${adults} adult${adults !== 1 ? 's' : ''}`, `${children} child${children !== 1 ? 'ren' : ''}`];
  if (typeof extraBeds === 'number' && extraBeds > 0) {
    parts.push(`${extraBeds} extra bed${extraBeds !== 1 ? 's' : ''}`);
  }
  return parts.join(' · ');
}

function Stepper({ label, hint, value, min, max, onChange }: {
  label: string; hint?: string; value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-montserrat text-sm font-semibold text-[#1A0B2E]">{label}</p>
        {hint && <p className="font-montserrat text-xs text-gray-400">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-[#1A0B2E] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#E30613] hover:text-[#E30613] transition-colors"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={15} />
        </button>
        <span className="font-montserrat text-sm font-semibold text-[#1A0B2E] w-5 text-center tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-[#1A0B2E] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#E30613] hover:text-[#E30613] transition-colors"
          aria-label={`Increase ${label}`}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

export default function OccupancyPicker({
  adults,
  children,
  extraBeds,
  maxAdults = 6,
  maxChildren = 4,
  maxExtraBeds = 2,
  onChange,
  label = 'Select Occupancy',
  triggerClassName = '',
  className = '',
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const showExtraBeds = typeof extraBeds === 'number';

  return (
    <div className={className}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName || 'w-full flex items-center gap-2 bg-white border border-gray-200 px-4 py-3 text-left'}
      >
        <Users size={16} className="text-[#E30613] shrink-0" />
        <span className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] font-montserrat font-semibold tracking-widest uppercase text-gray-500">
            {label}
          </span>
          <span className="font-montserrat text-sm text-gray-900 truncate">
            {summarize(adults, children, extraBeds)}
          </span>
        </span>
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} desktopWidth={300} className="bg-white border border-gray-200 shadow-2xl">
        <div className="px-5 py-2">
          <div className="flex items-center justify-between py-2 sm:hidden">
            <p className="font-playfair font-semibold text-base text-[#1A0B2E]">Guests</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-montserrat font-semibold text-gray-500 uppercase tracking-wider">Close</button>
          </div>
          <Stepper
            label="Adults" value={adults} min={1} max={maxAdults}
            onChange={(n) => onChange({ adults: n, children, ...(showExtraBeds ? { extraBeds } : {}) })}
          />
          <div className="border-t border-gray-100" />
          <Stepper
            label="Children" hint="Ages 10+" value={children} min={0} max={maxChildren}
            onChange={(n) => onChange({ adults, children: n, ...(showExtraBeds ? { extraBeds } : {}) })}
          />
          {showExtraBeds && (
            <>
              <div className="border-t border-gray-100" />
              <Stepper
                label="Extra Beds" hint="PKR 2,500 / bed / night" value={extraBeds as number} min={0} max={maxExtraBeds}
                onChange={(n) => onChange({ adults, children, extraBeds: n })}
              />
            </>
          )}
          <div className="pt-2 pb-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 bg-[#1A0B2E] text-white text-xs font-montserrat font-semibold uppercase tracking-wider rounded"
            >
              Done
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
