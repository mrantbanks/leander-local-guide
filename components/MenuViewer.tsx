'use client';

import { useState } from 'react';

type Menu = { id: number; filename: string; url: string; caption: string | null };

export default function MenuViewer({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState<Menu | null>(null);
  const [zoom, setZoom] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {menus.map((m) => (
          <button key={m.id} onClick={() => { setOpen(m); setZoom(false); }} className="border border-rule rounded-sm overflow-hidden bg-paper-sunk text-left group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/uploads/${m.filename}?w=500`} alt={m.caption || 'Menu'} className="w-full aspect-[3/4] object-cover group-hover:opacity-90" />
            <span className="block font-stamp uppercase tracking-[0.06em] text-[12px] text-chile px-2 py-1">{m.caption || 'Tap to view'}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink/90 flex flex-col" onClick={() => setOpen(null)}>
          <div className="flex justify-between items-center px-4 py-2 text-paper shrink-0">
            <span className="font-stamp uppercase tracking-[0.1em] text-sm">{open.caption || 'Menu'}</span>
            <div className="flex items-center gap-4">
              <a href={`/uploads/${open.filename}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-stamp uppercase tracking-[0.08em] text-xs hover:text-amber">Open full ↗</a>
              <button onClick={() => setOpen(null)} aria-label="Close" className="text-2xl leading-none">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2" style={{ touchAction: 'pinch-zoom' }} onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/uploads/${open.filename}?w=1600`} alt={open.caption || 'Menu'} onClick={() => setZoom((z) => !z)}
              style={{ width: zoom ? '170%' : '100%', maxWidth: zoom ? 'none' : '100%', cursor: zoom ? 'zoom-out' : 'zoom-in' }}
              className="mx-auto block transition-[width] duration-200" />
          </div>
          <p className="text-center text-paper/70 font-ui text-xs py-2 shrink-0">Tap the image to zoom · pinch to zoom on your phone</p>
        </div>
      )}
    </>
  );
}
