import Link from 'next/link';
import { getNewInLeander } from '@/lib/spots';
import SiteFooter from '@/components/SiteFooter';
import Subscribe from '@/components/Subscribe';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'New in Leander',
  description: 'Just opened, coming soon, or recently closed in Leander, Texas. The new spots worth knowing about, tracked by The Leander Local.',
  alternates: { canonical: '/new' },
};

const STATUS: Record<string, { emoji: string; label: string; cls: string }> = {
  now_open: { emoji: '🎉', label: 'Now Open', cls: 'bg-amber text-ink' },
  coming_soon: { emoji: '🔜', label: 'Coming Soon', cls: 'border border-rule text-ink' },
  closed: { emoji: '🪦', label: 'Closed', cls: 'bg-ink text-paper' },
};

export default async function NewPage() {
  const items = await getNewInLeander();
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-5">
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">The Wire · Leander, TX</p>
          <h1 className="font-display font-black text-ink leading-[0.9] tracking-[-0.03em]" style={{ fontSize: 'clamp(2.25rem, 7vw, 5rem)' }}>New in Leander</h1>
          <p className="mt-3 font-ui text-ink-soft max-w-xl">Just opened, coming soon, or gone for good. In a town growing this fast, this is the page locals check.</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="max-w-3xl mx-auto px-5 py-16 text-center">
          <p className="font-hand text-3xl text-oxblood">Nothing new on the wire yet.</p>
          <p className="mt-3 font-ui text-ink-soft">Heard a spot just opened or closed? <Link href="/contact" className="text-chile">Tip us.</Link></p>
        </div>
      ) : (
        <ul className="max-w-3xl mx-auto px-5 py-8 divide-y divide-rule">
          {items.map((it) => {
            const s = STATUS[it.status] || { emoji: '📍', label: it.status, cls: 'border border-rule text-ink' };
            return (
              <li key={it.slug} className="py-5">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`font-stamp uppercase tracking-[0.08em] text-[12px] px-2 py-0.5 ${s.cls}`}>{s.emoji} {s.label}</span>
                  {it.when && <span className="font-ui text-xs text-ink-soft">{new Date(it.when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                </div>
                <Link href={`/r/${it.slug}`} className="font-display font-bold text-2xl text-ink hover:text-oxblood transition-colors">{it.name}</Link>
                <span className="font-ui text-sm text-ink-soft"> · {it.category}</span>
                {it.note && <p className="font-hand text-xl text-oxblood leading-snug mt-1">{it.note}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <div className="max-w-3xl mx-auto px-5 pb-10">
        <Subscribe source="new" siteKey={siteKey}
          headline="Know it opened before the line forms."
          sub="Leander gets a new spot what feels like every other week. Get on the list and you'll hear about the good ones first, while the tables are still easy to get."
          cta="Put me first in line" />
      </div>
      <SiteFooter />
    </main>
  );
}
