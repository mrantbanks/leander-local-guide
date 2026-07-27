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

/**
 * One engine, two entry points.
 *
 * Pass `spots` and it behaves exactly as it always has (the homepage already has the list, so
 * handing it over costs nothing). Omit `spots` and it fetches the pool on the first roll — which
 * is what the 404 page needs, since a statically prerendered not-found would otherwise bake in a
 * spot list that goes stale. `tiers` narrows that fetched pool to a set of verdicts.
 */
export default function FeedMe({
  spots,
  tiers,
  label = 'Feed Me',
  stamp = false,
}: {
  spots?: FeedPick[];
  tiers?: string[];
  label?: string;
  stamp?: boolean;
}) {
  const [mood, setMood] = useState<Mood>('any');
  const [pick, setPick] = useState<FeedPick | null>(null);
  const [pool, setPool] = useState<FeedPick[] | null>(spots ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Fetched once per mount, then reused — rolling again should not re-hit the network.
  async function ensurePool(): Promise<FeedPick[]> {
    if (pool) return pool;
    setBusy(true);
    setErr('');
    try {
      const qs = tiers?.length ? `?tiers=${encodeURIComponent(tiers.join(','))}` : '';
      const r = await fetch(`/api/feed${qs}`);
      const got: FeedPick[] = (await r.json())?.spots || [];
      if (!got.length) throw new Error('empty');
      setPool(got);
      return got;
    } catch {
      setErr('Could not reach the kitchen. Try again?');
      return [];
    } finally {
      setBusy(false);
    }
  }

  async function roll(m: Mood = mood) {
    const all = await ensurePool();
    if (!all.length) return;
    let pool = all;
    if (m === 'cheap') pool = all.filter((s) => s.priceTier != null && s.priceTier <= 1);
    if (m === 'fancy') pool = all.filter((s) => s.priceTier != null && s.priceTier >= 3);
    if (m === 'adventure')
      pool = all.filter((s) => !['Restaurant', 'Cafe', 'Bakery'].includes(s.category) || (s.rating ?? 0) >= 4.6);
    if (pool.length === 0) pool = all;
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
          disabled={busy}
          className={`font-stamp uppercase tracking-[0.15em] text-lg bg-chile text-paper px-6 py-2.5 hover:bg-amber hover:text-ink transition-colors disabled:opacity-60 ${
            stamp ? 'border-2 border-amber/70 rounded-[2px] -rotate-2 hover:rotate-0' : ''
          }`}
        >
          {busy ? 'Thinking...' : label}
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
        {err ? (
          <span className="font-ui text-sm text-amber">{err}</span>
        ) : pick ? (
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
