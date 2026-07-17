'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Props {
  videoSrc: string;
  poster: string;
  alt: string;
}

/**
 * Hero background: video only loads on desktop-width screens with a
 * normal connection. Mobile and data-saver/slow-connection users get the
 * static poster only — the <video> element never mounts, so no video
 * bytes are ever requested. Poster is what paints first either way.
 */
export default function HeroMedia({ videoSrc, poster, alt }: Props) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!videoSrc) return;

    const isDesktop = window.matchMedia('(min-width: 768px)').matches;

    const conn = (navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const saveData = conn?.saveData;
    const isSlow = conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g';

    if (isDesktop && !saveData && !isSlow) {
      setShowVideo(true);
    }
  }, [videoSrc]);

  if (showVideo) {
    return (
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        aria-hidden="true"
        disablePictureInPicture
        disableRemotePlayback
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    );
  }

  return (
    <Image
      src={poster}
      alt={alt}
      fill
      priority
      className="object-cover"
    />
  );
}
