'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';
import { extendBooking } from './actions';
import { formatCurrency, formatDate, calcNights, getRoomPricing } from '@/lib/utils';

interface Props {
  bookingId: string;
  checkOut: string;
  extraBeds: number;
  room: { price_per_night: number | null; offer_price: number | null };
}

const EXTRA_BED_PRICE = 2500;

export default function ExtendStayForm({ bookingId, checkOut, extraBeds, room }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [newCheckOut, setNewCheckOut] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const minDate = (() => {
    const d = new Date(checkOut + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const additionalNights = newCheckOut > checkOut ? calcNights(checkOut, newCheckOut) : 0;
  const { effective: nightlyRate } = getRoomPricing(room);
  const additionalCost =
    additionalNights > 0
      ? nightlyRate * additionalNights + extraBeds * EXTRA_BED_PRICE * additionalNights
      : 0;

  const handleExtend = () => {
    setMessage('');
    if (!newCheckOut || newCheckOut <= checkOut) {
      setIsError(true);
      setMessage('Pick a check-out date after the current one.');
      return;
    }
    startTransition(async () => {
      const result = await extendBooking(bookingId, newCheckOut);
      if (!result.success) {
        setIsError(true);
        setMessage(result.error || 'Could not extend the stay.');
        return;
      }
      setIsError(false);
      setMessage(
        `Extended to ${formatDate(result.newCheckOut!)} — ${result.newNights} nights, new total ${formatCurrency(result.newGrandTotal!)}.`
      );
      setNewCheckOut('');
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className="bg-white border border-gray-100 p-6">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-montserrat font-semibold uppercase tracking-wider border border-[#1A0B2E] text-[#1A0B2E] rounded hover:bg-[#1A0B2E] hover:text-white transition-colors"
        >
          <CalendarPlus size={14} /> Extend Stay
        </button>
        {message && (
          <p className={`text-xs mt-3 ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 p-6">
      <h2 className="font-montserrat font-semibold text-sm text-[#1A0B2E] uppercase tracking-wide mb-1">
        Extend Stay
      </h2>
      <p className="text-[11px] font-montserrat text-gray-500 mb-4">
        Current check-out: {formatDate(checkOut)}. New nights are priced at today's rate and checked
        for availability before confirming.
      </p>

      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        New check-out date
      </label>
      <input
        type="date"
        value={newCheckOut}
        min={minDate}
        onChange={(e) => setNewCheckOut(e.target.value)}
        className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1A0B2E] rounded mb-3"
      />

      {additionalNights > 0 && (
        <div className="bg-[#1A0B2E]/5 p-3 mb-4 text-xs font-montserrat">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">
              {additionalNights} extra night{additionalNights > 1 ? 's' : ''} @ {formatCurrency(nightlyRate)}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-[#1A0B2E]">Additional cost</span>
            <span className="text-[#E30613]">{formatCurrency(additionalCost)}</span>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-xs mb-3 ${isError ? 'text-red-600' : 'text-green-600'}`}>{message}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleExtend}
          disabled={isPending || !newCheckOut}
          className="btn-red flex-1 py-2.5 text-xs disabled:opacity-50"
        >
          {isPending ? 'Extending…' : 'Confirm Extension'}
        </button>
        <button
          onClick={() => { setOpen(false); setMessage(''); setNewCheckOut(''); }}
          disabled={isPending}
          className="text-xs text-gray-400 hover:text-gray-700 px-2"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
