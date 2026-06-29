'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface RoomImage { id: string; url: string; alt: string | null; is_featured: boolean; sort_order: number; }
interface Room {
  id: string; name: string; slug: string; description: string | null;
  size_sqft: number | null; max_adults: number; max_children: number;
  view: string | null; price_per_night: number | null; amenities: string[];
  is_active: boolean; sort_order: number; room_images: RoomImage[];
}

interface Props { room: Room }

export default function RoomEditForm({ room }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const [name, setName] = useState(room.name);
  const [slug, setSlug] = useState(room.slug);
  const [description, setDescription] = useState(room.description || '');
  const [sizeSqft, setSizeSqft] = useState(room.size_sqft?.toString() || '');
  const [maxAdults, setMaxAdults] = useState(room.max_adults);
  const [maxChildren, setMaxChildren] = useState(room.max_children);
  const [view, setView] = useState(room.view || 'City View');
  const [price, setPrice] = useState(room.price_per_night?.toString() || '');
  const [amenities, setAmenities] = useState(room.amenities?.join(', ') || '');
  const [isActive, setIsActive] = useState(room.is_active);
  const [sortOrder, setSortOrder] = useState(room.sort_order);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [images, setImages] = useState<RoomImage[]>(room.room_images || []);

  const inputClass = 'w-full border border-gray-200 px-4 py-2.5 font-montserrat text-sm text-gray-900 outline-none focus:border-[#1A0B2E] transition-colors';
  const labelClass = 'block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-1.5';

  const handleSave = () => {
    startTransition(async () => {
      const supabase = createClient();
      const amenitiesArr = amenities.split(',').map((a) => a.trim()).filter(Boolean);

      const { error } = await supabase.from('rooms').update({
        name, slug, description: description || null,
        size_sqft: sizeSqft ? parseInt(sizeSqft) : null,
        max_adults: maxAdults, max_children: maxChildren,
        view: view || null, price_per_night: price ? parseFloat(price) : null,
        amenities: amenitiesArr, is_active: isActive, sort_order: sortOrder,
      }).eq('id', room.id);

      setMessage(error ? `Error: ${error.message}` : 'Room saved successfully.');
      if (!error) router.refresh();
    });
  };

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('room_images').insert({
        room_id: room.id, url: imageUrl.trim(), alt: imageAlt.trim() || null,
        is_featured: images.length === 0, sort_order: images.length,
      }).select().single();
      if (!error && data) {
        setImages([...images, data as RoomImage]);
        setImageUrl(''); setImageAlt('');
      }
    });
  };

  const handleDeleteImage = (id: string) => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from('room_images').delete().eq('id', id);
      setImages(images.filter((i) => i.id !== id));
    });
  };

  const handleSetFeatured = (id: string) => {
    startTransition(async () => {
      const supabase = createClient();
      await Promise.all(images.map((i) =>
        supabase.from('room_images').update({ is_featured: i.id === id }).eq('id', i.id)
      ));
      setImages(images.map((i) => ({ ...i, is_featured: i.id === id })));
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6 bg-white border border-gray-100 p-7">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Room Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Slug (URL)</label>
            <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea className={`${inputClass} resize-none`} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-5">
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
            <input type="number" className={inputClass} value={maxChildren} onChange={(e) => setMaxChildren(Number(e.target.value))} min={0} max={5} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>View</label>
            <input className={inputClass} value={view} onChange={(e) => setView(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Price per Night (PKR)</label>
            <input type="number" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 8500" />
          </div>
        </div>

        <div>
          <label className={labelClass}>Amenities (comma separated)</label>
          <input className={inputClass} value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="AC, Smart TV, Free WiFi, ..." />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Sort Order</label>
            <input type="number" className={inputClass} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} min={0} />
          </div>
          <div className="flex items-end gap-3 pb-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#E30613] w-4 h-4" />
              <span className="font-montserrat text-sm text-gray-700 font-medium">Active / Visible</span>
            </label>
          </div>
        </div>

        {message && (
          <div className={`px-4 py-3 text-sm font-montserrat ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {message}
          </div>
        )}

        <button onClick={handleSave} disabled={isPending} className="btn-red w-full py-3 disabled:opacity-50">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Images */}
      <div className="bg-white border border-gray-100 p-6">
        <h2 className="font-montserrat font-semibold text-sm uppercase tracking-wide text-[#1A0B2E] mb-5">Photos</h2>

        <div className="space-y-3 mb-5">
          {images.map((img) => (
            <div key={img.id} className="border border-gray-100 p-3">
              <img src={img.url} alt={img.alt || ''} className="w-full aspect-[4/3] object-cover mb-2" />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSetFeatured(img.id)}
                  className={`flex-1 text-xs font-montserrat font-semibold py-1.5 border ${img.is_featured ? 'bg-[#1A0B2E] text-white border-[#1A0B2E]' : 'border-gray-200 text-gray-600 hover:border-[#1A0B2E]'}`}
                >
                  {img.is_featured ? '★ Featured' : 'Set Featured'}
                </button>
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 border border-gray-200"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="font-montserrat text-xs font-semibold tracking-wide uppercase text-gray-500 mb-3">Add Image URL</p>
          <input
            className="w-full border border-gray-200 px-3 py-2 text-sm font-montserrat mb-2 outline-none focus:border-[#1A0B2E]"
            placeholder="https://... image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <input
            className="w-full border border-gray-200 px-3 py-2 text-sm font-montserrat mb-3 outline-none focus:border-[#1A0B2E]"
            placeholder="Alt text (optional)"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
          />
          <button onClick={handleAddImage} className="w-full flex items-center justify-center gap-2 border border-[#1A0B2E] text-[#1A0B2E] py-2 text-xs font-montserrat font-semibold hover:bg-[#1A0B2E] hover:text-white transition-colors tracking-wider uppercase">
            <Plus size={12} /> Add Photo
          </button>
        </div>
      </div>
    </div>
  );
}
