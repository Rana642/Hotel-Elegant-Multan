import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hotel Elegant Executive Suites Multan',
    short_name: 'Hotel Elegant',
    description:
      "Multan's top-rated boutique hotel in Gulgasht Colony. Executive, Family & Presidential suites — book direct, no advance payment.",
    start_url: '/',
    display: 'standalone',
    background_color: '#1A0B2E',
    theme_color: '#1A0B2E',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
