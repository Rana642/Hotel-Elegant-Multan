'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { upsertPromotion, type PromotionFormInput } from './actions';

interface Props {
  initial?: PromotionFormInput;
  isEdit?: boolean;
}

export default function PromotionForm({ initial, isEdit = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [title, setTitle] = useState(initial?.title || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [tagline, setTagline] = useState(initial?.tagline || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '');
  const [badge, setBadge] = useState(initial?.badge || '');
  const [ctaLabel, setCtaLabel] = useState(initial?.cta_label || 'Book Now');
  const [ctaHref, setCtaHref] = useState(initial?.cta_href || '/booking');
  const [sortOrder, setSortOrder] = useState(initial?.sort_order?.toString() ?? '0');
  const [isActive, setIsActive] = useState(initial?.is_active !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const input: PromotionFormInput = {
        id: initial?.id,
        slug,
        title,
        tagline: tagline || null,
        description: description || null,
        image_url: imageUrl || null,
        badge: badge || null,
        cta_label: ctaLabel || null,
        cta_href: ctaHref || null,
        sort_order: sortOrder ? Number(sortOrder) : 0,
        is_active: isActive,
      };
      const result = await upsertPromotion(input, isEdit);
      if (!result.success) {
        setError(result.error || 'Save failed.');
        return;
      }
      router.push('/admin/promotions');
      router.refresh();
    });
  };

  const inputClass = 'w-full min-w-0 border border-gray-200 px-3.5 py-2.5 text-sm font-montserrat outline-none focus:border-[#1A0B2E] rounded';
  const labelClass = 'block text-[10px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5 font-montserrat';

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 p-6 space-y-5 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Title <span className="text-[#E30613]">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Early Booking Offer"
            required
            maxLength={120}
          />
        </div>
        <div>
          <label className={labelClass}>Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className={inputClass}
            placeholder="Plan ahead & save"
            maxLength={120}
          />
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className={labelClass}>Slug (optional — auto from title)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            className={inputClass + ' font-mono max-w-sm'}
            placeholder="early-booking"
            maxLength={60}
          />
          <p className="text-[10px] text-gray-400 mt-1 font-montserrat">Used in links / tab anchors. Cannot be changed later.</p>
        </div>
      )}

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass + ' resize-none'}
          rows={4}
          placeholder="Book at least 7 days before check-in and enjoy our best direct rate…"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Image URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className={inputClass}
            placeholder="/Executive King 1.jpg"
          />
          <p className="text-[10px] text-gray-400 mt-1 font-montserrat">A path from /public (e.g. /Family Suite 1.jpg) or a full https URL.</p>
        </div>
        <div>
          <label className={labelClass}>Badge</label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            className={inputClass}
            placeholder="Save More"
            maxLength={40}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div>
          <label className={labelClass}>Button label</label>
          <input type="text" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className={inputClass} placeholder="Book Now" maxLength={40} />
        </div>
        <div>
          <label className={labelClass}>Button link</label>
          <input type="text" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} className={inputClass} placeholder="/booking" />
        </div>
        <div>
          <label className={labelClass}>Sort order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} min={0} placeholder="1" />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#E30613] w-4 h-4" />
        <span className="font-montserrat text-sm text-gray-700 font-medium">Active</span>
        <span className="text-[11px] text-gray-500">Uncheck to keep the promotion but hide it from the site.</span>
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded font-montserrat">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-red py-3 px-8 text-xs disabled:opacity-50 flex items-center gap-2">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isPending ? 'Saving…' : (isEdit ? 'Save changes' : 'Create promotion')}
        </button>
        <button type="button" onClick={() => router.back()} className="py-3 px-6 border border-gray-300 text-gray-700 text-xs font-montserrat font-semibold uppercase tracking-wider rounded">
          Cancel
        </button>
      </div>
    </form>
  );
}
