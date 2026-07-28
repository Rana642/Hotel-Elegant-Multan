'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { addDays, format, parseISO, eachDayOfInterval } from 'date-fns';

// Calendar mutations run through server actions with the service client so
// they bypass RLS deterministically (no more silent "did the delete happen?"
// mysteries) and can enforce staff/admin role at the app layer. Both roles
// can block and unblock — availability is day-to-day operational work.

/** Block N units of a room across a date range. Never blocks past total_units
 *  for a given date (so a Family Suite with 3 units caps at 3 blocks/date).
 *  Returns per-day summary so the UI can show "3 skipped (sold out)". */
export async function blockRoomDates(input: {
  roomId: string;
  startDate: string;   // YYYY-MM-DD inclusive
  endDate: string;     // YYYY-MM-DD inclusive
  reason: 'maintenance' | 'walkin';
  unitsPerDay?: number; // default 1 — how many units of the room to hold each day
}) {
  await requireStaff();

  const units = Math.max(1, input.unitsPerDay ?? 1);
  const service = createServiceClient();

  // Look up total_units for capacity check.
  const { data: room, error: roomErr } = await service
    .from('rooms')
    .select('id, total_units')
    .eq('id', input.roomId)
    .maybeSingle();
  if (roomErr || !room) return { success: false, error: 'Room not found.' };

  const dates = eachDayOfInterval({
    start: parseISO(input.startDate),
    end: parseISO(input.endDate),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  // Count existing blocks per date so we cap at total_units.
  const { data: existing } = await service
    .from('availability_blocks')
    .select('date')
    .eq('room_id', input.roomId)
    .in('date', dates);
  const existingCount = new Map<string, number>();
  for (const row of existing || []) {
    existingCount.set(row.date, (existingCount.get(row.date) ?? 0) + 1);
  }

  let created = 0;
  let capped  = 0;
  const rows: { room_id: string; date: string; reason: string; booking_id: null }[] = [];
  for (const date of dates) {
    const already = existingCount.get(date) ?? 0;
    const capacity = room.total_units - already;
    const toAdd = Math.min(units, capacity);
    if (toAdd <= 0) { capped++; continue; }
    for (let i = 0; i < toAdd; i++) {
      rows.push({ room_id: input.roomId, date, reason: input.reason, booking_id: null });
    }
    created += toAdd;
  }

  if (rows.length > 0) {
    const { error } = await service.from('availability_blocks').insert(rows);
    if (error) return { success: false, error: `Block failed: ${error.message}` };
  }

  revalidatePath('/admin/calendar');
  return { success: true, created, capped, totalDates: dates.length };
}

/** Remove a single manual block by id. Refuses to touch booking-linked
 *  blocks — those must be released by cancelling / deleting the booking. */
export async function unblockOne(blockId: string) {
  await requireStaff();
  const service = createServiceClient();

  // Fetch first so we can refuse booking-linked deletions with a clear message.
  const { data: block, error: readErr } = await service
    .from('availability_blocks')
    .select('id, booking_id')
    .eq('id', blockId)
    .maybeSingle();
  if (readErr) return { success: false, error: readErr.message };
  if (!block)  return { success: false, error: 'Block not found (already removed?).' };
  if (block.booking_id) {
    return { success: false, error: 'This date is tied to a booking. Cancel or delete the booking to release it.' };
  }

  const { error } = await service.from('availability_blocks').delete().eq('id', blockId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/calendar');
  return { success: true };
}
