import type { MetadataRoute } from 'next';
// import { pool } from '@/lib/db';
// import { BOARDS } from '@/lib/boards';

export const dynamic = 'force-dynamic';

// SLOW ROLL (new domain, set 2026-06-24): intentionally expose ONLY the homepage and the
// about page in the sitemap for ~2 months (through ~2026-08-24) to drip-feed indexation
// rather than dumping ~196 URLs on a day-old domain. Expand gradually after that
// (statics -> /best boards -> /r spots). The full generator is preserved below — restore it
// (and the two imports above) to go full.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://leanderlocalguide.com';
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/about`, changeFrequency: 'weekly', priority: 0.8 },
  ];
}

// --- FULL SITEMAP (re-enable after the slow-roll window) ---
// export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
//   const base = 'https://leanderlocalguide.com';
//   const { rows } = await pool.query('select slug, updated_at from restaurants');
//   const spots: MetadataRoute.Sitemap = rows.map((r) => ({
//     url: `${base}/r/${r.slug}`, lastModified: r.updated_at || new Date(), changeFrequency: 'weekly', priority: 0.7,
//   }));
//   const boards: MetadataRoute.Sitemap = BOARDS.map((b) => ({ url: `${base}/best/${b.slug}`, changeFrequency: 'weekly', priority: 0.6 }));
//   const statics: MetadataRoute.Sitemap = ['', '/best', '/food', '/hidden-gems', '/about'].map((p) => ({
//     url: `${base}${p}`, changeFrequency: p === '' ? 'daily' : 'weekly', priority: p === '' ? 1 : 0.5,
//   }));
//   return [...statics, ...boards, ...spots];
// }
