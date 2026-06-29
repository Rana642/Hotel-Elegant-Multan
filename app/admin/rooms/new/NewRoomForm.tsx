'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewRoomForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sizeSqft, setSizeSqft] = useState('');
  const [maxAdults, setMaxAdults] = useState(2);
  const [maxChildren, setMaxChildren] = useState(0);
  const [view, setView] = useState('City View');
  const [price, setPrice] = useState('');
  const [amenities, setAmenities] = useState('AC, Smart TV, Free WiFi, Ensuite Bathroom, Tea/Coffee Maker, Minibar');

  const inputClass = 'w-full border border-gray-200 px-4 py-2.5 font-montserrat text-sm text-gray-900 outline-none focus:border-[#1A0B2E] transition-colors';
  const labelClass = 'block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-1.5';

  const handleCreate = () => {
    if (!name.trim() || !slug.trim()) { setError('Name and slug are required.'); return; }
    startTransition(async () => {
      const supabase = createClient();
      const amenitiesArr = amenities.split(',').map((a) => a.trim()).filter(Boolean);
      const { data, error: err } = await supabase.from('rooms').insert({
        name: name.trim(), slug: slug.trim().toLowerCase(),
        description: description.trim() || null,
        size_sqft: sizeSqft ? parseInt(sizeSqft) : null,
        max_adults: maxAdults, max_children: maxChildren,
        view: view.trim(), price_per_night: price ? parseFloat(price) : null,
        amenities: amenitiesArr, is_active: true, sort_order: 99,
      }).select('id').single();
      if (err) { setError(err.message); return; }
      router.push(`/admin/rooms/${data.id}`);
    });
  };

  return (
    <div className="max-w-2xl bg-white border border-gray-100 p-8 space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Room Name *</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Executive King" />
        </div>
        <div>
          <label className={labelClass}>Slug (URL) *</label>
          <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="executive-king" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea className={`${inputClass} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Size (sq ft)</label>
          <input type="number" className={inputClass} value={sizeSqft} onChange={(e) => setSizeSqft(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Max Adults</label>
          <input type="number" className={inputClass} value={maxAdults} onChange={(e) => setMaxAdults(Number(e.target.value))} min={1} max={10} />
        </div>
        <div>
          <label className={labelClass}>Max Children</label>
          <input type="number" className={inputClass} value={maxChildren} onChange={(e) => setMaxChildren(Number(e.target.value))} min={0} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>View</label>
          <input className={inputClass} value={view} onChange={(e) => setView(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Price per Night (PKR)</label>
          <input type="number" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8500" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Amenities (comma separated)</label>
        <input className={inputClass} value={amenities} onChange={(e) => setAmenities(e.target.value)} />
      </div>
      {error && <p className="text-red-600 text-sm font-montserrat">{error}</p>}
      <button onClick={handleCreate} disabled={isPending} className="btn-red w-full py-3 disabled:opacity-50">
        {isPending ? 'Creating...' : 'Create Room'}
      </button>
    </div>
  );
}
