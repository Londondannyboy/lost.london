import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.londonmylondon.co.uk',
      },
    ],
  },
}

export default nextConfig
