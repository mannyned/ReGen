import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Explicitly set Turbopack root to silence workspace detection warning
  turbopack: {
    root: __dirname,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
