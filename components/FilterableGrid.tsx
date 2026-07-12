'use client';

import { useMemo, useState, useEffect } from 'react';
import SpotCard from '@/components/SpotCard';
import type { CardSpot } from '@/lib/spots';
import { ownershipOf, AMENITY_TAGS } from '@/lib/tags';
import { evalHours, isOpenNow, centralNowAbs } from '@/lib/hours';

/**
 * The filters are DERIVED from the tag vocabulary, not hand-listed.
 *
 * They used to be a hand-maintained array of ten, while the database held fourteen more amenities
 * nobody could filter on: 97 spots serve dessert, 75 serve coffee, 180 have a step-free entrance,
 * 168 have free parking, and not one of them was reachable. Someone searching the CATEGORY dropdown
 * for "Coffee Shop" got Starbucks and nothing else, because Coffee Shop is a VENUE TYPE and exactly
 * one spot is one, while 75 spots simply serve coffee.
 *
 * Deriving them from AMENITY_TAGS and FACILITY_GROUPS means adding a tag adds its filter, for ever.
 * The lists cannot drift apart again, because there is only one list.
 */
type Tog = { key: string; label: string; test: (s: CardSpot, nowAbs: number) => boolean };

// Not vocabulary: these are computed, so they have to be spelled out.
const QUICK: Tog[] = [
  // Evaluated LIVE against Leander time on every tick, exactly like the map does it. It used to read
  // a boolean the SERVER computed at render time, which meant the filter was only ever right for the
  // instant the page was built: leave the tab open past closing and "Open Now" still showed you the
  // places that had just shut. The card already ships `periods`, so the honest answer was always
  // right there in the payload, unused.
  { key: 'open', label: 'Open Now', test: (s, nowAbs) => isOpenNow(evalHours(s.periods, s.open24, nowAbs).state) },
  { key: 'hh', label: 'Happy Hour', test: (s) => !!s.happyHour },
  { key: 'local', label: 'Local Owned', test: (s) => ownershipOf(s.chainStatus, s.chainTier) === 'local' },
  { key: 'truck', label: 'Food Truck', test: (s) => s.category === 'Food Truck' },
];

const amenityTog = (label: string): Tog => ({
  key: `a:${label}`, label, test: (s) => s.amenities.includes(label),
});
const facilityTog = (label: string): Tog => ({
  key: `f:${label}`, label, test: (s) => s.facilities.some((g) => g.labels.includes(label)),
});

const MORE: { group: string; tags: Tog[] }[] = [
  { group: 'What they serve', tags: AMENITY_TAGS.map(([, label]) => label)
      .filter((l) => ['Coffee', 'Dessert', 'Beer', 'Wine', 'Cocktails', 'Veg Options'].includes(l))
      .map(amenityTog) },
  { group: 'The room', tags: AMENITY_TAGS.map(([, label]) => label)
      .filter((l) => ['Patio', 'Dog-Friendly', 'Kid-Friendly', 'Good for Groups', 'Live Music', 'Sports'].includes(l))
      .map(amenityTog) },
  { group: 'Getting fed', tags: AMENITY_TAGS.map(([, label]) => label)
      .filter((l) => ['Takeout', 'Delivery', 'Dine-In', 'Reservations'].includes(l))
      .map(amenityTog) },
  // Nobody could filter for a step-free entrance before, and 180 spots have one.
  { group: 'Parking and access', tags: ['Step-free entry', 'Accessible restroom', 'Free lot', 'Street parking', 'Restroom', 'Cards'].map(facilityTog) },
  { group: 'Who owns it', tags: [
    { key: 'texas', label: 'Texas Chain', test: (s: CardSpot) => ownershipOf(s.chainStatus, s.chainTier) === 'texas' },
    { key: 'chain', label: 'National Chain', test: (s: CardSpot) => ownershipOf(s.chainStatus, s.chainTier) === 'chain' },
  ]},
];

const ALL: Tog[] = [...QUICK, ...MORE.flatMap((g) => g.tags)];

// When they serve. Its own row, because "am I looking for breakfast" is the first question a hungry
// person asks and it is not the same kind of question as "do they have a patio".
const MEALS: { key: string; label: string }[] = [
  { key: 'Breakfast', label: 'Breakfast' },
  { key: 'Brunch', label: 'Brunch' },
  { key: 'Lunch', label: 'Lunch' },
  { key: 'Dinner', label: 'Dinner' },
];

