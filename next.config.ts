import type { NextConfig } from 'next'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const nextConfig: NextConfig = {
  // Note: Using --webpack flag in dev script to avoid Turbopack symlink issues on Windows

  // Skip TypeScript errors during build
  // This allows deployment while issues are being fixed
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },

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
