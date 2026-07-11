'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { MapPin } from '@/lib/spots';
import { haversineMi } from '@/lib/map';
import { evalHours, isOpenNow, centralNowAbs } from '@/lib/hours';

const LeanderMap = dynamic(() => import('./LeanderMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-paper-sunk flex items-center justify-center"><span className="font-hand text-2xl text-ink-soft">Unfolding the map...</span></div>,
});

type Tog = { key: string; label: string; test: (p: MapPin, now: number) => boolean };
const QUICK: Tog[] = [
  { key: 'openNow', label: 'Open Now', test: (p, now) => isOpenNow(evalHours(p.periods, p.open24, now).state) },
  { key: 'openLate', label: 'Open Late', test: (p) => p.openLate },
  { key: 'happy', label: 'Happy Hour', test: (p) => p.happyHour },
  { key: 'gem', label: 'Hidden Gems', test: (p) => p.hiddenGem },
];
const MORE: Tog[] = [
  { key: 'visited', label: "Anthony's Been", test: (p) => p.visited },
  { key: 'patio', label: 'Patio', test: (p) => p.patio },
  { key: 'dog', label: 'Dog-Friendly', test: (p) => p.dog },
  { key: 'truck', label: 'Food Trucks', test: (p) => p.cat === 'Food Truck' },
  { key: 'rating45', label: '4.5★ +', test: (p) => (p.rating ?? 0) >= 4.5 },
];
const ALL = [...QUICK, ...MORE];

