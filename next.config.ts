import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "ts", "tsx"],

  images: {
    localPatterns: [
      {
        pathname: "/_next/static/media/**",
        search: "",
      },
    ],
  },
}

export default nextConfig
