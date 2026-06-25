'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type R = { slug: string; name: string; cat: string };

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<R[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const j = await r.json();
        setRes(j.results || []); setOpen(true);
      } catch { /* ignore */ }
    }, 150);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    function out(e: MouseEvent) { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);

  function go(slug?: string) {
    if (slug) router.push(`/r/${slug}`);
    else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false); setQ(''); setActive(-1);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, res.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active >= 0 ? res[active]?.slug : undefined); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  return (
    <div ref={box} className="relative">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setActive(-1); }}
        onFocus={() => res.length > 0 && setOpen(true)}
        onKeyDown={onKey}
        placeholder="Search spots..."
        aria-label="Search Leander restaurants"
        className="w-32 sm:w-44 focus:w-40 sm:focus:w-60 transition-[width] duration-200 bg-paper-raised border border-rule focus:border-chile rounded-sm px-3 py-1.5 text-[16px] sm:text-sm text-ink placeholder:text-ink-soft outline-none"
      />
      {open && res.length > 0 && (
        <ul className="absolute right-0 mt-1 w-72 max-w-[82vw] bg-paper border-2 border-ink shadow-xl z-50 max-h-[70vh] overflow-auto">
          {res.map((r, i) => (
            <li key={r.slug}>
              <Link href={`/r/${r.slug}`} onClick={() => { setOpen(false); setQ(''); }}
                className={`block px-3 py-2.5 ${i === active ? 'bg-amber' : 'hover:bg-paper-raised'}`}>
                <span className="font-display font-semibold text-ink text-sm">{r.name}</span>
                {r.cat && <span className="font-ui text-xs text-ink-soft ml-2">{r.cat}</span>}
              </Link>
            </li>
          ))}
          <li>
            <button onMouseDown={(e) => { e.preventDefault(); go(); }}
              className="w-full text-left px-3 py-2.5 font-stamp uppercase tracking-[0.08em] text-xs text-chile border-t border-rule hover:bg-paper-raised">
              See all results for &ldquo;{q.trim()}&rdquo; →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
