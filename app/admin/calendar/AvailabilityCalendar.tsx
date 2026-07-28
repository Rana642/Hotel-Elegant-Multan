'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Plus, Minus } from 'lucide-react';
import { blockRoomDates, unblockOne } from './actions';

interface Room  { id: string; name: string; slug: string; total_units: number; }
interface Block { id: string; room_id: string; date: string; reason: string; booking_id: string | null; }

interface Props { rooms: Room[]; blocks: Block[]; }

export default function AvailabilityCalendar({ rooms, blocks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0]?.id || '');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState<'maintenance' | 'walkin'>('walkin');
  const [unitsPerDay, setUnitsPerDay] = useState(1);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const room      = rooms.find((r) => r.id === selectedRoom);
  const totalUnits = room?.total_units ?? 1;

  // Group blocks by date so each cell can show a "2 of 3 booked" summary AND
  // list the individual blocks (some booking-linked, some walk-in) to unblock.
  const roomBlocks = blocks.filter((b) => b.room_id === selectedRoom);
  const byDate = roomBlocks.reduce<Record<string, Block[]>>((acc, b) => {
    (acc[b.date] ??= []).push(b);
    return acc;
  }, {});

  const handleBlock = () => {
    setMessage('');
    setIsError(false);
    if (!selectedRoom || !blockStart || !blockEnd || blockEnd < blockStart) {
      setIsError(true);
      setMessage('Pick a room and a valid date range.');
      return;
    }
    startTransition(async () => {
      const result = await blockRoomDates({
        roomId: selectedRoom,
        startDate: blockStart,
        endDate:   blockEnd,
        reason:    blockReason,
        unitsPerDay,
      });
      if (!result.success) {
        setIsError(true);
        setMessage(result.error || 'Could not block dates.');
        return;
      }
      setIsError(false);
      setMessage(
        `Blocked ${result.created} unit-day${result.created === 1 ? '' : 's'}` +
          (result.capped
            ? ` — ${result.capped} day${result.capped === 1 ? '' : 's'} were already at capacity`
            : '.')
      );
      setBlockStart('');
      setBlockEnd('');
      router.refresh();
    });
  };

  const handleUnblock = (blockId: string) => {
    setMessage('');
    setIsError(false);
    startTransition(async () => {
      const result = await unblockOne(blockId);
      if (!result.success) {
        setIsError(true);
        setMessage(result.error || 'Could not unblock.');
        return;
      }
      router.refresh();
    });
  };

  const dayOfWeek       = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek  = monthStart.getDay();

  return (
    <div className="space-y-6">
      {/* Room selector — includes total_units badge so admin sees inventory at a glance */}
      <div className="flex flex-wrap gap-2">
        {rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoom(r.id)}
            className={`px-4 py-2 text-xs font-montserrat font-semibold border transition-colors flex items-center gap-2 ${
              selectedRoom === r.id
                ? 'bg-[#1A0B2E] text-white border-[#1A0B2E]'
                : 'border-gray-200 text-gray-600 hover:border-[#1A0B2E]'
            }`}
          >
            {r.name}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                selectedRoom === r.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}
              title="Total units of this room type"
            >
              × {r.total_units}
            </span>
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setCurrentDate(addDays(monthStart, -1))} className="p-1.5 hover:text-[#E30613] text-gray-500">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-playfair font-semibold text-lg text-[#1A0B2E]">
            {format(currentDate, 'MMMM yyyy')}
            {room && (
              <span className="ml-3 text-xs font-montserrat font-normal text-gray-500">
                {totalUnits} unit{totalUnits === 1 ? '' : 's'} total
              </span>
            )}
          </h2>
          <button onClick={() => setCurrentDate(addDays(monthEnd, 1))} className="p-1.5 hover:text-[#E30613] text-gray-500">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dayOfWeek.map((d) => (
            <div key={d} className="text-center text-[10px] sm:text-xs font-montserrat font-semibold text-gray-400 py-2">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((day) => {
            const dateStr    = format(day, 'yyyy-MM-dd');
            const dayBlocks  = byDate[dateStr] ?? [];
            const blockedCount = dayBlocks.length;
            const remaining  = Math.max(0, totalUnits - blockedCount);
            const isPast     = day < new Date(new Date().setHours(0, 0, 0, 0));
            const isFullyBooked = remaining === 0 && totalUnits > 0;
            const isPartial     = blockedCount > 0 && remaining > 0;

            // Split by reason so we know which manual (non-booking) blocks
            // can be removed vs which are booking-linked (locked).
            const manualBlocks  = dayBlocks.filter((b) => b.booking_id == null);
            const bookingBlocks = dayBlocks.filter((b) => b.booking_id != null);

            return (
              <div
                key={dateStr}
                className={`relative aspect-square flex flex-col items-center justify-center text-[10px] sm:text-xs font-montserrat border rounded ${
                  isPast ? 'opacity-40' : ''
                } ${
                  isFullyBooked
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : isPartial
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'border-gray-100 text-gray-700 hover:border-[#1A0B2E]/30'
                }`}
                title={
                  isFullyBooked
                    ? `${dateStr}: sold out (${blockedCount}/${totalUnits})`
                    : `${dateStr}: ${remaining} of ${totalUnits} remaining`
                }
              >
                <span className="font-semibold text-sm">{format(day, 'd')}</span>
                {totalUnits > 1 ? (
                  <span className="text-[9px] leading-none mt-0.5 opacity-80">
                    {remaining}/{totalUnits} left
                  </span>
                ) : (
                  isFullyBooked && <span className="text-[9px] leading-none mt-0.5 opacity-80">sold out</span>
                )}
                {/* Unblock control — shown per manual-block. For multi-unit rooms
                    we surface only the LAST manual block's X (removing one unit
                    at a time); booking-linked blocks are locked. */}
                {!isPast && manualBlocks.length > 0 && (
                  <button
                    onClick={() => handleUnblock(manualBlocks[manualBlocks.length - 1].id)}
                    disabled={isPending}
                    title="Release one manually-blocked unit"
                    aria-label={`Unblock one unit on ${dateStr}`}
                    className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors leading-none disabled:opacity-50"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-gray-100 text-[11px] font-montserrat">
          <span className="flex items-center gap-2"><span className="w-4 h-4 bg-red-50 border border-red-200 rounded" />Sold out</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 bg-amber-50 border border-amber-200 rounded" />Partial (some units taken)</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 bg-white border border-gray-100 rounded" />Available</span>
        </div>
        <p className="text-[11px] font-montserrat text-gray-400 mt-3">
          Click the <span className="text-red-600 font-semibold">✕</span> on a
          date to release one manually-blocked unit. Booking-linked blocks can
          only be released by cancelling the booking on the Bookings page.
        </p>
      </div>

      {/* Manual Block — now units-aware. Useful for holding N units when OTA
          bookings come in (e.g. Booking.com sends 2 → block 2 units for those dates). */}
      <div className="bg-white border border-gray-100 p-4 sm:p-6">
        <h3 className="font-montserrat font-semibold text-sm uppercase tracking-wide text-[#1A0B2E] mb-1">
          Block Units Manually
        </h3>
        <p className="text-[11px] font-montserrat text-gray-500 mb-5">
          Use this to reflect bookings from Booking.com / other OTAs, walk-in
          holds, or maintenance. Blocks one or more units per day — capped at
          this room's total inventory.
        </p>
        <div className="grid sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-montserrat font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From</label>
            <input type="date" value={blockStart} min={today} onChange={(e) => setBlockStart(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E] rounded" />
          </div>
          <div>
            <label className="block text-[10px] font-montserrat font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To (incl.)</label>
            <input type="date" value={blockEnd} min={blockStart || today} onChange={(e) => setBlockEnd(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E] rounded" />
          </div>
          <div>
            <label className="block text-[10px] font-montserrat font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Units / day</label>
            <div className="flex items-center border border-gray-200 rounded">
              <button
                type="button"
                onClick={() => setUnitsPerDay(Math.max(1, unitsPerDay - 1))}
                className="px-2.5 py-2.5 text-gray-500 hover:text-[#1A0B2E]"
              >
                <Minus size={14} />
              </button>
              <span className="flex-1 text-center text-sm font-montserrat font-semibold text-[#1A0B2E]">
                {unitsPerDay}
              </span>
              <button
                type="button"
                onClick={() => setUnitsPerDay(Math.min(totalUnits, unitsPerDay + 1))}
                className="px-2.5 py-2.5 text-gray-500 hover:text-[#1A0B2E]"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-montserrat font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reason</label>
            <select value={blockReason} onChange={(e) => setBlockReason(e.target.value as 'walkin' | 'maintenance')}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E] rounded">
              <option value="walkin">Walk-in / OTA</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <button onClick={handleBlock} disabled={isPending} className="btn-red py-2.5 disabled:opacity-50 text-xs">
            {isPending ? 'Blocking…' : 'Block'}
          </button>
        </div>
        {message && (
          <p className={`text-xs font-montserrat mt-4 ${isError ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
