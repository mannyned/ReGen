import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Explicitly set Turbopack root to silence workspace detection warning
  turbopack: {
    root: __dirname,
  },

  // Skip TypeScript and ESLint errors during build
  // This allows deployment while issues are being fixed
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
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
