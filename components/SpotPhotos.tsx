'use client';

import { useState } from 'react';

export type Shot = { key: string; display: string; big: string; full: string; caption: string | null };

export default function SpotPhotos({ hero, gallery, name }: { hero: Shot | null; gallery: Shot[]; name: string }) {
  const all = [...(hero ? [hero] : []), ...gallery];
  const [idx, setIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const open = idx != null ? all[idx] : null;
  const show = (i: number) => { setIdx(i); setZoom(false); };
  const go = (d: number) => { if (idx == null) return; setZoom(false); setIdx((idx + d + all.length) % all.length); };

  return (
    <>
      {hero && (
        <div className="border-b border-rule bg-paper-sunk">
          <button onClick={() => show(0)} className="block w-full max-w-5xl mx-auto cursor-zoom-in" aria-label="View photo larger">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.display} alt={name} width={1200} height={400} fetchPriority="high" loading="eager" className="block w-full h-[260px] sm:h-[360px] object-cover" />
          </button>
        </div>
      )}
      {gallery.length > 0 && (
        <section className="border-b border-rule">
          <div className="max-w-5xl mx-auto px-5 py-5 flex gap-3 overflow-x-auto no-scrollbar">
            {gallery.map((p, i) => (
              <button key={p.key} onClick={() => show((hero ? 1 : 0) + i)} className="shrink-0 cursor-zoom-in" title={p.caption || ''}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.display} alt={p.caption || name} loading="lazy" className="h-44 w-auto object-cover border border-rule hover:border-ink transition-colors" />
              </button>
            ))}
          </div>
        </section>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-ink/90 flex flex-col" onClick={() => setIdx(null)}>
          <div className="flex justify-between items-center px-4 py-2 text-paper shrink-0">
            <span className="font-stamp uppercase tracking-[0.1em] text-xs">{(idx ?? 0) + 1} / {all.length}{open.caption ? ` · ${open.caption}` : ''}</span>
            <div className="flex items-center gap-4">
              <a href={open.full} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-stamp uppercase tracking-[0.08em] text-xs hover:text-amber">Full ↗</a>
              <button onClick={() => setIdx(null)} aria-label="Close" className="text-2xl leading-none">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 flex items-center justify-center" style={{ touchAction: 'pinch-zoom' }} onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.big} alt={open.caption || name} onClick={() => setZoom((z) => !z)}
              style={{ width: zoom ? '180%' : 'auto', maxWidth: zoom ? 'none' : '100%', maxHeight: zoom ? 'none' : '82vh', cursor: zoom ? 'zoom-out' : 'zoom-in' }}
              className="block transition-[width] duration-200" />
          </div>
          <div className="flex justify-between items-center px-4 pb-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            {all.length > 1 ? <button onClick={() => go(-1)} className="font-stamp uppercase text-sm text-paper hover:text-amber">← Prev</button> : <span />}
            <span className="font-ui text-xs text-paper/60">tap image to zoom · pinch on phone</span>
            {all.length > 1 ? <button onClick={() => go(1)} className="font-stamp uppercase text-sm text-paper hover:text-amber">Next →</button> : <span />}
          </div>
        </div>
      )}
    </>
  );
}
