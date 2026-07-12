'use client';

import { useMemo, useState } from 'react';
import SpotCard from '@/components/SpotCard';
import type { CardSpot } from '@/lib/spots';

const TOGGLES: { key: string; label: string; test: (s: CardSpot) => boolean }[] = [
  { key: 'open', label: 'Open Now', test: (s) => s.openNow === true },
  { key: 'hh', label: 'Happy Hour', test: (s) => !!s.happyHour },
  { key: 'truck', label: 'Food Truck', test: (s) => s.category === 'Food Truck' },
  { key: 'local', label: 'Local Owned', test: (s) => s.chainStatus === 'local' },
  { key: 'patio', label: 'Patio', test: (s) => s.amenities.includes('Patio') },
  { key: 'dog', label: 'Dog-Friendly', test: (s) => s.amenities.includes('Dog-Friendly') },
  { key: 'kid', label: 'Kid-Friendly', test: (s) => s.amenities.includes('Kid-Friendly') },
  { key: 'veg', label: 'Veg Options', test: (s) => s.amenities.includes('Veg Options') },
  { key: 'takeout', label: 'Takeout', test: (s) => s.amenities.includes('Takeout') },
  { key: 'brunch', label: 'Brunch', test: (s) => s.amenities.includes('Brunch') },
];

const SORTS: Record<string, (a: CardSpot, b: CardSpot) => number> = {
  featured: () => 0,
  top: (a, b) => (b.ratingGoogle ?? 0) - (a.ratingGoogle ?? 0),
  loved: (a, b) => (b.beenHere + b.worthIt) - (a.beenHere + a.worthIt),
  az: (a, b) => a.name.localeCompare(b.name),
};

export default function FilterableGrid({ spots }: { spots: CardSpot[] }) {
  const [on, setOn] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [price, setPrice] = useState(0);
  const [sort, setSort] = useState('featured');

  const categories = useMemo(() => [...new Set(spots.map((s) => s.category))].sort(), [spots]);
  const cuisines = useMemo(() => [...new Set(spots.flatMap((s) => s.cuisines))].sort(), [spots]);

  const filtered = useMemo(() => {
    let r = spots.filter((s) =>
      [...on].every((k) => TOGGLES.find((t) => t.key === k)!.test(s)) &&
      (!cat || s.category === cat) &&
      (!cuisine || s.cuisines.includes(cuisine)) &&
      (!price || s.priceTier === price)
    );
    if (sort !== 'featured') r = [...r].sort(SORTS[sort]);
    return r;
  }, [spots, on, cat, cuisine, price, sort]);

  const toggle = (k: string) => setOn((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const clear = () => { setOn(new Set()); setCat(''); setCuisine(''); setPrice(0); setSort('featured'); };
  const active = on.size > 0 || cat || cuisine || price || sort !== 'featured';
  const sel = 'bg-paper-raised border border-rule px-2.5 py-1 font-ui text-sm text-ink rounded-[2px]';

  return (
    <div>
      {/* toggles */}
      <div className="flex flex-wrap gap-2">
        {TOGGLES.map((t) => {
          const isOn = on.has(t.key);
          return (
            <button
              key={t.key}
              onClick={() => toggle(t.key)}
              aria-pressed={isOn}
              className={`font-stamp uppercase tracking-[0.07em] text-sm px-3 py-1.5 border-2 rounded-[2px] transition-colors ${
                isOn ? 'bg-chile text-paper border-chile' : 'text-ink border-rule hover:border-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* selects + sort */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={sel}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className={sel}>
          <option value="">All cuisines</option>
          {cuisines.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={price} onChange={(e) => setPrice(Number(e.target.value))} className={sel}>
          <option value={0}>Any price</option>
          {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{'$'.repeat(p)}</option>)}
        </select>
        <span className="font-stamp uppercase tracking-[0.08em] text-sm text-ink-soft ml-1">Sort</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={sel}>
          <option value="featured">Featured</option>
          <option value="top">Top rated</option>
          <option value="loved">Most loved</option>
          <option value="az">A to Z</option>
        </select>
        {active && (
          <button onClick={clear} className="font-stamp uppercase tracking-[0.08em] text-sm text-chile hover:text-oxblood ml-1">Clear</button>
        )}
      </div>

      <p className="mt-4 font-stamp uppercase tracking-[0.1em] text-ink-soft text-sm">{filtered.length} {filtered.length === 1 ? 'spot' : 'spots'}</p>

      {filtered.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">
          {filtered.map((s, i) => <SpotCard key={s.id} spot={s} priority={i < 4} />)}
        </div>
      ) : (
        <p className="mt-8 font-hand text-2xl text-oxblood">Nothing matches that combo. Loosen it up.</p>
      )}
    </div>
  );
}
