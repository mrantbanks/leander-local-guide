'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type R = { slug: string; name: string; cat: string };

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [fetched, setRes] = useState<R[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [mobile, setMobile] = useState(false); // mobile expanded panel
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const mInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return; // nothing to fetch, and nothing to clear: see `res` below
    const id = setTimeout(async () => {
      try { const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`); const j = await r.json(); setRes(j.results || []); setOpen(true); } catch { /* ignore */ }
    }, 150);
    return () => clearTimeout(id);
  }, [q]);

  // Derived, not stored. The effect above used to setRes([]) whenever the query dropped below two
  // characters, which cost a second render pass on those keystrokes. Whether we SHOW results is a
  // function of the query, so just compute it.
  const res = q.trim().length < 2 ? [] : fetched;

  useEffect(() => {
    function out(e: MouseEvent) { if (box.current && !box.current.contains(e.target as Node)) { setOpen(false); setMobile(false); } }
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, []);

  useEffect(() => { if (mobile) setTimeout(() => mInput.current?.focus(), 30); }, [mobile]);

  function go(slug?: string) {
    if (slug) router.push(`/r/${slug}`);
    else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false); setMobile(false); setQ(''); setActive(-1);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, res.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active >= 0 ? res[active]?.slug : undefined); }
    else if (e.key === 'Escape') { setOpen(false); setMobile(false); }
  }

  const list = (
    <>
      {res.map((r, i) => (
        <li key={r.slug}>
          <Link href={`/r/${r.slug}`} onClick={() => { setOpen(false); setMobile(false); setQ(''); }} className={`block px-3 py-2.5 ${i === active ? 'bg-amber' : 'hover:bg-paper-raised'}`}>
            <span className="font-display font-semibold text-ink text-sm">{r.name}</span>
            {r.cat && <span className="font-ui text-xs text-ink-soft ml-2">{r.cat}</span>}
          </Link>
        </li>
      ))}
      <li>
        <button onMouseDown={(e) => { e.preventDefault(); go(); }} className="w-full text-left px-3 py-2.5 font-stamp uppercase tracking-[0.08em] text-xs text-chile border-t border-rule hover:bg-paper-raised">
          See all results for &ldquo;{q.trim()}&rdquo; →
        </button>
      </li>
    </>
  );

  return (
    <div ref={box} className="relative flex items-center">
      {/* mobile: compact magnifier toggle (keeps the nav row from overflowing) */}
      <button onClick={() => setMobile((m) => !m)} aria-label="Search" className="sm:hidden p-1.5 text-ink-soft hover:text-ink">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      </button>

      {/* desktop: inline input */}
      <input
        value={q} onChange={(e) => { setQ(e.target.value); setActive(-1); }} onFocus={() => res.length > 0 && setOpen(true)} onKeyDown={onKey}
        placeholder="Search spots..." aria-label="Search Leander restaurants"
        className="hidden sm:block w-44 focus:w-60 transition-[width] duration-200 bg-paper-raised border border-rule focus:border-chile rounded-sm px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft outline-none"
      />
      {open && !mobile && res.length > 0 && (
        <ul className="hidden sm:block absolute right-0 top-full mt-1 w-72 bg-paper border-2 border-ink shadow-xl z-50 max-h-[70vh] overflow-auto">{list}</ul>
      )}

      {/* mobile: full-width search panel dropping below the nav */}
      {mobile && (
        <div className="sm:hidden fixed inset-x-0 top-14 z-50 bg-paper border-b-2 border-ink p-3 shadow-xl">
          <div className="flex items-center gap-2">
            <input ref={mInput} value={q} onChange={(e) => { setQ(e.target.value); setActive(-1); }} onKeyDown={onKey}
              placeholder="Search every spot in Leander..." aria-label="Search"
              className="flex-1 min-w-0 bg-paper-raised border border-rule focus:border-chile rounded-sm px-3 py-2 text-[16px] text-ink placeholder:text-ink-soft outline-none" />
            <button onClick={() => { setMobile(false); setQ(''); }} aria-label="Close search" className="shrink-0 px-2 text-ink-soft text-xl leading-none">✕</button>
          </div>
          {res.length > 0 && <ul className="mt-2 border border-rule bg-paper max-h-[60vh] overflow-auto">{list}</ul>}
        </div>
      )}
    </div>
  );
}
