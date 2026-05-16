import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required at build/dev time");
}
const supabaseHost = new URL(supabaseUrl).hostname;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Fits a 10 MB portfolio PDF + 5 MB author profile image + form overhead
      // in a single submit. Default is 1 MB, which rejects every upload.
      bodySizeLimit: "16mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
