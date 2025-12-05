import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  images: {
    domains: ["res.cloudinary.com", "images.unsplash.com", "ipshopy.com"], // ✅ for Cloudinary, Unsplash, and ipshopy
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pinimg.com", // ✅ for Pinterest
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // ✅ for Unsplash dummy images
      },
      {
        protocol: "https",
        hostname: "ipshopy.com", // ✅ for ipshopy product images
      },
    ],
  },
};

export default nextConfig;

