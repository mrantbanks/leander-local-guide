import Link from 'next/link';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { staticPages } from '@/lib/seo-inspect';
import SeoPicker, { type PickRow } from '@/components/SeoPicker';
import SerpPreview from '@/components/SerpPreview';

export const dynamic = 'force-dynamic';

const crumb = (p: string) => `leanderlocalguide.com${p === '/' ? '' : ' › ' + p.replace(/^\//, '').split('/').join(' › ')}`;

export default async function AdminSeoHome() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const { rows } = await pool.query(`
    select slug, name, primary_category cat, editorial->>'verdict' verdict, hidden,
           (menu is not null and jsonb_array_length(coalesce(menu->'sections','[]'::jsonb)) > 0) as has_menu
      from restaurants where archived_at is null order by name`);
  const spots: PickRow[] = rows.map((r) => ({ slug: r.slug, name: r.name, cat: r.cat, verdict: r.verdict, hidden: r.hidden, hasMenu: r.has_menu }));
  const statics = staticPages();

  return (
    <main className="px-5 py-6 max-w-4xl">
      <h1 className="font-display font-black text-2xl text-ink mb-1">SEO Desk</h1>
      <p className="font-ui text-base text-ink-soft mb-6 max-w-2xl leading-relaxed">See exactly what Google sees for any page, preview the search result a visitor gets, and edit the title and description. Pick a restaurant to inspect its main page and menu page.</p>

      <section className="mb-10">
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-chile mb-3">Restaurants</h2>
        <SeoPicker spots={spots} />
      </section>

      <section>
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-chile mb-1">Other pages</h2>
        <p className="font-ui text-sm text-ink-soft mb-3">Read-only previews of the site&apos;s non-restaurant pages. Their titles live in the page code; edit them there.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {statics.map((p) => (
            <div key={p.key} className="border border-rule rounded-[2px] p-3 bg-paper-raised">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-stamp uppercase tracking-[0.08em] text-xs text-ink">{p.label}</span>
                <div className="flex items-center gap-2">
                  <a href={`https://leanderlocalguide.com${p.path}`} target="_blank" rel="noreferrer" className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-chile">Live ↗</a>
                  <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent('https://leanderlocalguide.com' + p.path)}`} target="_blank" rel="noreferrer" className="font-stamp uppercase tracking-[0.06em] text-xs text-chile hover:text-oxblood">Test ↗</a>
                </div>
              </div>
              <SerpPreview device="desktop" siteName="The Leander Local Guide" breadcrumb={crumb(p.path)} title={p.title} description={p.description} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
