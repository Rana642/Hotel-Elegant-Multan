'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Room { id: string; name: string; slug: string; }
interface Block { id: string; room_id: string; date: string; reason: string; booking_id: string | null; }

interface Props { rooms: Room[]; blocks: Block[]; }

export default function AvailabilityCalendar({ rooms, blocks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<string>(rooms[0]?.id || '');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState<'maintenance' | 'walkin'>('maintenance');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const roomBlocks = new Set(
    blocks.filter((b) => b.room_id === selectedRoom).map((b) => b.date)
  );

  const blockMap = blocks
    .filter((b) => b.room_id === selectedRoom)
    .reduce<Record<string, Block>>((acc, b) => { acc[b.date] = b; return acc; }, {});

  const handleBlock = () => {
    setMessage('');
    setIsError(false);
    if (!selectedRoom || !blockStart || !blockEnd || blockEnd <= blockStart) {
      setIsError(true);
      setMessage('Pick a room and a valid date range (the "To" date must be after "From").');
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const dates = eachDayOfInterval({ start: new Date(blockStart), end: addDays(new Date(blockEnd), -1) })
        .map((d) => format(d, 'yyyy-MM-dd'));

      // Upsert with ignoreDuplicates so dates that are already booked/blocked
      // are skipped instead of failing the whole batch (UNIQUE room_id+date).
      const { data, error } = await supabase
        .from('availability_blocks')
        .upsert(
          dates.map((date) => ({ room_id: selectedRoom, date, reason: blockReason, booking_id: null })),
          { onConflict: 'room_id,date', ignoreDuplicates: true }
        )
        .select();

      if (error) {
        setIsError(true);
        setMessage(
          `Could not block dates: ${error.message}. If this mentions permission, your account may not be an admin.`
        );
        return;
      }

      const added = data?.length ?? 0;
      const skipped = dates.length - added;
      setIsError(false);
      setMessage(
        `Blocked ${added} date${added === 1 ? '' : 's'}` +
          (skipped > 0 ? ` — ${skipped} already booked/blocked and skipped.` : '.')
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
      const supabase = createClient();
      const { error } = await supabase.from('availability_blocks').delete().eq('id', blockId);
      if (error) {
        setIsError(true);
        setMessage(`Could not unblock: ${error.message}`);
        return;
      }
      router.refresh();
    });
  };

  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek = monthStart.getDay();

  return (
    <div className="space-y-6">
      {/* Room Selector */}
      <div className="flex flex-wrap gap-2">
        {rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoom(r.id)}
            className={`px-4 py-2 text-xs font-montserrat font-semibold border transition-colors ${
              selectedRoom === r.id
                ? 'bg-[#1A0B2E] text-white border-[#1A0B2E]'
                : 'border-gray-200 text-gray-600 hover:border-[#1A0B2E]'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-white border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setCurrentDate(addDays(monthStart, -1))} className="p-1.5 hover:text-[#E30613] text-gray-500">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-playfair font-semibold text-lg text-[#1A0B2E]">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentDate(addDays(monthEnd, 1))} className="p-1.5 hover:text-[#E30613] text-gray-500">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dayOfWeek.map((d) => (
            <div key={d} className="text-center text-xs font-montserrat font-semibold text-gray-400 py-2">
              {d}
            </div>
          ))}
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isBlocked = roomBlocks.has(dateStr);
            const block = blockMap[dateStr];
            const isBooking = block?.booking_id != null;
            const isPast = day < new Date();

            return (
              <div
                key={dateStr}
                className={`relative aspect-square flex flex-col items-center justify-center text-xs font-montserrat border ${
                  isPast ? 'opacity-40' : ''
                } ${
                  isBlocked
                    ? isBooking
                      ? 'bg-[#E30613]/20 border-[#E30613]/30 text-[#E30613]'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'border-gray-100 text-gray-700 hover:border-[#1A0B2E]/30'
                }`}
              >
                <span className="font-semibold">{format(day, 'd')}</span>
                {isBlocked && !isBooking && (
                  <span className="text-[8px] leading-none mt-0.5 opacity-70">blocked</span>
                )}
                {isBlocked && isBooking && (
                  <span className="text-[8px] leading-none mt-0.5 opacity-70">booked</span>
                )}
                {/* Unblock control — only on manually-blocked (non-booking, non-past) dates */}
                {isBlocked && !isPast && !isBooking && block && (
                  <button
                    onClick={() => handleUnblock(block.id)}
                    disabled={isPending}
                    title="Unblock this date"
                    aria-label={`Unblock ${dateStr}`}
                    className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-white/80 text-red-600 hover:bg-red-600 hover:text-white transition-colors leading-none disabled:opacity-50"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-6 mt-5 pt-5 border-t border-gray-100 text-xs font-montserrat">
          <span className="flex items-center gap-2"><span className="w-4 h-4 bg-[#E30613]/20 border border-[#E30613]/30" />Booking</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 bg-amber-50 border border-amber-200" />Maintenance/Walk-in</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 bg-white border border-gray-100" />Available</span>
        </div>
        <p className="text-xs font-montserrat text-gray-400 mt-3">
          Tip: click the <span className="text-red-600 font-semibold">✕</span> on an amber
          (manually blocked) date to unblock it. Bookings are managed from the Bookings page.
        </p>
      </div>

      {/* Manual Block */}
      <div className="bg-white border border-gray-100 p-6">
        <h3 className="font-montserrat font-semibold text-sm uppercase tracking-wide text-[#1A0B2E] mb-5">
          Block Dates Manually
        </h3>
        <div className="grid sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-montserrat font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From</label>
            <input type="date" value={blockStart} min={today} onChange={(e) => setBlockStart(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E]" />
          </div>
          <div>
            <label className="block text-xs font-montserrat font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To (excl.)</label>
            <input type="date" value={blockEnd} min={blockStart || today} onChange={(e) => setBlockEnd(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E]" />
          </div>
          <div>
            <label className="block text-xs font-montserrat font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reason</label>
            <select value={blockReason} onChange={(e) => setBlockReason(e.target.value as any)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E]">
              <option value="maintenance">Maintenance</option>
              <option value="walkin">Walk-in</option>
            </select>
          </div>
          <button onClick={handleBlock} disabled={isPending} className="btn-red py-2.5 disabled:opacity-50 text-xs">
            {isPending ? 'Blocking...' : 'Block Dates'}
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