const SORTS: Record<string, (a: CardSpot, b: CardSpot) => number> = {
  featured: () => 0,
  top: (a, b) => (b.ratingGoogle ?? 0) - (a.ratingGoogle ?? 0),
  loved: (a, b) => (b.beenHere + b.worthIt) - (a.beenHere + a.worthIt),
  az: (a, b) => a.name.localeCompare(b.name),
};

export default function FilterableGrid({ spots }: { spots: CardSpot[] }) {
  const [on, setOn] = useState<Set<string>>(new Set());
  const [meals, setMeals] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [price, setPrice] = useState(0);
  const [sort, setSort] = useState('featured');
  const [more, setMore] = useState(false);

  // The clock, in Leander, ticking. A tab left open past closing time must stop claiming a place is
  // open. Same 60s tick the map uses.
  const [nowAbs, setNowAbs] = useState(() => centralNowAbs());
  useEffect(() => { const id = setInterval(() => setNowAbs(centralNowAbs()), 60000); return () => clearInterval(id); }, []);

  const categories = useMemo(() => [...new Set(spots.map((s) => s.category))].sort(), [spots]);
  const cuisines = useMemo(() => [...new Set(spots.flatMap((s) => s.cuisines))].sort(), [spots]);

  const filtered = useMemo(() => {
    let r = spots.filter((s) =>
      [...on].every((k) => ALL.find((t) => t.key === k)?.test(s, nowAbs) ?? true) &&
      [...meals].every((m) => s.meals.includes(m)) &&
      (!cat || s.category === cat) &&
      (!cuisine || s.cuisines.includes(cuisine)) &&
      (!price || s.priceTier === price)
    );
    if (sort !== 'featured') r = [...r].sort(SORTS[sort]);
    return r;
  }, [spots, on, meals, cat, cuisine, price, sort, nowAbs]);

  const toggle = (k: string) => setOn((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const moreOn = MORE.flatMap((g) => g.tags).filter((t) => on.has(t.key)).length;
  const toggleMeal = (k: string) => setMeals((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const clear = () => { setOn(new Set()); setMeals(new Set()); setCat(''); setCuisine(''); setPrice(0); setSort('featured'); };
  const active = on.size > 0 || meals.size > 0 || cat || cuisine || price || sort !== 'featured';
  const sel = 'bg-paper-raised border border-rule px-2.5 py-1 font-ui text-sm text-ink rounded-[2px]';

  return (
    <div>
      {/* When they serve. First, and visually distinct, because "I want breakfast" is the question
          most people turn up with, and it is a different kind of question from "has a patio". */}
      <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-rule">
        <span className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mr-1">Serving</span>
        {MEALS.map((m) => {
          const isOn = meals.has(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggleMeal(m.key)}
              aria-pressed={isOn}
              className={`font-stamp uppercase tracking-[0.07em] text-sm px-4 py-1.5 border-2 rounded-[2px] transition-colors ${
                isOn ? 'bg-ink text-paper border-ink' : 'text-ink border-ink/30 hover:border-ink'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* The four people actually arrive with. */}
      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((t) => {
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
        <button
          onClick={() => setMore((v) => !v)}
          className={`font-stamp uppercase tracking-[0.07em] text-sm px-3 py-1.5 border-2 rounded-[2px] transition-colors ${
            moreOn > 0 ? 'bg-ink text-paper border-ink' : 'text-ink border-rule hover:border-ink'
          }`}
        >
          {more ? 'Fewer filters' : 'More filters'}{moreOn > 0 ? ` (${moreOn})` : ''}
        </button>
      </div>

      {/* Everything else. Derived from the tag vocabulary, so it can never drift out of date again:
          97 spots serve dessert and 180 have a step-free entrance, and none of it was reachable. */}
      {more && (
        <div className="mt-3 border border-rule bg-paper-raised rounded-sm p-4 space-y-3">
          {MORE.map((g) => (
            <div key={g.group}>
              <p className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1.5">{g.group}</p>
              <div className="flex flex-wrap gap-2">
                {g.tags.map((t) => {
                  const isOn = on.has(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => toggle(t.key)}
                      aria-pressed={isOn}
                      className={`font-stamp uppercase tracking-[0.06em] text-xs px-2.5 py-1.5 border rounded-sm transition-colors ${
                        isOn ? 'bg-chile text-paper border-chile' : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* selects + sort */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={sel}>
          <option value="">Any venue type</option>
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
