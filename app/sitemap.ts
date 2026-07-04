import type { MetadataRoute } from 'next';
import { pool } from '@/lib/db';
import { BOARDS } from '@/lib/boards';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://leanderlocalguide.com';
  // hidden spots 404 on the public site, so they don't belong in the sitemap
  const { rows } = await pool.query(
    "select slug, updated_at, (menu is not null and jsonb_array_length(coalesce(menu->'sections','[]'::jsonb)) > 0) has_menu from restaurants where not hidden"
  );
  const spots: MetadataRoute.Sitemap = rows.map((r) => ({
    url: `${base}/r/${r.slug}`, lastModified: r.updated_at || new Date(), changeFrequency: 'weekly', priority: 0.7,
  }));
  const menus: MetadataRoute.Sitemap = rows.filter((r) => r.has_menu).map((r) => ({
    url: `${base}/r/${r.slug}/menu`, lastModified: r.updated_at || new Date(), changeFrequency: 'monthly', priority: 0.65,
  }));
  const boards: MetadataRoute.Sitemap = BOARDS.map((b) => ({ url: `${base}/best/${b.slug}`, changeFrequency: 'weekly', priority: 0.6 }));
  const statics: MetadataRoute.Sitemap = ['', '/map', '/locals-only', '/best', '/whats-on', '/new', '/hidden-gems', '/about', '/subscribe'].map((p) => ({
    url: `${base}${p}`, changeFrequency: p === '' ? 'daily' : 'weekly', priority: p === '' ? 1 : 0.5,
  }));
  return [...statics, ...boards, ...spots, ...menus];
}
