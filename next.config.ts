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
   * Split deliberately into two groups, because a Content-Security-Policy that blocks the map or
   * the Turnstile widget is worse than the one it replaces: the site is live, and a broken
   * checkout-equivalent (nobody can leave a review) is a real outage.
   *
   *  - The headers below are ENFORCED. None of them can break rendering: they restrict framing,
   *    base-tag injection, plugins, form targets, and referrer leakage, none of which this site uses
   *    in a way that would trip them.
   *  - The full resource policy is REPORT-ONLY (see cspReportOnly). Load the site with devtools open,
   *    confirm the console is quiet across the map page, a spot page, and a review submission, then
   *    rename the header to 'Content-Security-Policy' to enforce it.
   *
   * Note on script-src: it needs 'unsafe-inline' because Next.js inlines its hydration bootstrap and
   * GA4 inlines its init, and the nonce alternative is incompatible with the ISR caching on /r/[slug]
   * (a cached page would serve a stale nonce to everybody). So this CSP does NOT stop an injected
   * inline script; it stops the script from loading external code, exfiltrating to an arbitrary host,
   * retargeting a form, or reframing the page. The injection itself is fixed at the source, in
   * ldJson() (lib/seo.ts).
   */
  async headers() {
    const connect = [
      "'self'",
      'https://tiles.openfreemap.org',
      'https://challenges.cloudflare.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://region1.google-analytics.com',
    ].join(' ');

    const cspReportOnly = [
      "default-src 'self'",
      // 'unsafe-inline' is load-bearing, see the note above.
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://tiles.openfreemap.org https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self' data:",
      `connect-src ${connect}`,
      // Turnstile renders in an iframe; the "Where" panel embeds a Google map.
      "frame-src https://challenges.cloudflare.com https://www.google.com",
      // maplibre-gl spins its tile workers up from a blob URL.
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
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
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
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
