'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { RoomImage } from '@/types';

interface Props {
  images: RoomImage[];
  roomName: string;
}

export default function RoomGallery({ images, roomName }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const prev = () => setLightbox((l) => (l !== null ? (l - 1 + images.length) % images.length : null));
  const next = () => setLightbox((l) => (l !== null ? (l + 1) % images.length : null));

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {images.slice(0, 6).map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightbox(i)}
            className={`relative overflow-hidden ${i === 0 ? 'col-span-3 aspect-[16/9]' : 'aspect-square'}`}
          >
            <Image
              src={img.url}
              alt={img.alt || `${roomName} ${i + 1}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
              sizes={i === 0 ? '900px' : '300px'}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 text-white p-2 hover:text-gray-300"
          >
            <ChevronLeft size={32} />
          </button>
          <div
            className="relative w-full max-w-4xl mx-4 aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightbox].url}
              alt={images[lightbox].alt || roomName}
              fill
              className="object-contain"
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 text-white p-2 hover:text-gray-300"
          >
            <ChevronRight size={32} />
          </button>
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white"
          >
            <X size={28} />
          </button>
          <p className="absolute bottom-4 text-white/50 text-sm font-montserrat">
            {lightbox + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
