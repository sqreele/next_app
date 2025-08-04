import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Ensure we use relative URLs for API calls
    NEXT_PUBLIC_API_URL: '',
    NEXT_PUBLIC_SOCKET_URL: '',
  },
  // Disable external domain resolution
  experimental: {
    esmExternals: false,
  },
  // Ensure we don't proxy to external domains
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
