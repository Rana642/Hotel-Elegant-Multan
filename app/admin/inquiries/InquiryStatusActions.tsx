'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, XCircle, Ban, Trash2 } from 'lucide-react';
import { updateInquiryStatus, deleteInquiry } from './actions';

type Inquiry = {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  preferred_channel: 'whatsapp' | 'call';
  intent: 'booking' | 'info';
  check_in: string | null;
  check_out: string | null;
  status: 'new' | 'converted' | 'closed' | 'spam';
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  gclid: string | null;
  booking_id: string | null;
  notes: string | null;
};

interface Props {
  inquiry: Inquiry;
  /** Reception role never sees the Delete button — passed from the server
   *  page after checking getCurrentUser().role. Server action itself also
   *  guards with requireAdmin() so hiding the UI is defence-in-depth. */
  canDelete?: boolean;
}

export default function InquiryStatusActions({ inquiry, canDelete = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Which close-style action is mid-confirm ('closed' | 'spam'), so Close and
  // Spam can share one inline remark box instead of two near-identical ones.
  const [closingAs, setClosingAs] = useState<'closed' | 'spam' | null>(null);
  const [remark, setRemark] = useState('');

  // Deep-link to the admin manual-booking form with as much prefilled as
  // possible. Once staff finalises the booking, we'll flip this inquiry to
  // 'converted' — see the server action.
  const convertHref = (() => {
    const p = new URLSearchParams();
    p.set('from_inquiry', inquiry.id);
    p.set('name', inquiry.guest_name);
    if (inquiry.guest_phone) p.set('phone', inquiry.guest_phone);
    if (inquiry.check_in)    p.set('check_in',  inquiry.check_in);
    if (inquiry.check_out)   p.set('check_out', inquiry.check_out);
    if (inquiry.preferred_channel) p.set('channel', inquiry.preferred_channel);
    if (inquiry.utm_source)  p.set('utm_source',  inquiry.utm_source);
    if (inquiry.utm_medium)  p.set('utm_medium',  inquiry.utm_medium);
    if (inquiry.utm_campaign) p.set('utm_campaign', inquiry.utm_campaign);
    if (inquiry.fbclid)      p.set('fbclid', inquiry.fbclid);
    if (inquiry.gclid)       p.set('gclid',  inquiry.gclid);
    return `/admin/bookings/new?${p.toString()}`;
  })();

  const setStatus = (status: 'closed' | 'spam' | 'new', notes?: string) => {
    startTransition(async () => {
      await updateInquiryStatus(inquiry.id, status, notes);
      router.refresh();
    });
  };

  const confirmClose = () => {
    if (!closingAs) return;
    setStatus(closingAs, remark);
    setClosingAs(null);
    setRemark('');
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteInquiry(inquiry.id);
      if (result?.success) {
        router.refresh();
      } else {
        setConfirmingDelete(false);
      }
    });
  };

  // Delete button — shown only for admins (canDelete). Two-tap confirm:
  // first tap swaps in a red "Confirm" button; second tap actually deletes.
  // No modal — inline is faster for a data-cleanup workflow.
  const DeleteBtn = () => {
    if (!canDelete) return null;
    if (confirmingDelete) {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-2 py-1.5 text-[10px] font-montserrat font-semibold uppercase tracking-wider bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? '…' : 'Confirm delete'}
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            disabled={isPending}
            className="text-xs text-gray-400 hover:text-gray-700 px-2"
          >
            cancel
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setConfirmingDelete(true)}
        title="Delete inquiry (admin only)"
        className="p-1.5 text-gray-300 hover:text-red-600"
      >
        <Trash2 size={16} />
      </button>
    );
  };

  // Already-converted inquiries: show a link to the booking + (admin) delete.
  if (inquiry.status === 'converted' && inquiry.booking_id) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <Link
          href={`/admin/bookings/${inquiry.booking_id}`}
          className="inline-flex items-center gap-1 text-xs text-[#E30613] hover:underline font-montserrat font-semibold"
        >
          View booking <ArrowRight size={12} />
        </Link>
        <DeleteBtn />
      </div>
    );
  }

  if (inquiry.status === 'closed' || inquiry.status === 'spam') {
    return (
      <div className="flex flex-col items-end gap-1">
        {inquiry.notes && (
          <p className="text-xs text-gray-400 font-montserrat italic max-w-[220px] text-right">
            &ldquo;{inquiry.notes}&rdquo;
          </p>
        )}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => setStatus('new')}
            disabled={isPending}
            className="text-xs text-gray-400 hover:text-[#1A0B2E] font-montserrat underline disabled:opacity-50"
          >
            Reopen
          </button>
          <DeleteBtn />
        </div>
      </div>
    );
  }

  // Close / Spam mid-confirm: an inline remark box instead of the icon
  // row — same "expand in place, no modal" pattern as delete-confirm.
  // Remark is optional (staff shouldn't be blocked from closing mid-shift
  // just because they didn't type a reason), but the field is right there
  // so "no response" / "found cheaper elsewhere" / etc. takes two seconds.
  if (closingAs) {
    return (
      <div className="flex flex-col items-end gap-1.5 w-full max-w-[240px] ml-auto">
        <textarea
          autoFocus
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder={
            closingAs === 'spam'
              ? 'Reason (optional) — e.g. bot, duplicate...'
              : 'Reason (optional) — e.g. no response, found cheaper elsewhere...'
          }
          rows={2}
          maxLength={500}
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-montserrat outline-none focus:border-[#1A0B2E] resize-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={confirmClose}
            disabled={isPending}
            className={`px-2.5 py-1 text-[10px] font-montserrat font-semibold uppercase tracking-wider text-white rounded disabled:opacity-50 ${
              closingAs === 'spam' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {isPending ? '…' : closingAs === 'spam' ? 'Confirm spam' : 'Confirm close'}
          </button>
          <button
            onClick={() => { setClosingAs(null); setRemark(''); }}
            disabled={isPending}
            className="text-xs text-gray-400 hover:text-gray-700 px-1"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }

  // status === 'new' → primary action is Convert, secondary Close / Spam.
  return (
    <div className="flex items-center gap-2 justify-end flex-wrap">
      <Link
        href={convertHref}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E30613] text-white text-[11px] font-montserrat font-semibold uppercase tracking-wider rounded hover:bg-red-700 transition-colors"
      >
        <CheckCircle2 size={12} /> Convert
      </Link>
      <button
        onClick={() => setClosingAs('closed')}
        disabled={isPending}
        title="No response / not interested — add a remark and close"
        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-50"
      >
        <XCircle size={16} />
      </button>
      <button
        onClick={() => setClosingAs('spam')}
        disabled={isPending}
        title="Mark as spam"
        className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50"
      >
        <Ban size={16} />
      </button>
      <DeleteBtn />
    </div>
  );
}
