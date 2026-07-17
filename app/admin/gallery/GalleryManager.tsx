'use client';

import { useState, useTransition } from 'react';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  category: string;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  initialImages: GalleryImage[];
}

const CATEGORIES = [
  { value: 'rooms', label: 'Rooms & Suites' },
  { value: 'common', label: 'Common Areas' },
  { value: 'dining', label: 'Dining' },
  { value: 'hotel', label: 'Hotel & Exterior' },
];

const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label || v;

export default function GalleryManager({ initialImages }: Props) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [category, setCategory] = useState('rooms');

  const inputClass =
    'w-full border border-gray-200 px-3 py-2 text-sm font-montserrat outline-none focus:border-[#1A0B2E] transition-colors';

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAdd = () => {
    if (!url.trim()) {
      flash('Please enter an image URL or path.');
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const sameCat = images.filter((i) => i.category === category);
      const nextSort = sameCat.length
        ? Math.max(...sameCat.map((i) => i.sort_order)) + 1
        : 0;
      const { data, error } = await supabase
        .from('gallery_images')
        .insert({
          url: url.trim(),
          alt: alt.trim() || null,
          category,
          sort_order: nextSort,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        flash(`Error: ${error.message}`);
        return;
      }
      if (data) {
        setImages([...images, data as GalleryImage]);
        setUrl('');
        setAlt('');
        flash('Photo added.');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from('gallery_images').delete().eq('id', id);
      if (error) {
        flash(`Error: ${error.message}`);
        return;
      }
      setImages(images.filter((i) => i.id !== id));
      flash('Photo removed.');
    });
  };

  const handleToggleActive = (id: string, current: boolean) => {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('gallery_images')
        .update({ is_active: !current })
        .eq('id', id);
      if (error) {
        flash(`Error: ${error.message}`);
        return;
      }
      setImages(images.map((i) => (i.id === id ? { ...i, is_active: !current } : i)));
    });
  };

  // group images by category for display
  const grouped = CATEGORIES.map((c) => ({
    ...c,
    items: images.filter((i) => i.category === c.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {/* Add form */}
      <div className="bg-white border border-gray-100 p-6 max-w-3xl">
        <p className="font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-4">
          Add a Photo
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <input
              className={inputClass}
              placeholder="Image path or URL — e.g. /Hotel Front.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs font-montserrat text-gray-400 mt-1">
              Use a file in the public folder (e.g. <code>/Hotel Front.jpg</code>) or a full image URL.
            </p>
          </div>
          <input
            className={inputClass}
            placeholder="Caption / alt text (optional)"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
          <select
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={isPending}
          className="btn-red py-2.5 px-6 text-xs flex items-center gap-2 disabled:opacity-50"
        >
          <Plus size={14} /> Add Photo
        </button>
        {message && (
          <div
            className={`mt-4 px-4 py-2.5 text-sm font-montserrat ${
              message.startsWith('Error')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Existing images grouped by category */}
      {grouped.length === 0 ? (
        <p className="font-montserrat text-sm text-gray-400">
          No photos yet. Add your first one above.
        </p>
      ) : (
        grouped.map((group) => (
          <div key={group.value}>
            <h2 className="font-montserrat font-semibold text-sm uppercase tracking-wide text-[#1A0B2E] mb-4">
              {group.label}{' '}
              <span className="text-gray-400 font-normal">({group.items.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.items.map((img) => (
                <div
                  key={img.id}
                  className={`border p-2 bg-white ${
                    img.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt || ''}
                    className="w-full aspect-[4/3] object-cover mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(img.id, img.is_active)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-montserrat font-semibold py-1.5 border border-gray-200 text-gray-600 hover:border-[#1A0B2E] disabled:opacity-50"
                      title={img.is_active ? 'Hide from website' : 'Show on website'}
                    >
                      {img.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                      {img.is_active ? 'Visible' : 'Hidden'}
                    </button>
                    <button
                      onClick={() => handleDelete(img.id)}
                      disabled={isPending}
                      className="p-1.5 text-red-400 hover:text-red-600 border border-gray-200 disabled:opacity-50"
                      title="Delete photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
