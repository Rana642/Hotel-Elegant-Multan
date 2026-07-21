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
  // OAuth discovery paths are dot-prefixed per RFC8414/RFC9728 spec and can't
  // live as literal app-router folders, so route them to normal API handlers.
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/oauth/well-known/authorization-server',
      },
      {
        source: '/.well-known/oauth-protected-resource',
        destination: '/api/oauth/well-known/protected-resource',
      },
    ];
  },
};

export default nextConfig;
