import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    // /ticket/ is disallowed for EVERY crawler, and that is an attribution fix, not an SEO one.
    // The page already carries robots noindex in its metadata, but a crawler has to RENDER the page
    // to discover that, and rendering it mounts <StampPull>, which logs a Passport stamp pull.
    // Googlebot executes JavaScript and does not keep cookies between page loads, so each render
    // minted a fresh llg_anon and logged a phantom "distinct local pulled a stamp". That is exactly
    // the number the guide's sales pitch rests on, so a crawler must never reach the page at all.
    //
    // The AI-crawler rule previously omitted /api/ entirely, which re-permitted every route handler
    // to the very bots we invite in. Both lists now agree.
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/contribute/', '/uploads/', '/ticket/'] },
      // Explicitly welcome AI-search crawlers (we want AI Overviews / ChatGPT / Perplexity to cite us)
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'],
        allow: '/',
        disallow: ['/admin', '/api/', '/contribute/', '/ticket/'],
      },
    ],
    sitemap: 'https://leanderlocalguide.com/sitemap.xml',
    host: 'leanderlocalguide.com',
  };
}
