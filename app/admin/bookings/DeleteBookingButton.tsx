'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  bookingId: string;
  bookingRef: string;
  /** 'icon' for a compact row action (list page), 'button' for a full labeled button (detail page) */
  variant?: 'icon' | 'button';
}

export default function DeleteBookingButton({ bookingId, bookingRef, variant = 'icon' }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDelete = () => {
    const ok = window.confirm(
      `Delete booking ${bookingRef}? This permanently removes the booking and frees its blocked dates. This cannot be undone.`
    );
    if (!ok) return;

    setError('');
    startTransition(async () => {
      const supabase = createClient();

      // Free the blocked dates first — the FK is ON DELETE SET NULL, not
      // CASCADE, so without this the room stays blocked forever with an
      // orphaned availability_blocks row.
      const { error: blocksError } = await supabase
        .from('availability_blocks')
        .delete()
        .eq('booking_id', bookingId);

      if (blocksError) {
        setError('Could not free blocked dates. Booking was not deleted.');
        return;
      }

      const { error: bookingError } = await supabase.from('bookings').delete().eq('id', bookingId);

      if (bookingError) {
        setError('Could not delete booking. Please try again.');
        return;
      }

      router.push('/admin/bookings');
      router.refresh();
    });
  };

  if (variant === 'button') {
    return (
      <div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 text-red-600 font-montserrat font-semibold text-xs tracking-wider uppercase hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} />
          {isPending ? 'Deleting...' : 'Delete Booking'}
        </button>
        {error && <p className="text-xs font-montserrat text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Delete booking"
      aria-label={`Delete booking ${bookingRef}`}
      className="text-gray-300 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      <Trash2 size={15} />
    </button>
  );
}
