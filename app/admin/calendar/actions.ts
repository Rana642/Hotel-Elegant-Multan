'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { requireStaff, requireAdmin } from '@/lib/auth';
import { addDays, format, parseISO, eachDayOfInterval } from 'date-fns';

// Calendar mutations run through server actions with the service client so
// they bypass RLS deterministically (no more silent "did the delete happen?"
// mysteries) and can enforce staff/admin role at the app layer. Both roles
// can block and unblock — availability is day-to-day operational work.

/** Set a per-date override for how many units of a room are effectively
 *  available on that day. E.g. Family Suite has 3 units total, but on
 *  5 Aug only 2 are usable (owner-hold + one under deep clean). Passing
 *  a value equal to the room's default total_units clears the override
 *  (deletes the row) so the calendar renders it as the default state.
 *  Public booking check picks this up automatically — guests can't book
 *  past an override cap. */
export async function setDateOverride(input: { roomId: string; date: string; units: number | null }) {
  await requireStaff();
  const service = createServiceClient();

  // units === null → clear the override entirely, fall back to room default.
  if (input.units === null) {
    const { error } = await service
      .from('availability_overrides')
      .delete()
      .eq('room_id', input.roomId)
      .eq('date', input.date);
    if (error) return { success: false, error: error.message };
    revalidatePath('/admin/calendar');
    return { success: true, cleared: true };
  }

  const total = Math.floor(input.units);
  if (!Number.isFinite(total) || total < 0 || total > 100) {
    return { success: false, error: 'Value must be between 0 and 100.' };
  }

  // Look up the room's default so we can auto-clear if the override
  // matches the default (keeps the table clean of no-op rows).
  const { data: room } = await service
    .from('rooms')
    .select('total_units')
    .eq('id', input.roomId)
    .maybeSingle();
  const defaultTotal = room?.total_units ?? 1;

  if (total === defaultTotal) {
    await service
      .from('availability_overrides')
      .delete()
      .eq('room_id', input.roomId)
      .eq('date', input.date);
    revalidatePath('/admin/calendar');
    return { success: true, cleared: true };
  }

  // Upsert on the composite PK — one row per (room, date).
  const { error } = await service
    .from('availability_overrides')
    .upsert(
      { room_id: input.roomId, date: input.date, effective_total: total },
      { onConflict: 'room_id,date' }
    );
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/calendar');
  return { success: true, effectiveTotal: total };
}

/** Change a room's total_units (physical inventory) inline from the calendar
 *  header. Admin-only — changing inventory affects everything downstream
 *  (public availability check, dashboard, sold-out cutoff), so reception
 *  should never do it accidentally.
 *
 *  Bounds: 1..100. Reducing below the current max concurrent blocks on any
 *  future date is allowed — existing bookings still stand, but new website
 *  bookings for those dates will refuse. Calendar UI will render those
 *  over-capacity dates as red so admin can see the effect immediately. */
export async function updateRoomTotalUnits(roomId: string, newTotal: number) {
  await requireAdmin();
  const total = Math.floor(newTotal);
  if (!Number.isFinite(total) || total < 1 || total > 100) {
    return { success: false, error: 'Total units must be between 1 and 100.' };
  }
  const service = createServiceClient();
  const { error } = await service
    .from('rooms')
    .update({ total_units: total })
    .eq('id', roomId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/calendar');
  revalidatePath('/admin/rooms');
  revalidatePath('/admin/dashboard');
  return { success: true, total };
}

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

/** Add or remove exactly one manual (walk-in / OTA) hold for a single
 *  date. Used by the +/- controls on the Booking.com-style calendar so
 *  admin can mirror a Booking.com booking with one click.
 *  delta=+1 → adds a walkin block (caps at total_units).
 *  delta=-1 → removes the most-recent manual block (never touches
 *              booking-linked blocks). */
export async function adjustManualHold(input: { roomId: string; date: string; delta: 1 | -1 }) {
  await requireStaff();
  const service = createServiceClient();

  if (input.delta === 1) {
    // Cap check: total_units minus current blocks on that date.
    const { data: room } = await service
      .from('rooms')
      .select('total_units')
      .eq('id', input.roomId)
      .maybeSingle();
    if (!room) return { success: false, error: 'Room not found.' };

    const { count: existing } = await service
      .from('availability_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', input.roomId)
      .eq('date', input.date);

    if ((existing ?? 0) >= (room.total_units ?? 1)) {
      return { success: false, error: 'Already at full capacity for this date.' };
    }

    const { error } = await service.from('availability_blocks').insert({
      room_id: input.roomId, date: input.date, reason: 'walkin', booking_id: null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/admin/calendar');
    return { success: true };
  }

  // delta === -1: pop the most-recent manual (non-booking) hold.
  const { data: pop } = await service
    .from('availability_blocks')
    .select('id')
    .eq('room_id', input.roomId)
    .eq('date', input.date)
    .is('booking_id', null)
    .order('id', { ascending: false })
    .limit(1);

  if (!pop || pop.length === 0) {
    return { success: false, error: 'No manual holds to release on this date.' };
  }
  const { error } = await service.from('availability_blocks').delete().eq('id', pop[0].id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/calendar');
  return { success: true };
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
