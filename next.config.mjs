/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // 301 redirects from old WordPress URLs to new pages (recovers link authority,
  // stops 404s). Add more mappings here as they surface in Search Console.
  async redirects() {
    return [
      // Canonical host: force www → non-www (preserves full path; query string
      // is carried over automatically). Keeps one canonical origin for SEO.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.elegant-suite.com' }],
        destination: 'https://elegant-suite.com/:path*',
        permanent: true,
      },
      // 301 redirects from old WordPress URLs to new pages (recovers link
      // authority, stops 404s). Add more here as they surface in Search Console.
      { source: '/home/welcome-to-elegant-executive-suites/', destination: '/', permanent: true },
      { source: '/home/welcome-to-elegant-executive-suites', destination: '/', permanent: true },
      { source: '/home', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
