'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { createBlankPromotion } from './actions';

/** "+ Add promotion" — inserts a fresh blank row and refreshes the list.
 *  The admin then edits the new card in place. Silver Sand's flow. */
export default function AddPromotionButton() {
  const router = useRouter();
  const [isPending, start] = useTransition();

  const onClick = () => {
    start(async () => {
      const r = await createBlankPromotion();
      if (!r.success) {
        alert(r.error || 'Could not create promotion.');
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 text-sm font-montserrat font-semibold text-[#1A0B2E] hover:text-[#E30613] disabled:opacity-50"
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
      {isPending ? 'Adding…' : 'Add promotion'}
    </button>
  );
}
