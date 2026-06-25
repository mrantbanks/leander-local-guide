'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { MapPin } from '@/lib/spots';
import { haversineMi } from '@/lib/map';

const LeanderMap = dynamic(() => import('./LeanderMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-paper-sunk flex items-center justify-center"><span className="font-hand text-2xl text-ink-soft">Unfolding the map...</span></div>,
});

type Toggle = { key: string; label: string; test: (p: MapPin) => boolean };
const TOGGLES: Toggle[] = [
  { key: 'happy', label: 'Happy Hour', test: (p) => p.happyHour },
  { key: 'late', label: 'Open Late', test: (p) => p.openLate },
  { key: 'gem', label: 'Hidden Gems', test: (p) => p.hiddenGem },
  { key: 'truck', label: 'Food Trucks', test: (p) => p.cat === 'Food Truck' },
];

export default function MapView({ pins, initialSpot }: { pins: MapPin[]; initialSpot?: string | null }) {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [cuisine, setCuisine] = useState('');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<'idle' | 'pending' | 'denied'>('idle');
  const [addr, setAddr] = useState('');

  const cuisines = useMemo(() => [...new Set(pins.flatMap((p) => p.cuisines))].filter(Boolean).sort(), [pins]);

  const filtered = useMemo(() => {
    let r = pins.filter((p) => [...active].every((k) => TOGGLES.find((t) => t.key === k)!.test(p)) && (!cuisine || p.cuisines.includes(cuisine)));
    if (userLoc) r = [...r].sort((a, b) => haversineMi(userLoc, a) - haversineMi(userLoc, b));
    return r;
  }, [pins, active, cuisine, userLoc]);

  function toggle(k: string) { setActive((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; }); }
  function locate() {
    if (!navigator.geolocation) { setGeo('denied'); return; }
    setGeo('pending');
    navigator.geolocation.getCurrentPosition(
      (p) => { setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeo('idle'); },
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
      if (j.lat) setUserLoc({ lat: j.lat, lng: j.lng });
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="border-b border-rule bg-paper px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        {TOGGLES.map((t) => (
          <button key={t.key} onClick={() => toggle(t.key)} className={`shrink-0 font-stamp uppercase tracking-[0.06em] text-xs px-3 py-1.5 border rounded-sm transition-colors ${active.has(t.key) ? 'bg-chile text-paper border-chile' : 'border-rule text-ink-soft hover:text-ink'}`}>{t.label}</button>
        ))}
        <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="shrink-0 font-ui text-xs bg-paper-raised border border-rule px-2 py-1.5 text-ink outline-none rounded-sm">
          <option value="">All cuisines</option>
          {cuisines.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={locate} className="shrink-0 font-stamp uppercase tracking-[0.06em] text-xs px-3 py-1.5 border border-ink text-ink hover:bg-ink hover:text-paper rounded-sm">📍 {geo === 'pending' ? '...' : 'Near me'}</button>
        <span className="shrink-0 font-ui text-xs text-ink-soft ml-auto pl-2 whitespace-nowrap">{filtered.length} spots</span>
      </div>

      {geo === 'denied' && !userLoc && (
        <form onSubmit={geocode} className="border-b border-rule bg-paper-raised px-3 py-2 flex gap-2 shrink-0">
          <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Type your address or ZIP to drop a 'you are here' pin" className="flex-1 bg-paper border border-rule px-3 py-1.5 text-[16px] sm:text-sm text-ink outline-none" />
          <button className="shrink-0 font-stamp uppercase tracking-[0.08em] text-xs bg-chile text-paper px-3">Locate</button>
        </form>
      )}

      <div className="relative flex-1 min-h-0">
        <LeanderMap pins={filtered} userLoc={userLoc} openSlug={initialSpot} />
        {userLoc && <div className="absolute bottom-2 left-2 z-10 bg-paper/90 border border-rule px-2 py-1 font-ui text-[10px] text-ink-soft rounded-sm">Sorted by nearest · your location stays in your browser</div>}
      </div>
    </div>
  );
}
