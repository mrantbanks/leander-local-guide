'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type PickRow = { slug: string; name: string; cat: string | null; verdict: string | null; hidden: boolean; hasMenu: boolean };

export default function SeoPicker({ spots }: { spots: PickRow[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return spots;
    return spots.filter((s) => s.name.toLowerCase().includes(n) || (s.cat || '').toLowerCase().includes(n));
  }, [q, spots]);

  return (
    <div>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search restaurants…"
        className="w-full max-w-md bg-paper border border-rule px-3 py-2 font-ui text-sm text-ink rounded-[2px] mb-3"
      />
      <p className="font-ui text-xs text-ink-soft mb-2">{filtered.length} of {spots.length}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {filtered.map((s) => (
          <li key={s.slug}>
            <Link href={`/admin/seo/r/${s.slug}`} className="flex items-center justify-between gap-2 border border-rule rounded-[2px] px-3 py-2 bg-paper hover:bg-paper-raised">
              <span className="min-w-0">
                <span className="font-display font-bold text-ink block truncate">{s.name}</span>
                <span className="font-ui text-xs text-ink-soft">{[s.cat, s.verdict].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {s.hasMenu && <span className="font-stamp uppercase tracking-[0.06em] text-[10px] bg-paper-sunk text-ink-soft px-1.5 py-0.5 rounded-[2px]">menu</span>}
                {s.hidden && <span className="font-stamp uppercase tracking-[0.06em] text-[10px] bg-oxblood text-paper px-1.5 py-0.5 rounded-[2px]">hidden</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
