import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Note: Using --webpack flag in dev script to avoid Turbopack symlink issues on Windows

  // Skip TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
