'use client';

import { useState, useTransition } from 'react';
import { Search, Loader2, CheckCircle, Clock, XCircle, MessageCircle, CalendarDays, BedDouble, Users } from 'lucide-react';
import { lookupBooking, type ManageBookingResult } from './actions';
import { formatCurrency, formatDate, buildWhatsAppLink } from '@/lib/utils';

// Guest-facing status labels + colour + note. Internal statuses map to plain
// language a guest understands.
const STATUS: Record<string, { label: string; tone: 'amber' | 'green' | 'red' | 'gray'; note?: string }> = {
  pending:     { label: 'Pending Confirmation', tone: 'amber', note: 'We’ll confirm your room on WhatsApp or by call shortly.' },
  confirmed:   { label: 'Confirmed', tone: 'green', note: 'Your room is confirmed — we look forward to hosting you!' },
  checked_in:  { label: 'Checked In', tone: 'green', note: 'Enjoy your stay with us.' },
  completed:   { label: 'Completed', tone: 'gray', note: 'Thank you for staying with Hotel Elegant.' },
  cancelled:   { label: 'Cancelled', tone: 'red', note: 'This booking has been cancelled. Contact us to rebook.' },
  no_show:     { label: 'Cancelled — No Show', tone: 'red', note: 'Marked as a no-show. Contact us if this is a mistake.' },
  unreachable: { label: 'Awaiting Your Response', tone: 'amber', note: 'We tried to reach you to confirm — please WhatsApp us.' },
};

const TONE: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function ManageBookingForm() {
  const [bookingId, setBookingId] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ManageBookingResult['booking'] | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    startTransition(async () => {
      const res = await lookupBooking(bookingId, contact);
      if (!res.success || !res.booking) {
        setError(res.error || 'Something went wrong. Please try again.');
        return;
      }
      setResult(res.booking);
    });
  };

  const inputClass = 'w-full border border-gray-200 px-4 py-3 font-montserrat text-sm text-gray-900 outline-none focus:border-[#1A0B2E] transition-colors bg-white';
  const labelClass = 'block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2';

  if (result) {
    const s = STATUS[result.status] || { label: result.status, tone: 'gray' as const };
    const wa = buildWhatsAppLink(
      `Hi Hotel Elegant! I'd like to check on my booking ${result.ref} (${result.roomName}, ${formatDate(result.checkIn)} – ${formatDate(result.checkOut)}).`
    );
    const Icon = s.tone === 'green' ? CheckCircle : s.tone === 'red' ? XCircle : Clock;

    return (
      <div className="bg-white border border-gray-100 shadow-sm p-6 sm:p-8 max-w-xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="font-montserrat text-xs text-gray-400 uppercase tracking-widest">Booking</p>
            <p className="font-mono font-bold text-lg text-[#1A0B2E]">{result.ref}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-montserrat font-semibold px-3 py-1.5 border ${TONE[s.tone]}`}>
            <Icon size={14} /> {s.label}
          </span>
        </div>

        {s.note && (
          <p className="font-montserrat text-sm text-gray-600 bg-[#1A0B2E]/[0.03] border border-gray-100 px-4 py-3 mb-6">
            {s.note}
          </p>
        )}

        <div className="space-y-3 text-sm font-montserrat">
          <Row icon={<BedDouble size={15} className="text-[#E30613]" />} label="Room" value={result.roomName} />
          <Row icon={<CalendarDays size={15} className="text-[#E30613]" />} label="Stay" value={`${formatDate(result.checkIn)} → ${formatDate(result.checkOut)} · ${result.nights} night${result.nights !== 1 ? 's' : ''}`} />
          <Row icon={<Users size={15} className="text-[#E30613]" />} label="Guests" value={`${result.adults} adult${result.adults !== 1 ? 's' : ''}${result.children > 0 ? `, ${result.children} child${result.children !== 1 ? 'ren' : ''}` : ''}${result.extraBeds > 0 ? `, ${result.extraBeds} extra bed(s)` : ''}`} />
          <div className="flex justify-between pt-3 border-t border-gray-100 font-semibold">
            <span className="text-[#1A0B2E]">Estimated Total</span>
            <span className="text-[#E30613] text-base">{formatCurrency(result.grandTotal)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-whatsapp inline-flex items-center gap-2 py-3 px-6">
            <MessageCircle size={16} /> Contact us about this booking
          </a>
          <button
            type="button"
            onClick={() => { setResult(null); setBookingId(''); setContact(''); }}
            className="py-3 px-6 border border-gray-300 text-gray-700 text-xs font-montserrat font-semibold uppercase tracking-wider"
          >
            Look up another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 shadow-sm p-6 sm:p-8 max-w-xl mx-auto space-y-5">
      <div>
        <label className={labelClass}>Booking ID <span className="text-[#E30613]">*</span></label>
        <input
          type="text"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value.toUpperCase())}
          placeholder="e.g. AB3K9P"
          className={inputClass + ' font-mono'}
          required
          maxLength={20}
        />
      </div>
      <div>
        <label className={labelClass}>Email or Phone <span className="text-[#E30613]">*</span></label>
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email or phone used to book"
          className={inputClass}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 font-montserrat">{error}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-red w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        {isPending ? 'Looking up…' : 'Get My Booking'}
      </button>
    </form>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-2 text-gray-500 shrink-0">{icon}{label}</span>
      <span className="font-medium text-[#1A0B2E] text-right">{value}</span>
    </div>
  );
}
