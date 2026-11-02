/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@navrix/ui',
    '@navrix/types',
    '@navrix/validation',
    '@navrix/config',
  ],
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@navrix/ui',
    ],
  },
};

export default nextConfig;
