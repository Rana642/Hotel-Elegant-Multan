'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Props {
  videoSrc: string;
  poster: string;
  alt: string;
}

/**
 * Hero background: video plays on all devices (mobile included). The
 * poster still renders first on the server (fast LCP paint), and the
 * video mounts client-side right after — so first paint speed is
 * unaffected even though the video always loads afterward.
 */
export default function HeroMedia({ videoSrc, poster, alt }: Props) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!videoSrc) return;
    setShowVideo(true);
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
