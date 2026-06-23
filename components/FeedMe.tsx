'use client';

import { useState } from 'react';
import Link from 'next/link';

export type FeedPick = {
  slug: string;
  name: string;
  category: string;
  hook: string | null;
  rating: number | null;
  priceTier: number | null;
};

type Mood = 'any' | 'cheap' | 'fancy' | 'adventure';

export default function FeedMe({ spots }: { spots: FeedPick[] }) {
  const [mood, setMood] = useState<Mood>('any');
  const [pick, setPick] = useState<FeedPick | null>(null);

  function roll(m: Mood = mood) {
    let pool = spots;
    if (m === 'cheap') pool = spots.filter((s) => s.priceTier != null && s.priceTier <= 1);
    if (m === 'fancy') pool = spots.filter((s) => s.priceTier != null && s.priceTier >= 3);
    if (m === 'adventure')
      pool = spots.filter((s) => !['Restaurant', 'Cafe', 'Bakery'].includes(s.category) || (s.rating ?? 0) >= 4.6);
    if (pool.length === 0) pool = spots;
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (next && pick && next.slug === pick.slug && pool.length > 1) next = pool[(pool.indexOf(next) + 1) % pool.length];
    setPick(next);
  }

  const moods: Mood[] = ['any', 'cheap', 'fancy', 'adventure'];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => roll()}
          className="font-stamp uppercase tracking-[0.15em] text-lg bg-chile text-paper px-6 py-2.5 hover:bg-amber hover:text-ink transition-colors"
        >
          🍴 Feed Me
        </button>
        <div className="flex gap-1.5">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => { setMood(m); roll(m); }}
              aria-pressed={mood === m}
              className={`font-stamp uppercase tracking-[0.08em] text-xs px-3 py-1.5 border-2 rounded-[2px] transition-colors ${
                mood === m ? 'bg-paper text-ink border-paper' : 'text-paper/70 border-paper/40 hover:border-paper'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="mt-5 min-h-[2.5rem]">
        {pick ? (
          <Link href={`/r/${pick.slug}`} className="group inline-flex flex-col">
            <span className="font-display font-black text-2xl text-amber group-hover:underline decoration-2 underline-offset-4">
              → {pick.name}
            </span>
            {pick.hook && <span className="font-hand text-lg text-paper/80 mt-1">“{pick.hook}”</span>}
            <span className="font-ui text-xs text-paper/50 mt-1">{pick.category}{pick.rating ? ` · ${pick.rating}★ Google` : ''} · tap to open</span>
          </Link>
        ) : (
          <span className="font-ui text-sm text-paper/50">Can&apos;t decide? Hit the button. I&apos;ll pick.</span>
        )}
      </div>
    </div>
  );
}
