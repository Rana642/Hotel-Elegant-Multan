'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

const AUTO_SPEED_DEG_PER_SEC = 4;
const DRAG_SENSITIVITY = 0.35;
const CLICK_MOVE_THRESHOLD = 6; // px — below this, a pointer-up counts as a click/tap, not a drag

export default function GalleryRing({ images }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const movedRef = useRef(0);
  const lastXRef = useRef(0);
  const pausedRef = useRef(false);
  const [radius, setRadius] = useState(420);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const angleStep = images.length > 0 ? 360 / images.length : 0;

  // Responsive radius: scale ring to container width
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      setRadius(Math.max(180, Math.min(420, w / 2.6)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-rotate loop (pauses on hover/drag); writes transform directly for smoothness
  useEffect(() => {
    let raf: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      if (!isDraggingRef.current && !pausedRef.current) {
        rotationRef.current += (dt / 1000) * AUTO_SPEED_DEG_PER_SEC;
      }
      if (spinRef.current) {
        spinRef.current.style.transform = `rotateY(${rotationRef.current}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    movedRef.current = 0;
    lastXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    movedRef.current += Math.abs(dx);
    rotationRef.current += dx * DRAG_SENSITIVITY;
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleItemEnter = (i: number) => {
    pausedRef.current = true;
    setHoveredIndex(i);
  };
  const handleItemLeave = () => {
    pausedRef.current = false;
    setHoveredIndex(null);
  };

  const handleItemClick = (i: number) => {
    // A real drag (moved beyond threshold) shouldn't also trigger the lightbox
    if (movedRef.current > CLICK_MOVE_THRESHOLD) return;
    setLightboxIndex(i);
  };

  const caption = (img: GalleryImage) => {
    const label = img.category ? CATEGORY_LABELS[img.category] || img.category : '';
    return {
      name: img.alt || label || 'Hotel Elegant Executive Suites',
      tag: label ? `${label.toUpperCase()} · MULTAN` : 'MULTAN',
    };
  };

  const prevLightbox = () =>
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  const nextLightbox = () =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));

  if (images.length === 0) {
    return (
      <p className="text-center font-montserrat text-gray-400 py-12">
        Gallery photos coming soon.
      </p>
    );
  }

  const spotlight = hoveredIndex !== null ? images[hoveredIndex] : null;

  return (
    <>
      <div
        ref={sceneRef}
        className="relative w-full select-none touch-none"
        style={{ height: 460, perspective: 1400 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Tilt group (fixed) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d', transform: 'rotateX(74deg)' }}
        >
          {/* Spin group (rotated via ref every frame) */}
          <div ref={spinRef} style={{ transformStyle: 'preserve-3d' }}>
            {images.map((img, i) => (
              <div
                key={img.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  width: 78,
                  height: 118,
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
                }}
                onMouseEnter={() => handleItemEnter(i)}
                onMouseLeave={handleItemLeave}
                onClick={() => handleItemClick(i)}
              >
                <div className="relative w-full h-full overflow-hidden rounded-sm shadow-lg ring-1 ring-black/10 bg-white">
                  <Image
                    src={img.url}
                    alt={img.alt || 'Hotel Elegant Executive Suites Multan'}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center spotlight (hover preview) */}
        {spotlight && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
            style={{ zIndex: 20 }}
          >
            <div className="relative w-full max-w-xs sm:max-w-sm aspect-[4/3] shadow-2xl">
              <span className="absolute top-2 left-2 w-2.5 h-2.5 bg-[#8BC34A] z-10" />
              <Image
                src={spotlight.url}
                alt={spotlight.alt || 'Hotel Elegant Executive Suites Multan'}
                fill
                sizes="400px"
                className="object-cover"
              />
            </div>
            <p className="font-playfair font-semibold text-lg text-[#1A0B2E] mt-4">
              {caption(spotlight).name}
            </p>
            <p className="font-montserrat text-xs tracking-widest text-gray-400 mt-1">
              {caption(spotlight).tag}
            </p>
            <p className="font-montserrat text-xs font-semibold tracking-widest text-[#7CB342] mt-2 uppercase">
              Click to enlarge +
            </p>
          </div>
        )}
      </div>

      <p className="text-center font-montserrat text-xs text-gray-400 mt-2">
        Drag to spin · Hover a photo to preview · Click to enlarge
      </p>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
            className="absolute left-4 text-white p-2 hover:text-gray-300"
          >
            <ChevronLeft size={32} />
          </button>
          <div className="relative w-full max-w-4xl mx-4 aspect-[4/3]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[lightboxIndex].url}
              alt={images[lightboxIndex].alt || 'Hotel Elegant Executive Suites Multan'}
              fill
              className="object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-3">
              <p className="font-montserrat text-xs tracking-widest text-white uppercase">
                {caption(images[lightboxIndex]).name} · {caption(images[lightboxIndex]).tag}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
            className="absolute right-4 text-white p-2 hover:text-gray-300"
          >
            <ChevronRight size={32} />
          </button>
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white"
          >
            <X size={28} />
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs font-montserrat">
            {lightboxIndex + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
