'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { calcNights, getRoomPricing, EXTRA_BED_PRICE } from '@/lib/utils';
import { calculatePricing } from '@/lib/pricing';
import { getHotelTaxPercent } from '@/lib/tax';
import { checkRoomAvailability } from '@/lib/availability';

// Extending a stay in place (same booking row) instead of creating a second
// booking for the extra nights — keeps one guest's stay as one record for
// reporting, and (the reason this exists) lets the "fire tracking value on
// Completed" plan capture the TRUE final amount including any extension,
// with no separate reversal/adjustment event needed.

interface ExtendResult {
  success: boolean;
  error?: string;
  newCheckOut?: string;
  newNights?: number;
  newGrandTotal?: number;
}

export async function extendBooking(bookingId: string, newCheckOut: string): Promise<ExtendResult> {
  await requireStaff();
  const service = createServiceClient();

  const { data: booking, error: bookingErr } = await service
    .from('bookings')
    .select('id, room_id, check_in, check_out, nights, room_total, extra_bed_total, extra_beds, discount_amount, status')
    .eq('id', bookingId)
    .maybeSingle();
  if (bookingErr || !booking) return { success: false, error: 'Booking not found.' };

  if (!['pending', 'confirmed', 'checked_in'].includes(booking.status)) {
    return { success: false, error: `Cannot extend a ${booking.status} booking.` };
  }

  if (newCheckOut <= booking.check_out) {
    return { success: false, error: 'New check-out date must be after the current check-out date.' };
  }

  const { data: room, error: roomErr } = await service
    .from('rooms')
    .select('id, name, price_per_night, offer_price, total_units')
    .eq('id', booking.room_id)
    .maybeSingle();
  if (roomErr || !room) return { success: false, error: 'Room not found.' };

  // Only the NEW nights [oldCheckOut, newCheckOut) need an availability
  // check — everything before oldCheckOut is already this booking's own
  // block and doesn't need re-checking.
  const availability = await checkRoomAvailability(booking.room_id, booking.check_out, newCheckOut);
  if (!availability.available) {
    return {
      success: false,
      error: `${room.name} is fully booked on ${availability.soldOutDate}. Cannot extend through this date.`,
    };
  }

  const additionalNights = calcNights(booking.check_out, newCheckOut);
  const { effective: currentNightlyRate } = getRoomPricing(room);

  // Priced at today's rate, not the original booking's rate — matches how a
  // walk-in extension would actually be quoted at the desk. Existing coupon
  // discount (if any) is carried forward unchanged; extensions don't get a
  // bonus retroactive discount, but don't lose the original one either.
  const additionalRoomCost = currentNightlyRate * additionalNights;
  const additionalExtraBedCost = booking.extra_beds * EXTRA_BED_PRICE * additionalNights;

  const newRoomTotal = booking.room_total + additionalRoomCost;
  const newExtraBedTotal = booking.extra_bed_total + additionalExtraBedCost;
  const newNights = booking.nights + additionalNights;

  const taxPercent = await getHotelTaxPercent();
  const pricing = calculatePricing({
    roomTotal: newRoomTotal,
    extraBedTotal: newExtraBedTotal,
    couponDiscount: booking.discount_amount || 0,
    taxPercent,
  });

  const { error: updateErr } = await service
    .from('bookings')
    .update({
      check_out: newCheckOut,
      nights: newNights,
      room_total: newRoomTotal,
      extra_bed_total: newExtraBedTotal,
      tax_percent: pricing.taxPercent,
      tax_amount: pricing.taxAmount,
      grand_total: pricing.total,
    })
    .eq('id', bookingId);
  if (updateErr) return { success: false, error: `Could not update booking: ${updateErr.message}` };

  // Block the newly-added nights. If this fails, roll the booking row back
  // to its pre-extension state rather than leaving unblocked "phantom"
  // extra nights that another guest could book on top of.
  const dates = dateRange(booking.check_out, newCheckOut);
  const blocks = dates.map((date) => ({
    room_id: booking.room_id,
    date,
    reason: 'booking' as const,
    booking_id: bookingId,
  }));
  const { error: blockErr } = await service.from('availability_blocks').insert(blocks);
  if (blockErr) {
    await service
      .from('bookings')
      .update({
        check_out: booking.check_out,
        nights: booking.nights,
        room_total: booking.room_total,
        extra_bed_total: booking.extra_bed_total,
      })
      .eq('id', bookingId);
    return { success: false, error: 'Double-booking detected while blocking the extra nights. Extension cancelled.' };
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath('/admin/bookings');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/calendar');

  return { success: true, newCheckOut, newNights, newGrandTotal: pricing.total };
}

/** [start, end) date range as YYYY-MM-DD strings, no external date-fns
 *  dependency needed for this simple a walk. */
function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(start + 'T00:00:00Z');
  const stop = new Date(end + 'T00:00:00Z');
  while (cur < stop) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
