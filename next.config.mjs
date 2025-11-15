/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Turbopack (use webpack instead for stability)
  // Remove --turbo from package.json dev script

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
