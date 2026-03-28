import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    formats: ['image/webp'],
  },
};

export default nextConfig;
