import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@unison/ui',
    '@unison/shared',
    '@unison/types',
    '@unison/validation',
    '@unison/auth',
    '@unison/database',
    '@unison/billing',
    '@unison/security',
    '@unison/config',
  ],
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
