'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  category?: string | null;
}

interface Props {
  images: GalleryImage[];
}

const CATEGORY_LABELS: Record<string, string> = {
  rooms: 'Rooms & Suites',
  dining: 'Dining',
  common: 'Common Areas',
  hotel: 'Hotel & Exterior',
};

// Preferred display order for the filter tabs
const CATEGORY_ORDER = ['rooms', 'common', 'dining', 'hotel'];

export default function GalleryGrid({ images }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Which categories are actually present in the data
  const categories = useMemo(() => {
    const present = new Set(images.map((i) => i.category || 'hotel'));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [images]);

  const filtered = useMemo(
    () => (filter === 'all' ? images : images.filter((i) => (i.category || 'hotel') === filter)),
    [images, filter]
  );

  const prev = () =>
    setLightbox((l) => (l !== null ? (l - 1 + filtered.length) % filtered.length : null));
  const next = () =>
    setLightbox((l) => (l !== null ? (l + 1) % filtered.length : null));

  if (images.length === 0) {
    return (
      <p className="text-center font-montserrat text-gray-400 py-12">
        Gallery photos coming soon.
      </p>
    );
  }

  return (
    <>
      {/* Filter tabs */}
      {categories.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <FilterButton label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
          {categories.map((c) => (
            <FilterButton
              key={c}
              label={CATEGORY_LABELS[c] || c}
              active={filter === c}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>
      )}

      {/* Masonry grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {filtered.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightbox(i)}
            className="block w-full overflow-hidden break-inside-avoid group"
          >
            <div className="relative">
              <Image
                src={img.url}
                alt={img.alt || 'Hotel Elegant Executive Suites Multan'}
                width={400}
                height={300}
                className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {img.category && CATEGORY_LABELS[img.category] && (
                <div className="absolute bottom-0 left-0 right-0 bg-[#1A0B2E]/60 text-white py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="font-montserrat text-xs font-semibold">
                    {img.alt || CATEGORY_LABELS[img.category]}
                  </p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 text-white p-2 hover:text-gray-300"
          >
            <ChevronLeft size={32} />
          </button>
          <div className="relative w-full max-w-4xl mx-4 aspect-[4/3]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={filtered[lightbox].url}
              alt={filtered[lightbox].alt || 'Hotel Elegant Executive Suites Multan'}
              fill
              className="object-contain"
            />
            {filtered[lightbox].alt && (
              <p className="absolute bottom-2 left-0 right-0 text-center text-white/70 text-sm font-montserrat">
                {filtered[lightbox].alt}
              </p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 text-white p-2 hover:text-gray-300"
          >
            <ChevronRight size={32} />
          </button>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white">
            <X size={28} />
          </button>
          <p className="absolute bottom-4 text-white/40 text-xs font-montserrat">
            {lightbox + 1} / {filtered.length}
          </p>
        </div>
      )}
    </>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-montserrat text-xs font-semibold tracking-wide uppercase px-5 py-2.5 border transition-colors ${
        active
          ? 'bg-[#1A0B2E] text-white border-[#1A0B2E]'
          : 'bg-white text-gray-600 border-gray-200 hover:border-[#1A0B2E] hover:text-[#1A0B2E]'
      }`}
    >
      {label}
    </button>
  );
}
