'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, parseISO, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Minus, Loader2 } from 'lucide-react';
import { adjustManualHold, blockRoomDates } from './actions';
import TotalUnitsEditor from './TotalUnitsEditor';

interface Room  { id: string; name: string; slug: string; total_units: number; }
interface Block { id: string; room_id: string; date: string; reason: string; booking_id: string | null; }

interface Props { rooms: Room[]; blocks: Block[]; isAdmin?: boolean; }

// Booking.com-style calendar. Rooms as sections, dates as columns. Four
// rows per room make the state unambiguous:
//   • Total units    — the room's inventory ceiling (from rooms.total_units)
//   • Web bookings   — count of blocks tied to a booking on this date
//   • Manual holds   — count of walk-in / OTA / maintenance blocks
//   • Available      — total − booked − manual (color-coded: green > 1,
//                                                amber = 1, red = 0)
// The +/- controls on the Manual row are the only interactive cells and
// only affect manual holds. Web bookings are read-only because they
// belong to real reservations — cancel from the Bookings page to release.

const WINDOW_DAYS = 14;

export default function AvailabilityCalendar({ rooms, blocks, isAdmin = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingCell, setPendingCell] = useState<string | null>(null); // "roomId|date"
  const [windowStart, setWindowStart] = useState(new Date());

  // Bulk-block form state (below the grid).
  const [bulkRoom, setBulkRoom] = useState<string>(rooms[0]?.id || '');
  const [bulkStart, setBulkStart] = useState('');
  const [bulkEnd, setBulkEnd]     = useState('');
  const [bulkUnits, setBulkUnits] = useState(1);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkIsError, setBulkIsError] = useState(false);

  const dates = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(windowStart, i)),
    [windowStart]
  );

  // Fast lookup: for a (room, date) key → { booked, manual }
  const counts = useMemo(() => {
    const m = new Map<string, { booked: number; manual: number }>();
    for (const b of blocks) {
      const key = `${b.room_id}|${b.date}`;
      const entry = m.get(key) ?? { booked: 0, manual: 0 };
      if (b.booking_id) entry.booked += 1; else entry.manual += 1;
      m.set(key, entry);
    }
    return m;
  }, [blocks]);

  function cellCount(roomId: string, date: Date) {
    return counts.get(`${roomId}|${format(date, 'yyyy-MM-dd')}`) ?? { booked: 0, manual: 0 };
  }

  function handleAdjust(roomId: string, date: Date, delta: 1 | -1) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${roomId}|${dateStr}`;
    setPendingCell(key);
    startTransition(async () => {
      const result = await adjustManualHold({ roomId, date: dateStr, delta });
      setPendingCell(null);
      if (!result.success && result.error) {
        // Non-blocking toast-like feedback via bulk message area for now.
        setBulkMessage(result.error);
        setBulkIsError(true);
        return;
      }
      router.refresh();
    });
  }

  function handleBulkBlock() {
    setBulkMessage('');
    setBulkIsError(false);
    if (!bulkRoom || !bulkStart || !bulkEnd || bulkEnd < bulkStart) {
      setBulkIsError(true);
      setBulkMessage('Pick a room and a valid date range.');
      return;
    }
    startTransition(async () => {
      const result = await blockRoomDates({
        roomId: bulkRoom,
        startDate: bulkStart,
        endDate:   bulkEnd,
        reason:    'walkin',
        unitsPerDay: bulkUnits,
      });
      if (!result.success) {
        setBulkIsError(true);
        setBulkMessage(result.error || 'Could not block.');
        return;
      }
      setBulkIsError(false);
      setBulkMessage(
        `Added ${result.created} manual hold${result.created === 1 ? '' : 's'}` +
          (result.capped ? ` — ${result.capped} day(s) already at full capacity` : '.')
      );
      setBulkStart('');
      setBulkEnd('');
      router.refresh();
    });
  }

  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="space-y-8">
      {/* Date-window navigation. Booking.com uses a 14-day strip that scrolls
          on mobile; we follow the same pattern so the whole thing stays
          usable on a phone. */}
      <div className="bg-white border border-gray-100 rounded overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setWindowStart(addDays(windowStart, -WINDOW_DAYS))}
            className="p-1.5 rounded hover:bg-gray-50 text-gray-600"
            aria-label="Previous 14 days"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-playfair font-semibold text-[#1A0B2E]">
              {format(dates[0], 'd MMM')} — {format(dates[dates.length - 1], 'd MMM yyyy')}
            </p>
            <button
              onClick={() => setWindowStart(new Date())}
              className="text-[10px] text-[#E30613] hover:underline font-montserrat font-semibold uppercase tracking-wider mt-0.5"
            >
              Jump to today
            </button>
          </div>
          <button
            onClick={() => setWindowStart(addDays(windowStart, WINDOW_DAYS))}
            className="p-1.5 rounded hover:bg-gray-50 text-gray-600"
            aria-label="Next 14 days"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Scrollable table wrapper — long horizontal on mobile.
            Room name column is sticky-left so it stays visible while
            dates scroll. */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px] font-montserrat border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white border-b border-r border-gray-100 text-left px-3 py-2 min-w-[160px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Room / Date</span>
                </th>
                {dates.map((d) => {
                  const isSat = d.getDay() === 6;
                  const isSun = d.getDay() === 0;
                  return (
                    <th
                      key={d.toISOString()}
                      className={`border-b border-gray-100 px-1.5 py-2 min-w-[52px] text-center ${
                        isToday(d) ? 'bg-[#E30613]/[0.06]' : (isSat || isSun) ? 'bg-gray-50/60' : ''
                      }`}
                    >
                      <div className="text-[9px] uppercase text-gray-400 leading-none">{format(d, 'EEE')}</div>
                      <div className={`text-sm font-semibold leading-tight mt-0.5 ${isToday(d) ? 'text-[#E30613]' : 'text-[#1A0B2E]'}`}>
                        {format(d, 'd')}
                      </div>
                      <div className="text-[8px] text-gray-400 uppercase">{format(d, 'MMM')}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const total = room.total_units ?? 1;
                return (
                  <RoomSection
                    key={room.id}
                    room={room}
                    total={total}
                    dates={dates}
                    cellCount={cellCount}
                    onAdjust={handleAdjust}
                    isPending={isPending}
                    pendingCell={pendingCell}
                    isAdmin={isAdmin}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-gray-100 text-[10px] font-montserrat text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" /> Free rooms</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200 inline-block" /> 1 left</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block" /> Sold out</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-50 border border-blue-200 inline-block" /> Web booking</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200 inline-block" /> Manual / OTA hold</span>
        </div>
      </div>

      {/* Bulk block form — for OTA/maintenance holds across a date range. */}
      <div className="bg-white border border-gray-100 rounded p-4 sm:p-6">
        <h3 className="font-montserrat font-semibold text-sm uppercase tracking-wide text-[#1A0B2E] mb-1">
          Add Manual Holds (bulk)
        </h3>
        <p className="text-[11px] font-montserrat text-gray-500 mb-5">
          Use this to reflect Booking.com / other OTA reservations, walk-in holds, or maintenance
          across multiple days. Adds N holds per day for the selected room. Capped at the room's
          total inventory. For quick single-day tweaks, use the <strong>+/−</strong> on the calendar
          above.
        </p>
        <div className="grid sm:grid-cols-5 gap-3 items-end">
          <div className="min-w-0">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Room</label>
            <select value={bulkRoom} onChange={(e) => setBulkRoom(e.target.value)}
              className="w-full min-w-0 border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1A0B2E] rounded">
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} (× {r.total_units})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From</label>
            <input type="date" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1A0B2E] rounded" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To (incl.)</label>
            <input type="date" value={bulkEnd} min={bulkStart || undefined} onChange={(e) => setBulkEnd(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1A0B2E] rounded" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Units / day</label>
            <div className="flex items-center border border-gray-200 rounded">
              <button type="button" onClick={() => setBulkUnits(Math.max(1, bulkUnits - 1))}
                className="px-2.5 py-2.5 text-gray-500 hover:text-[#1A0B2E]">
                <Minus size={14} />
              </button>
              <span className="flex-1 text-center text-sm font-semibold text-[#1A0B2E]">{bulkUnits}</span>
              <button type="button" onClick={() => setBulkUnits(bulkUnits + 1)}
                className="px-2.5 py-2.5 text-gray-500 hover:text-[#1A0B2E]">
                <Plus size={14} />
              </button>
            </div>
          </div>
          <button onClick={handleBulkBlock} disabled={isPending}
            className="btn-red py-2.5 text-xs disabled:opacity-50">
            {isPending ? 'Adding…' : 'Add holds'}
          </button>
        </div>
        {bulkMessage && (
          <p className={`text-xs mt-4 ${bulkIsError ? 'text-red-600' : 'text-green-600'}`}>
            {bulkMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Room section — four rows: Total / Booked / Manual / Available ──────────
function RoomSection({
  room, total, dates, cellCount, onAdjust, isPending, pendingCell, isAdmin,
}: {
  room: Room;
  total: number;
  dates: Date[];
  cellCount: (roomId: string, date: Date) => { booked: number; manual: number };
  onAdjust: (roomId: string, date: Date, delta: 1 | -1) => void;
  isPending: boolean;
  pendingCell: string | null;
  isAdmin: boolean;
}) {
  const availabilityColor = (avail: number) =>
    avail === 0     ? 'bg-red-100 text-red-700 border-red-200' :
    avail === 1     ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-green-100 text-green-700 border-green-200';

  return (
    <>
      {/* Room name — spans the whole row as a section header. Admins can
          click the '× N units total' pill to inline-edit inventory; for
          reception it renders as static text. */}
      <tr>
        <td
          colSpan={dates.length + 1}
          className="sticky left-0 bg-[#1A0B2E]/[0.03] border-b border-t border-gray-100 px-3 py-2"
        >
          <span className="font-playfair font-semibold text-[#1A0B2E] text-sm">
            {room.name}
          </span>
          <TotalUnitsEditor roomId={room.id} currentTotal={total} canEdit={isAdmin} />
        </td>
      </tr>

      {/* Row 1 — Total units */}
      <tr>
        <td className="sticky left-0 bg-white border-b border-r border-gray-100 px-3 py-2 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
          Total units
        </td>
        {dates.map((d) => (
          <td key={d.toISOString()} className="border-b border-gray-100 text-center text-sm font-semibold text-[#1A0B2E]">
            {total}
          </td>
        ))}
      </tr>

      {/* Row 2 — Web bookings (read-only) */}
      <tr>
        <td className="sticky left-0 bg-white border-b border-r border-gray-100 px-3 py-2 text-[10px] uppercase tracking-wider text-blue-600 font-semibold">
          Web bookings
        </td>
        {dates.map((d) => {
          const { booked } = cellCount(room.id, d);
          return (
            <td key={d.toISOString()} className="border-b border-gray-100 text-center py-1">
              {booked > 0 ? (
                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  {booked}
                </span>
              ) : (
                <span className="text-gray-300 text-xs">—</span>
              )}
            </td>
          );
        })}
      </tr>

      {/* Row 3 — Manual holds (+/- editable) */}
      <tr>
        <td className="sticky left-0 bg-white border-b border-r border-gray-100 px-3 py-2 text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
          Manual / OTA
        </td>
        {dates.map((d) => {
          const { booked, manual } = cellCount(room.id, d);
          const remaining = total - booked - manual;
          const cellKey = `${room.id}|${format(d, 'yyyy-MM-dd')}`;
          const isThisPending = pendingCell === cellKey;
          const canAdd = remaining > 0;
          const canRemove = manual > 0;
          return (
            <td key={d.toISOString()} className="border-b border-gray-100 py-1 px-0.5">
              <div className="flex items-center justify-center gap-0.5">
                <button
                  onClick={() => onAdjust(room.id, d, -1)}
                  disabled={!canRemove || isPending}
                  title="Release one manual hold"
                  className="w-4 h-4 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-600 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400"
                >
                  <Minus size={9} />
                </button>
                <span className={`inline-block min-w-[20px] text-center px-1 py-0.5 rounded text-xs font-semibold ${
                  manual > 0 ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'text-gray-300'
                }`}>
                  {isThisPending ? <Loader2 size={10} className="inline animate-spin" /> : manual}
                </span>
                <button
                  onClick={() => onAdjust(room.id, d, 1)}
                  disabled={!canAdd || isPending}
                  title="Add one manual hold"
                  className="w-4 h-4 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-[#1A0B2E] hover:text-[#1A0B2E] disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400"
                >
                  <Plus size={9} />
                </button>
              </div>
            </td>
          );
        })}
      </tr>

      {/* Row 4 — Available (calculated) */}
      <tr>
        <td className="sticky left-0 bg-white border-b border-r border-gray-100 px-3 py-2 text-[10px] uppercase tracking-wider text-green-700 font-semibold">
          Available
        </td>
        {dates.map((d) => {
          const { booked, manual } = cellCount(room.id, d);
          const avail = Math.max(0, total - booked - manual);
          return (
            <td key={d.toISOString()} className="border-b border-gray-100 text-center py-1.5">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${availabilityColor(avail)}`}>
                {avail}
              </span>
            </td>
          );
        })}
      </tr>
    </>
  );
}
