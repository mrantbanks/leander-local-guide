import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllSpots } from '@/lib/spots';
import { getBoard, rankScore } from '@/lib/boards';
import VerdictStamp from '@/components/VerdictStamp';
import SiteFooter from '@/components/SiteFooter';
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

  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-5">
          <Link href="/best" className="inline-flex items-center gap-1 font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile transition-colors mb-4">← All rankings</Link>
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">Power Rankings · Leander, TX</p>
          <h1 className="font-display font-black text-ink leading-[0.92] tracking-[-0.02em]" style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}>
            {b.emoji} {b.title}
          </h1>
          <p className="mt-3 font-ui text-ink-soft max-w-xl">{b.blurb}</p>
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
            <VerdictStamp rating={s.ratingGoogle} label={s.verdict} className="shrink-0 hidden sm:inline-block text-[13px]" />
          </li>
        ))}
        {ranked.length === 0 && <li className="py-8 font-hand text-2xl text-oxblood">Nothing ranked here yet.</li>}
      </ol>
      <SiteFooter />
    </main>
  );
}
