import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic, DB-backed app — runs as a Node server in Docker on web1.
  output: "standalone",
  images: { unoptimized: true },
  // Ensure sharp's native binaries are traced into the standalone bundle (used by /img WebP transcode).
  outputFileTracingIncludes: {
    "/img": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
  /**
   * Security headers.
   *
   * The resource policy is ENFORCED. It shipped Report-Only first, and before flipping it every
   * sub-resource the live pages actually pull was enumerated (script/link/img/iframe/form across
   * the homepage, map, passport, boards, a spot page and the claim page) plus the maplibre style
   * document, which turned up one host nothing in this repo references: Cloudflare injects its
   * analytics beacon from static.cloudflareinsights.com at the edge, so it has to be allowed here
   * or the edge breaks its own script.
   *
   * Anything still missed reports to /api/csp-report rather than failing silently, so a violation
   * shows up in `docker logs llg-web` instead of in somebody's console three weeks later.
   *
   * Note on script-src: it needs 'unsafe-inline' because Next.js inlines its hydration bootstrap and
   * GA4 inlines its init, and the nonce alternative is incompatible with the ISR caching on /r/[slug]
   * (a cached page would serve a stale nonce to everybody). So this CSP does NOT stop an injected
   * inline script; it stops the script from loading external code, exfiltrating to an arbitrary host,
   * retargeting a form, or reframing the page. The injection itself is fixed at the source, in
   * ldJson() (lib/seo.ts).
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' is load-bearing, see the note above.
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://tiles.openfreemap.org https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self' data:",
      // next/font/google self-hosts at build time, so fonts are 'self'. The map's tiles, sprites and
      // glyph ranges are all fetched from tiles.openfreemap.org.
      "connect-src 'self' https://tiles.openfreemap.org https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://static.cloudflareinsights.com https://cloudflareinsights.com",
      // Turnstile renders in an iframe; the "Where" panel embeds a Google map.
      "frame-src https://challenges.cloudflare.com https://www.google.com",
      // maplibre-gl spins its tile workers up from a blob URL.
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'report-uri /api/csp-report',
      'report-to csp-endpoint',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), interest-cohort=()' },
          { key: 'Reporting-Endpoints', value: 'csp-endpoint="/api/csp-report"' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
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
