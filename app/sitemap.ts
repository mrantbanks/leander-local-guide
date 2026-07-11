import type { MetadataRoute } from 'next';
import { pool } from '@/lib/db';
import { BOARDS } from '@/lib/boards';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://leanderlocalguide.com';
  // hidden spots 404 on the public site, so they don't belong in the sitemap.
  //
  // lastModified is the greatest of everything that actually changes the page, not just
  // restaurants.updated_at. A reader's review or photo changes what we render (and, for a review,
  // the aggregateRating we hand Google) without touching the editorial timestamp, so keying the
  // sitemap off updated_at alone told Google "nothing here has changed" and left it uncrawled.
  // GREATEST ignores NULLs in Postgres, so a spot with no contributions just falls back to
  // updated_at.
  const { rows } = await pool.query(`
    select r.slug,
           greatest(
             r.updated_at,
             (select max(p.created_at) from photos  p  where p.place_id  = r.id and p.status = 'approved'),
             (select max(rv.created_at) from reviews rv where rv.place_id = r.id and rv.status = 'approved'),
             (select max(t.created_at)  from tips    t  where t.place_id  = r.id and t.status = 'approved')
           ) as last_mod,
           (r.menu is not null and jsonb_array_length(coalesce(r.menu->'sections','[]'::jsonb)) > 0) as has_menu
      from restaurants r
     where not r.hidden`);
  const spots: MetadataRoute.Sitemap = rows.map((r) => ({
    url: `${base}/r/${r.slug}`, lastModified: r.last_mod || new Date(), changeFrequency: 'weekly', priority: 0.7,
  }));
  const menus: MetadataRoute.Sitemap = rows.filter((r) => r.has_menu).map((r) => ({
    url: `${base}/r/${r.slug}/menu`, lastModified: r.last_mod || new Date(), changeFrequency: 'monthly', priority: 0.65,
  }));
  const boards: MetadataRoute.Sitemap = BOARDS.map((b) => ({ url: `${base}/best/${b.slug}`, changeFrequency: 'weekly', priority: 0.6 }));
  const statics: MetadataRoute.Sitemap = ['', '/map', '/passport', '/best', '/whats-on', '/new', '/hidden-gems', '/about', '/subscribe'].map((p) => ({
    url: `${base}${p}`, changeFrequency: p === '' ? 'daily' : 'weekly', priority: p === '' ? 1 : 0.5,
  }));
  return [...statics, ...boards, ...spots, ...menus];
}
