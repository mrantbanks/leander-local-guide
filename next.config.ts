import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — emits a fully static site to ./out that Apache (cPanel) can
  // serve directly with no Node runtime. See AGENTS.md: Next 16 specifics.
  output: "export",
  // Emit each route as <route>/index.html so Apache serves clean URLs
  // (/events/ -> out/events/index.html) without rewrite rules.
  trailingSlash: true,
  // No next/image in use; keep this so any future <Image> won't break export.
  images: { unoptimized: true },
};

export default nextConfig;
