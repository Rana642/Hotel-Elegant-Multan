'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  rooms?: { name: string; slug: string } | null;
}

interface Props {
  images: GalleryImage[];
}

export default function GalleryGrid({ images }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const prev = () => setLightbox((l) => (l !== null ? (l - 1 + images.length) % images.length : null));
  const next = () => setLightbox((l) => (l !== null ? (l + 1) % images.length : null));

  if (images.length === 0) {
    return (
      <p className="text-center font-montserrat text-gray-400 py-12">
        Gallery photos coming soon.
      </p>
    );
  }

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightbox(i)}
            className="block w-full overflow-hidden break-inside-avoid group"
          >
            <div className="relative">
              <Image
                src={img.url}
                alt={img.alt || img.rooms?.name || 'Hotel Elegant Executive Suites Multan'}
                width={400}
                height={300}
                className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {img.rooms && (
                <div className="absolute bottom-0 left-0 right-0 bg-[#1A0B2E]/60 text-white py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="font-montserrat text-xs font-semibold">{img.rooms.name}</p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 text-white p-2 hover:text-gray-300">
            <ChevronLeft size={32} />
          </button>
          <div className="relative w-full max-w-4xl mx-4 aspect-[4/3]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[lightbox].url}
              alt={images[lightbox].alt || 'Hotel Elegant Executive Suites Multan'}
              fill
              className="object-contain"
            />
            {images[lightbox].rooms && (
              <p className="absolute bottom-2 left-0 right-0 text-center text-white/70 text-sm font-montserrat">
                {images[lightbox].rooms?.name}
              </p>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 text-white p-2 hover:text-gray-300">
            <ChevronRight size={32} />
          </button>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white">
            <X size={28} />
          </button>
          <p className="absolute bottom-4 text-white/40 text-xs font-montserrat">
            {lightbox + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