export default function MapView({ pins, initialSpot }: { pins: MapPin[]; initialSpot?: string | null }) {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [cuisine, setCuisine] = useState('');
  const [price, setPrice] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<'near' | 'rated' | 'gem'>('rated');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<'idle' | 'pending' | 'denied'>('idle');
  const [addr, setAddr] = useState('');
  const [sheet, setSheet] = useState(false);
  const [nowAbs, setNowAbs] = useState(() => centralNowAbs());

  useEffect(() => { const id = setInterval(() => setNowAbs(centralNowAbs()), 60000); return () => clearInterval(id); }, []);

  const cuisines = useMemo(() => [...new Set(pins.flatMap((p) => p.cuisines))].filter(Boolean).sort(), [pins]);

  const filtered = useMemo(() => {
    let r = pins.filter((p) =>
      [...active].every((k) => ALL.find((t) => t.key === k)!.test(p, nowAbs))
      && (!cuisine || p.cuisines.includes(cuisine))
      && (price.size === 0 || (p.priceTier != null && price.has(p.priceTier)))
    );
    if (sort === 'near' && userLoc) r = [...r].sort((a, b) => haversineMi(userLoc, a) - haversineMi(userLoc, b));
    else if (sort === 'gem') r = [...r].sort((a, b) => Number(b.hiddenGem) - Number(a.hiddenGem) || (b.rating ?? 0) - (a.rating ?? 0));
    else r = [...r].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return r;
  }, [pins, active, cuisine, price, sort, userLoc, nowAbs]);

  function toggle(k: string) { setActive((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; }); }
  function togglePrice(n: number) { setPrice((s) => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x; }); }
  function clearAll() { setActive(new Set()); setCuisine(''); setPrice(new Set()); }
  const moreCount = MORE.filter((t) => active.has(t.key)).length + (cuisine ? 1 : 0) + (price.size ? 1 : 0);
  // surface the detail that matches the active filter inside each popup
  const emphasis: 'happy' | 'hours' | null = active.has('happy') ? 'happy' : (active.has('openLate') || active.has('openNow')) ? 'hours' : null;

  function locate() {
    if (!navigator.geolocation) { setGeo('denied'); return; }
    setGeo('pending');
    navigator.geolocation.getCurrentPosition(
      (p) => { setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setSort('near'); setGeo('idle'); },
      () => setGeo('denied'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }
  async function geocode(e: React.FormEvent) {
    e.preventDefault();
    if (addr.trim().length < 3) return;
    try {
      const r = await fetch('/api/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr }) });
      const j = await r.json();
      if (j.lat) { setUserLoc({ lat: j.lat, lng: j.lng }); setSort('near'); }
    } catch { /* ignore */ }
  }

  const chip = (t: Tog) => (
    <button key={t.key} onClick={() => toggle(t.key)} className={`shrink-0 font-stamp uppercase tracking-[0.06em] text-xs px-3 py-1.5 border rounded-sm transition-colors ${active.has(t.key) ? 'bg-chile text-paper border-chile' : 'border-rule text-ink-soft hover:text-ink'}`}>{t.label}</button>
  );

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>
      {/* front row */}
      <div className="border-b border-rule bg-paper px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        {QUICK.map(chip)}
        <button onClick={() => setSheet((s) => !s)} className={`shrink-0 font-stamp uppercase tracking-[0.06em] text-xs px-3 py-1.5 border rounded-sm ${sheet || moreCount ? 'border-ink text-ink' : 'border-rule text-ink-soft hover:text-ink'}`}>Filters{moreCount ? ` · ${moreCount}` : ''}</button>
        <button onClick={locate} className="shrink-0 font-stamp uppercase tracking-[0.06em] text-xs px-3 py-1.5 border border-ink text-ink hover:bg-ink hover:text-paper rounded-sm">📍 {geo === 'pending' ? '...' : 'Near me'}</button>
        <span className="shrink-0 font-ui text-xs text-ink-soft ml-auto pl-2 whitespace-nowrap">{filtered.length} spots</span>
      </div>

      {/* expanded filter sheet */}
      {sheet && (
        <div className="border-b border-rule bg-paper-raised px-3 py-3 shrink-0 max-h-[55vh] overflow-y-auto">
          <div className="flex flex-wrap gap-2 mb-3">{MORE.map(chip)}</div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="font-ui text-xs text-ink-soft">Cuisine
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="ml-2 bg-paper border border-rule px-2 py-1 text-ink text-sm outline-none rounded-sm">
                <option value="">Any</option>{cuisines.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <span className="font-ui text-xs text-ink-soft mr-1">Price</span>
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => togglePrice(n)} className={`font-ui text-sm px-2 py-1 border rounded-sm ${price.has(n) ? 'bg-chile text-paper border-chile' : 'border-rule text-ink-soft hover:text-ink'}`}>{'$'.repeat(n)}</button>
              ))}
            </div>
            <label className="font-ui text-xs text-ink-soft">Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as 'near' | 'rated' | 'gem')} className="ml-2 bg-paper border border-rule px-2 py-1 text-ink text-sm outline-none rounded-sm">
                <option value="rated">Top-rated</option>
                <option value="near" disabled={!userLoc}>Nearest{userLoc ? '' : ' (tap Near me)'}</option>
                <option value="gem">Hidden gems first</option>
              </select>
            </label>
            {moreCount + active.size > 0 && <button onClick={clearAll} className="font-stamp uppercase tracking-[0.08em] text-xs text-chile hover:text-oxblood ml-auto">Clear all</button>}
          </div>
        </div>
      )}

      {geo === 'denied' && !userLoc && (
        <form onSubmit={geocode} className="border-b border-rule bg-paper-raised px-3 py-2 flex gap-2 shrink-0">
          <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Type your address or ZIP to drop a 'you are here' pin" className="flex-1 bg-paper border border-rule px-3 py-1.5 text-[16px] sm:text-sm text-ink outline-none" />
          <button className="shrink-0 font-stamp uppercase tracking-[0.08em] text-xs bg-chile text-paper px-3">Locate</button>
        </form>
      )}

      {/* map */}
      <div className="relative flex-1 min-h-0">
        <LeanderMap pins={filtered} userLoc={userLoc} openSlug={initialSpot} emphasis={emphasis} />
        {filtered.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pointer-events-none">
            <div className="bg-paper border-2 border-ink p-5 max-w-xs text-center shadow-xl pointer-events-auto">
              <p className="font-hand text-2xl text-oxblood mb-1">No spots match — yet.</p>
              <p className="font-ui text-sm text-ink-soft mb-3">Too many filters stacked up. Loosen one and they come back.</p>
              <button onClick={clearAll} className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-4 py-2">Clear all filters</button>
            </div>
          </div>
        )}
        {userLoc && filtered.length > 0 && <div className="absolute bottom-2 left-2 z-10 bg-paper/90 border border-rule px-2 py-1 font-ui text-sm text-ink-soft rounded-sm">Sorted by nearest · your location stays in your browser</div>}
      </div>
    </div>
  );
}
