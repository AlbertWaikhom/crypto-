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
};

export default nextConfig;

