'use server';

import { dealForRoomOnDate } from '@/lib/deals';

/** Client-callable — returns the deal that would apply if the guest booked
 *  this room + check-in + nights right now, or null. Same server code the
 *  booking commit runs, so preview + commit prices can never disagree. */
export async function getDealForBooking(input: {
  roomId: string;
  checkIn: string;
  nights: number;
}): Promise<{
  id: string;
  name: string;
  discountPct: number;
  refundable: boolean;
  freeCancelDays: number;
} | null> {
  if (!input.roomId || !input.checkIn || input.nights < 1) return null;
  const d = await dealForRoomOnDate(input.roomId, input.checkIn, input.nights);
  return d ? { id: d.id, name: d.name, discountPct: d.discountPct, refundable: d.refundable, freeCancelDays: d.freeCancelDays } : null;
}
