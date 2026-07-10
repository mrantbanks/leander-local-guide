import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic, DB-backed app — runs as a Node server in Docker on web1.
  output: "standalone",
  images: { unoptimized: true },
  // Ensure sharp's native binaries are traced into the standalone bundle (used by /img WebP transcode).
  outputFileTracingIncludes: {
    "/img": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
  // "/food" was a duplicate of the homepage directory; consolidate it onto "/".
  async redirects() {
    return [
      { source: "/food", destination: "/", permanent: true },
      // "Locals Only" rebranded to "The Local Passport" — keep the old URL's equity.
      { source: "/locals-only", destination: "/passport", permanent: true },
    ];
  },
};

export default nextConfig;
