'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fireBookingCompletedCapi } from '@/app/actions/metaCapi';

const statuses = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'] as const;
type BookingStatus = typeof statuses[number];

const statusLabels: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
};

interface Props {
  booking: { id: string; status: string; booking_ref: string };
}

export default function BookingStatusForm({ booking }: Props) {
  const [status, setStatus] = useState<BookingStatus>(booking.status as BookingStatus);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleUpdate = () => {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', booking.id);

      // If cancelling, free availability blocks
      if (!error && status === 'cancelled') {
        await supabase
          .from('availability_blocks')
          .delete()
          .eq('booking_id', booking.id);
      }

      if (error) {
        setMessage('Error updating status. Please try again.');
        return;
      }

      // High-signal server-side conversion: fire Meta CAPI Purchase only on
      // the transition INTO 'completed' — not 'confirmed'. A confirmed
      // booking can still become a no-show or get cancelled before the
      // guest arrives; a completed one, by definition, actually happened.
      // This also means no-shows/cancellations never need a reversal event
      // sent to Meta — they simply never generate a Purchase in the first
      // place. The action re-reads the booking row fresh, so if the stay
      // was extended (ExtendStayForm) before being marked completed, the
      // TRUE final grand_total (including the extension) is what gets
      // reported — no separate adjustment event needed for that either.
      // Fire-and-forget — a CAPI hiccup must not block the status-update UX.
      if (status === 'completed' && booking.status !== 'completed') {
        fireBookingCompletedCapi(booking.id).catch(() => {
          // swallow — status already updated; CAPI is best-effort
        });
      }

      setMessage('Status updated successfully.');
      router.refresh();
    });
  };

  return (
    <div className="bg-white border border-gray-100 p-6 sticky top-6">
      <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-5">
        Manage Status
      </h2>

      <div className={`px-4 py-3 mb-6 text-sm font-montserrat font-semibold ${statusColors[status] || ''} capitalize`}>
        Current: {statusLabels[status] || status}
      </div>

      <div className="space-y-2 mb-5">
        {statuses.map((s) => (
          <label key={s} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="status"
              value={s}
              checked={status === s}
              onChange={() => setStatus(s)}
              className="accent-[#E30613]"
            />
            <span className="font-montserrat text-sm text-gray-700">{statusLabels[s]}</span>
          </label>
        ))}
      </div>

      {message && (
        <p className={`text-xs font-montserrat mb-3 ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      <button
        onClick={handleUpdate}
        disabled={isPending || status === booking.status}
        className="btn-red w-full py-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Updating...' : 'Update Status'}
      </button>

      {status === 'cancelled' && status !== booking.status && (
        <p className="text-xs font-montserrat text-amber-600 mt-3">
          Cancelling will free up blocked dates for new bookings.
        </p>
      )}

      {status === 'no_show' && status !== booking.status && (
        <p className="text-xs font-montserrat text-orange-600 mt-3">
          Marking No Show does not free the blocked dates — use the calendar's
          &minus; control if you want to resell tonight to a walk-in.
        </p>
      )}
    </div>
  );
}
