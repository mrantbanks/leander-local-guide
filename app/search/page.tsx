import Link from 'next/link';
import { pool } from '@/lib/db';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  return { title: q ? `Search: ${q}` : 'Search Leander food', robots: { index: false } };
}

function decode(s: string): string {
  return (s || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#x2F;/g, '/').replace(/&[a-z]+;/g, '').trim();
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  let rows: { slug: string; name: string; cat: string; hook: string | null }[] = [];
  if (q.length >= 2) {
    const t = q.replace(/[%_]/g, ''); const like = `%${t}%`;
    const r = await pool.query(
      `select slug, name, primary_category cat, editorial->>'hook' hook
       from restaurants
       where name ilike $1 or primary_category ilike $1 or array_to_string(coalesce(cuisines,'{}'),' ') ilike $1
       order by (name ilike $2) desc, name limit 60`,
      [like, `${t}%`]
    );
    rows = r.rows;
  }

  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-5">
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">Search · Leander, TX</p>
          <h1 className="font-display font-black text-ink leading-[0.95] tracking-[-0.02em]" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>{q ? `“${q}”` : 'Search Leander food'}</h1>
          <form action="/search" className="mt-4 flex gap-2">
            <input name="q" defaultValue={q} placeholder="Search a restaurant, a taco, a cuisine..." className="flex-1 bg-paper-raised border border-rule focus:border-chile px-3 py-2.5 text-[16px] text-ink outline-none" />
            <button className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 hover:bg-oxblood">Search</button>
          </form>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-5 py-8">
        {q.length < 2 ? (
          <p className="font-ui text-ink-soft">Type at least two letters to search every spot in Leander.</p>
        ) : rows.length === 0 ? (
          <p className="font-hand text-2xl text-oxblood">Nothing matches &ldquo;{q}&rdquo;. Try a dish or a cuisine instead.</p>
        ) : (
          <>
            <ul className="divide-y divide-rule">
              {rows.map((r) => (
                <li key={r.slug} className="py-4">
                  <Link href={`/r/${r.slug}`} className="font-display font-bold text-xl text-ink hover:text-oxblood transition-colors">{decode(r.name)}</Link>
                  <span className="font-ui text-sm text-ink-soft"> · {r.cat}</span>
                  {r.hook && <p className="font-ui text-sm text-ink-soft mt-0.5">{decode(r.hook)}</p>}
                </li>
              ))}
            </ul>
            <p className="font-ui text-xs text-ink-soft mt-6">{rows.length} result{rows.length !== 1 ? 's' : ''}.</p>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
