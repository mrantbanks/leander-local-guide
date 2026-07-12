import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllSpots } from '@/lib/spots';
import { getBoard, rankScore } from '@/lib/boards';
import VerdictStamp from '@/components/VerdictStamp';
import SiteFooter from '@/components/SiteFooter';
import Icon from '@/components/Icon';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }): Promise<Metadata> {
  const { board } = await params;
  const b = getBoard(board);
  if (!b) return { title: 'Not found' };
  return {
    title: b.title,
    description: `${b.blurb} Ranked by The Leander Local Guide, weighted by what locals love.`,
    alternates: { canonical: `/best/${board}` },
    openGraph: { title: `${b.title} · The Leander Local Guide`, description: b.blurb, type: 'article' },
  };
}

export default async function BoardPage({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params;
  const b = getBoard(board);
  if (!b) notFound();
  const all = await getAllSpots();
  const ranked = all.filter(b.match).sort((x, y) => rankScore(y) - rankScore(x)).slice(0, 20);
  const answer = ranked.length
    ? `${b.title} (Leander, TX), ranked: ${ranked.slice(0, 5).map((s, i) => `${i + 1}. ${s.name}`).join('; ')}. Picked by Anthony Martinez, The Leander Local.`
    : '';
  const itemListLd = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: `${b.title} — Leander, TX`, description: b.blurb,
    url: `https://leanderlocalguide.com/best/${board}`,
    mainEntityOfPage: `https://leanderlocalguide.com/best/${board}`,
    numberOfItems: ranked.length,
    itemListElement: ranked.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: `https://leanderlocalguide.com/r/${s.slug}` })),
  };
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://leanderlocalguide.com/' },
      { '@type': 'ListItem', position: 2, name: 'Best of Leander', item: 'https://leanderlocalguide.com/best' },
      { '@type': 'ListItem', position: 3, name: b.title, item: `https://leanderlocalguide.com/best/${board}` },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />
      <header className="border-b-2 border-ink">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-5">
          <Link href="/best" className="inline-flex items-center gap-1 font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile transition-colors mb-4">← All rankings</Link>
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">Power Rankings · Leander, TX</p>
          <h1 className="font-display font-black text-ink leading-[0.92] tracking-[-0.02em] flex items-center gap-3" style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}>
            <Icon name={b.slug} fallback={b.emoji} className="w-[0.85em] h-[0.85em] shrink-0 text-chile" />
            <span>{b.title}</span>
          </h1>
          <p className="mt-3 font-ui text-ink-soft max-w-xl">{b.blurb}</p>
          {answer && <p className="mt-2 font-ui text-sm text-ink max-w-2xl">{answer}</p>}
        </div>
      </header>
      <ol className="max-w-4xl mx-auto px-5 py-8 divide-y divide-rule">
        {ranked.map((s, i) => (
          <li key={s.id} className="py-4 flex items-center gap-4">
            <span className="font-display font-black text-3xl text-chile w-10 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <Link href={`/r/${s.slug}`} className="font-display font-bold text-xl text-ink hover:text-oxblood transition-colors">{s.name}</Link>
              {s.hook && <p className="font-hand text-lg text-oxblood leading-snug line-clamp-1">“{s.hook}”</p>}
              <p className="font-ui text-xs text-ink-soft">{[s.category, ...s.cuisines.slice(0, 2), s.ratingGoogle ? `${s.ratingGoogle}★` : null, s.beenHere > 0 ? `${s.beenHere} been here` : null].filter(Boolean).join(' · ')}</p>
            </div>
            <VerdictStamp rating={s.ratingGoogle} label={s.verdict} className="shrink-0 hidden sm:inline-block text-sm" />
          </li>
        ))}
        {ranked.length === 0 && <li className="py-8 font-hand text-2xl text-oxblood">Nothing ranked here yet.</li>}
      </ol>
      <SiteFooter />
    </main>
  );
}
