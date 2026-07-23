'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fireBookingConfirmedCapi } from '@/app/actions/metaCapi';

const statuses = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'] as const;
type BookingStatus = typeof statuses[number];

const statusLabels: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
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

      // High-signal server-side conversion: on the transition INTO
      // 'confirmed', fire Meta CAPI Purchase with hashed guest data. This
      // is more reliable than the browser Pixel (no ad-blockers / iOS
      // privacy loss) and gives Meta the customer identity for Advanced
      // Matching + Lookalike audiences. Fire-and-forget — a CAPI hiccup
      // must not block the status-update UX.
      if (status === 'confirmed' && booking.status !== 'confirmed') {
        fireBookingConfirmedCapi(booking.id).catch(() => {
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
    </div>
  );
}
