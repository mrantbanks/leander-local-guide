import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic, DB-backed app — runs as a Node server in Docker on web1.
  output: "standalone",
  images: { unoptimized: true },
};

export default nextConfig;
