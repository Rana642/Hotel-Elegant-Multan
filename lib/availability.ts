import { createServiceClient } from './supabase/server';
import { addDays, parseISO, format, eachDayOfInterval } from 'date-fns';

export interface AvailabilityResult {
  available: boolean;
  /** First date in the range that has no capacity left, if any. */
  soldOutDate: string | null;
}

/**
 * Multi-unit availability check shared by the booking server action and the
 * lightweight client-facing check below. A date is unavailable once the
 * count of `availability_blocks` rows for it reaches the effective cap —
 * room.total_units by default, or the admin's per-date override in
 * `availability_overrides` if one exists for that date.
 */
export async function checkRoomAvailability(
  roomId: string,
  checkIn: string,
  checkOut: string
): Promise<AvailabilityResult> {
  if (!roomId || !checkIn || !checkOut || checkOut <= checkIn) {
    return { available: true, soldOutDate: null };
  }

  const supabase = createServiceClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('total_units')
    .eq('id', roomId)
    .maybeSingle();
  const defaultTotal = room?.total_units ?? 1;

  // [checkIn, checkOut) — the checkout night itself is not occupied.
  const dates = eachDayOfInterval({
    start: parseISO(checkIn),
    end: addDays(parseISO(checkOut), -1),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  const [{ data: existing }, { data: overrides }] = await Promise.all([
    supabase.from('availability_blocks').select('date').eq('room_id', roomId).in('date', dates),
    supabase.from('availability_overrides').select('date, effective_total').eq('room_id', roomId).in('date', dates),
  ]);

  const perDay = new Map<string, number>();
  for (const row of existing || []) {
    perDay.set(row.date, (perDay.get(row.date) ?? 0) + 1);
  }
  const overrideMap = new Map<string, number>();
  for (const row of overrides || []) {
    overrideMap.set(row.date, row.effective_total);
  }
  const capFor = (d: string) => overrideMap.get(d) ?? defaultTotal;

  const soldOut = dates.find((d) => (perDay.get(d) ?? 0) >= capFor(d));
  return { available: !soldOut, soldOutDate: soldOut ?? null };
}
