'use client';

import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Popover from './Popover';

/**
 * "Select Date" — a Booking.com-style range picker that replaces the two raw
 * `<input type=date>` boxes across the guest booking flow. Controlled: the
 * parent owns `checkIn` / `checkOut` (ISO yyyy-mm-dd) and everything
 * downstream (pricing, availability, submit) is unchanged.
 */
interface Props {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Earliest selectable date (ISO). Defaults to today. */
  minDate?: string;
  label?: string;
  /** Chrome for the trigger field so each surface keeps its own look. */
  triggerClassName?: string;
  className?: string;
}

// ── Local date helpers (no TZ drift: yyyy-mm-dd is treated as a local day) ──
function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function fmtShort(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthCells(view: Date): (Date | null)[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startDow = first.getDay();
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
  return cells;
}

export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  minDate,
  label = 'Select Date',
  triggerClassName = '',
  className = '',
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // Left-hand visible month; the right month is +1.
  const [view, setView] = useState<Date>(() => new Date((checkIn ? parseISO(checkIn) : new Date()).getFullYear(), (checkIn ? parseISO(checkIn) : new Date()).getMonth(), 1));
  // Half-open selection while the guest is mid-pick (start chosen, no end yet).
  const [pendingStart, setPendingStart] = useState<Date | null>(null);

  const min = useMemo(() => startOfDay(minDate ? parseISO(minDate) : new Date()), [minDate]);
  const inISO = checkIn || '';
  const outISO = checkOut || '';

  const nights = useMemo(() => {
    if (!inISO || !outISO || outISO <= inISO) return 0;
    return Math.round((parseISO(outISO).getTime() - parseISO(inISO).getTime()) / 86400000);
  }, [inISO, outISO]);

  const handleDayClick = (day: Date) => {
    const d = startOfDay(day);
    if (d < min) return;

    if (!pendingStart) {
      // Begin a fresh range.
      setPendingStart(d);
      return;
    }
    if (d <= pendingStart) {
      // Clicked before/on the start — treat as a new start.
      setPendingStart(d);
      return;
    }
    // Complete the range.
    onChange(toISO(pendingStart), toISO(d));
    setPendingStart(null);
    setOpen(false);
  };

  const openPicker = () => {
    setPendingStart(null);
    // Snap the visible month to the current check-in when re-opening.
    if (inISO) setView(new Date(parseISO(inISO).getFullYear(), parseISO(inISO).getMonth(), 1));
    setOpen(true);
  };

  const rangeStart = pendingStart ?? (inISO ? parseISO(inISO) : null);
  const rangeEnd = pendingStart ? null : (outISO ? parseISO(outISO) : null);

  const dayState = (day: Date) => {
    const d = startOfDay(day);
    const disabled = d < min;
    const isStart = rangeStart && d.getTime() === startOfDay(rangeStart).getTime();
    const isEnd = rangeEnd && d.getTime() === startOfDay(rangeEnd).getTime();
    const inRange = rangeStart && rangeEnd && d > startOfDay(rangeStart) && d < startOfDay(rangeEnd);
    return { disabled, isStart, isEnd, inRange };
  };

  const Month = ({ offset }: { offset: number }) => {
    const m = new Date(view.getFullYear(), view.getMonth() + offset, 1);
    const cells = monthCells(m);
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2 px-1">
          {offset === 0 ? (
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              disabled={new Date(view.getFullYear(), view.getMonth(), 1) <= new Date(min.getFullYear(), min.getMonth(), 1)}
              className="p-1 text-gray-500 hover:text-[#1A0B2E] disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
          ) : <span className="w-6" />}
          <span className="font-montserrat font-semibold text-sm text-[#1A0B2E]">
            {MONTHS[m.getMonth()]} {m.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            // On desktop the "next" arrow belongs to the right-hand (offset 1)
            // month; keep the offset-0 slot filled but invisible for symmetry.
            // On mobile only offset 0 renders, so it needs the arrow.
            className={`p-1 text-gray-500 hover:text-[#1A0B2E] ${offset === 0 ? 'sm:invisible' : ''}`}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] font-montserrat font-semibold text-gray-400 py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const { disabled, isStart, isEnd, inRange } = dayState(day);
            const selected = isStart || isEnd;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                className={`h-9 text-xs font-montserrat transition-colors ${
                  disabled ? 'text-gray-300 cursor-not-allowed'
                  : selected ? 'bg-[#E30613] text-white font-semibold'
                  : inRange ? 'bg-[#E30613]/10 text-[#1A0B2E]'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={triggerClassName || 'w-full flex items-center gap-2 bg-white border border-gray-200 px-4 py-3 text-left'}
      >
        <CalendarDays size={16} className="text-[#E30613] shrink-0" />
        <span className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] font-montserrat font-semibold tracking-widest uppercase text-gray-500">
            {label}
          </span>
          <span className="font-montserrat text-sm text-gray-900 truncate">
            {inISO && outISO && nights > 0
              ? `${fmtShort(inISO)} — ${fmtShort(outISO)}`
              : 'Add dates'}
          </span>
        </span>
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} desktopWidth={620} className="bg-white border border-gray-200 shadow-2xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3 sm:hidden">
            <p className="font-playfair font-semibold text-base text-[#1A0B2E]">
              {pendingStart ? 'Select check-out' : 'Select dates'}
            </p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-montserrat font-semibold text-gray-500 uppercase tracking-wider">Close</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Month offset={0} />
            <div className="hidden sm:block flex-1 min-w-0"><Month offset={1} /></div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <p className="font-montserrat text-xs text-gray-500">
              {nights > 0 ? `${nights} night${nights !== 1 ? 's' : ''}` : 'Pick a check-in date'}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="py-2 px-5 bg-[#1A0B2E] text-white text-xs font-montserrat font-semibold uppercase tracking-wider"
            >
              Done
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
