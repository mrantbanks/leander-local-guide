import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/contribute/', '/uploads/'] },
      // Explicitly welcome AI-search crawlers (we want AI Overviews / ChatGPT / Perplexity to cite us)
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'],
        allow: '/',
        disallow: ['/admin', '/contribute/'],
      },
    ],
    sitemap: 'https://leanderlocalguide.com/sitemap.xml',
    host: 'leanderlocalguide.com',
  };
}
