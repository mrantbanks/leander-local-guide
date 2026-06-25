import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

function decode(s: string): string {
  return (s || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#x2F;/g, '/').replace(/&[a-z]+;/g, '').trim();
}

// Lightweight restaurant search by name, category, or cuisine. ~177 spots, so a
// simple ILIKE is plenty. Name matches rank first, then prefix matches, then the rest.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim().replace(/[%_]/g, '');
  if (q.length < 2) return NextResponse.json({ results: [] });
  const like = `%${q}%`;
  const prefix = `${q}%`;
  const { rows } = await pool.query(
    `select slug, name, primary_category cat
     from restaurants
     where name ilike $1 or primary_category ilike $1 or array_to_string(coalesce(cuisines,'{}'),' ') ilike $1
     order by (name ilike $2) desc, (name ilike $3) desc, name
     limit 8`,
    [like, prefix, like]
  );
  return NextResponse.json({ results: rows.map((r) => ({ slug: r.slug, name: decode(r.name), cat: r.cat })) });
}
