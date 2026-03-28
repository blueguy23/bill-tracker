import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
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
