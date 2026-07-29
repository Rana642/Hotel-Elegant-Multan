'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { toggleCouponActive, deleteCoupon } from './actions';

export default function CouponRowActions({ code, isActive }: { code: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const toggle = () => {
    startTransition(async () => {
      await toggleCouponActive(code, !isActive);
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deleteCoupon(code);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2 justify-end flex-wrap">
      <Link
        href={`/admin/coupons/${encodeURIComponent(code)}`}
        title="Edit"
        className="p-1.5 text-gray-400 hover:text-[#1A0B2E]"
      >
        <Pencil size={15} />
      </Link>
      <button
        onClick={toggle}
        disabled={isPending}
        title={isActive ? 'Deactivate' : 'Activate'}
        className={`p-1.5 disabled:opacity-50 ${
          isActive ? 'text-green-600 hover:text-gray-500' : 'text-gray-400 hover:text-green-600'
        }`}
      >
        {isActive ? <PowerOff size={15} /> : <Power size={15} />}
      </button>
      {confirming ? (
        <span className="flex items-center gap-1">
          <button
            onClick={remove}
            disabled={isPending}
            className="px-2 py-1 bg-red-600 text-white text-[10px] font-semibold uppercase tracking-wider rounded"
          >
            {isPending ? '…' : 'Confirm delete'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-gray-400 hover:text-gray-700 px-1"
          >
            cancel
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          title="Delete"
          className="p-1.5 text-gray-300 hover:text-red-600"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
