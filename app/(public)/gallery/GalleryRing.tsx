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

const AUTO_SPEED_DEG_PER_SEC = 5;
const DRAG_SENSITIVITY = 0.25; // deg of ring rotation per px dragged
const CLICK_MOVE_THRESHOLD = 6; // px — below this, pointer-up counts as a click/tap, not a drag
const FLATTEN = 0.30; // vertical squash of the ellipse (ry = rx * FLATTEN)
const BASE_W = 92; // card size at front (scaled down toward the back)
const BASE_H = 132;

/**
 * Flat "photo ring" (ellipse viewed from slightly above): every card stays
 * upright; cards at the front are larger/sharper and lower on screen, cards
 * at the back are smaller/faded and higher — done with a 2D ellipse
 * projection (cos/sin), not a CSS 3D carousel, so the shape reads exactly
 * like a flat rotating disc of photos.
 */
export default function GalleryRing({ images }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const movedRef = useRef(0);
  const lastXRef = useRef(0);
  const pausedRef = useRef(false);
  const sizeRef = useRef({ rx: 500, ry: 150 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const count = images.length;

  // Project every card onto the ellipse for the current rotation.
  // Direct DOM writes — no per-frame re-render.
  const projectAll = useCallback(() => {
    const { rx, ry } = sizeRef.current;
    for (let i = 0; i < count; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const a = ((i * (360 / count) + rotationRef.current) * Math.PI) / 180;
      const x = Math.cos(a) * rx;
      const depth = Math.sin(a); // -1 = back, +1 = front
      const y = depth * ry;
      const t = (depth + 1) / 2; // 0..1
      const scale = 0.45 + 0.55 * t;
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      el.style.opacity = String(0.3 + 0.7 * t);
      el.style.zIndex = String(Math.round(t * 100));
      el.style.filter = t < 0.45 ? 'blur(1px)' : 'none';
    }
  }, [count]);

  // Responsive radii from container width; re-project immediately on resize
  // (and on mount, so the ring is laid out even before the first rAF tick)
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      const rx = Math.max(150, w / 2 - BASE_W * 0.7);
      sizeRef.current = { rx, ry: rx * FLATTEN };
      projectAll();
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [projectAll]);

  // Animation loop: advances rotation (unless paused/dragging)
  useEffect(() => {
    let raf: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      if (!isDraggingRef.current && !pausedRef.current) {
        rotationRef.current += (dt / 1000) * AUTO_SPEED_DEG_PER_SEC;
      }
      projectAll();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [projectAll]);

  // NOTE: no setPointerCapture here — capturing on the scene re-targets the
  // subsequent click event to the scene, which silently breaks the per-photo
  // click-to-enlarge. Drag tracking works fine without it.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    movedRef.current = 0;
    lastXRef.current = e.clientX;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    movedRef.current += Math.abs(dx);
    // Minus so the front of the ring follows the pointer (drag right -> front moves right)
    rotationRef.current -= dx * DRAG_SENSITIVITY;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    // Touch has no real hover: don't leave the ring paused after a tap/drag
    if (e.pointerType === 'touch') {
      pausedRef.current = false;
      setHoveredIndex(null);
    }
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
    if (movedRef.current > CLICK_MOVE_THRESHOLD) return; // was a drag, not a click
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
    setLightboxIndex((i) => (i !== null ? (i - 1 + count) % count : null));
  const nextLightbox = () =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % count : null));

  if (count === 0) {
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
        className="relative w-full select-none touch-pan-y cursor-grab active:cursor-grabbing"
        style={{ height: 440 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* Ellipse of cards, centered */}
        <div className="absolute left-1/2 top-1/2">
          {images.map((img, i) => (
            <div
              key={img.id}
              ref={(el) => { itemRefs.current[i] = el; }}
              className="absolute cursor-pointer will-change-transform"
              style={{ width: BASE_W, height: BASE_H }}
              onMouseEnter={() => handleItemEnter(i)}
              onMouseLeave={handleItemLeave}
              onClick={() => handleItemClick(i)}
            >
              <div className="relative w-full h-full overflow-hidden rounded-sm shadow-md ring-1 ring-black/10 bg-white">
                <Image
                  src={img.url}
                  alt={img.alt || 'Hotel Elegant Executive Suites Multan'}
                  fill
                  sizes="100px"
                  draggable={false}
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Center spotlight (hover preview) */}
        {spotlight && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
            style={{ zIndex: 200 }}
          >
            <div className="relative w-full max-w-xs sm:max-w-sm aspect-[4/3] shadow-2xl bg-white">
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
            {lightboxIndex + 1} / {count}
          </p>
        </div>
      )}
    </>
  );
}
