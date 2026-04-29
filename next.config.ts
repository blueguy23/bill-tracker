import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: '/recurring',     destination: '/payments',                   permanent: true },
      { source: '/subscriptions', destination: '/payments?tab=subscriptions', permanent: true },
      { source: '/goals',         destination: '/budget?tab=goals',           permanent: true },
      { source: '/credit',        destination: '/credit-health',              permanent: true },
    ];
  },
  // strictdb is ESM-only — tell Next.js to import it natively instead of bundling.
  // serverExternalPackages also prevents Turbopack from traversing strictdb's optional
  // peer deps (mysql2, pg, better-sqlite3, etc.) that aren't installed.
  serverExternalPackages: ['strictdb', 'mongodb'],
  images: {
    formats: ['image/webp'],
  },
};

export default nextConfig;
