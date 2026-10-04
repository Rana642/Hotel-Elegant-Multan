'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, MessageCircle, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { attachPaymentScreenshot } from '@/app/actions/paymentProof';
import TrackedLink from '@/components/TrackedLink';
import type { BankDetails } from '@/lib/bankDetails';

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

/** Thank-you page: complete the advance payment a deal requires.
 *  The booking is already submitted (and tracked) — the guest transfers the
 *  total here and uploads the receipt, or sends it on WhatsApp. */
export default function AdvancePaymentBox({
  bookingRef,
  dealName,
  amount,
  bank,
  alreadyUploaded,
}: {
  bookingRef: string;
  dealName: string;
  amount: number;
  bank: BankDetails;
  alreadyUploaded: boolean;
}) {
  const [uploaded, setUploaded] = useState(alreadyUploaded);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — the number is still visible */
    }
  };

  const upload = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) { setError('Please upload an image (screenshot) of the transfer receipt.'); return; }
    if (file.size > MAX_SCREENSHOT_BYTES) { setError('Screenshot is too large — please keep it under 5MB.'); return; }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('payment-screenshots').getPublicUrl(path);
      const res = await attachPaymentScreenshot(bookingRef, data.publicUrl);
      if (!res.success) { setError(res.error || 'Upload failed — please try again.'); return; }
      setUploaded(true);
    } catch {
      setError('Upload failed — please try again or send it on WhatsApp.');
    } finally {
      setUploading(false);
    }
  };

  const waText = encodeURIComponent(
    `Hello Hotel Elegant Executive Suites Multan! Here is my payment screenshot for booking ${bookingRef} (${dealName}) — ${formatCurrency(amount)}.`,
  );

  const row = (label: string, value: string, field?: string) =>
    value ? (
      <p className="flex items-center gap-2">
        <span className="text-gray-500 shrink-0 w-[96px]">{label}</span>
        {field ? (
          <button
            type="button"
            onClick={() => copy(value, field)}
            title="Tap to copy"
            className="flex items-center gap-1.5 font-semibold font-mono text-[#1A0B2E] py-1.5 -my-1.5 active:opacity-60 min-w-0 break-all text-left"
          >
            {copied === field
              ? (<><Check size={12} className="text-green-600 shrink-0" /> Copied</>)
              : (<>{value} <Copy size={11} className="text-gray-400 shrink-0" /></>)}
          </button>
        ) : (
          <span className="font-semibold">{value}</span>
        )}
      </p>
    ) : null;

  if (uploaded) {
    return (
      <div className="bg-green-50 border border-green-200 p-6 mb-8 flex items-start gap-3">
        <Check size={20} className="text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-montserrat font-semibold text-sm text-green-800">Payment screenshot received</p>
          <p className="font-montserrat text-sm text-green-700 mt-1">
            We'll verify the transfer and confirm your {dealName} booking on WhatsApp. Free cancellation, 100% refund anytime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#E30613] p-6 md:p-8 mb-8">
      <div className="flex items-start gap-2.5 mb-4">
        <Zap size={18} className="text-[#E30613] mt-0.5 shrink-0" />
        <div>
          <h2 className="font-playfair font-semibold text-xl text-[#1A0B2E]">Complete Your Payment</h2>
          <p className="font-montserrat text-sm text-gray-600 mt-1 leading-relaxed">
            {dealName} is confirmed once the full amount is paid in advance. Free cancellation and a{' '}
            <span className="font-semibold text-[#1A0B2E]">100% refund</span> at any time.
          </p>
        </div>
      </div>

      <p className="font-montserrat text-sm text-[#1A0B2E] mb-2">
        Transfer <span className="font-semibold">{formatCurrency(amount)}</span> to:
      </p>
      <div className="bg-[#1A0B2E]/[0.03] border border-gray-200 px-4 py-3 font-montserrat text-sm text-[#1A0B2E] space-y-2 mb-5">
        {row('Bank:', bank.bankName)}
        {row('Account Title:', bank.accountTitle)}
        {row('IBAN:', bank.iban, 'iban')}
        {row('Account No:', bank.accountNumber, 'accountNumber')}
      </div>

      <label className="block text-[10px] font-semibold tracking-wider uppercase text-gray-500 mb-1.5 font-montserrat">
        Upload payment screenshot
      </label>
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
        className="w-full text-xs font-montserrat text-gray-600 file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-[#1A0B2E] file:text-white file:text-xs file:font-semibold file:uppercase file:tracking-wider file:cursor-pointer cursor-pointer border border-gray-200 bg-white"
      />
      {uploading && (
        <p className="text-xs text-gray-500 font-montserrat mt-1 flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Uploading...
        </p>
      )}
      {error && <p className="text-xs text-red-600 font-montserrat mt-1">{error}</p>}

      <div className="flex items-center gap-3 my-4">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="font-montserrat text-xs text-gray-400 uppercase tracking-wider">or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <TrackedLink
        href={`https://wa.me/923173330998?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
        // Post-booking contact — distinct event so Meta's Contact tag
        // doesn't fire for an already-converted guest.
        event="confirmation_whatsapp_click"
        eventParams={{ location: 'thank_you_payment', booking_ref: bookingRef }}
        className="btn-whatsapp w-full inline-flex items-center justify-center gap-2 py-3"
      >
        <MessageCircle size={16} />
        Send Screenshot on WhatsApp
      </TrackedLink>
    </div>
  );
}
