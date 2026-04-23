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
  // strictdb is ESM-only — tell Next.js to import it natively instead of bundling
  serverExternalPackages: ['strictdb', 'mongodb'],
  images: {
    formats: ['image/webp'],
  },
  webpack: (config) => {
    // StrictDB supports multiple DB backends via optional dynamic imports.
    // Suppress "module not found" warnings for drivers not installed.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'mysql2/promise': false,
      pg: false,
      'better-sqlite3': false,
      mssql: false,
      tedious: false,
    };
    return config;
  },
};

export default nextConfig;
