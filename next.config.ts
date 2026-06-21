
import type {NextConfig} from 'next';
import { getSecurityHeaders } from './src/lib/security-headers';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: getSecurityHeaders() }];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('handlebars');
    }
    return config;
  },
  experimental: {
    allowedDevOrigins: [
        "https://*.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev",
    ]
  },
};

export default nextConfig;
