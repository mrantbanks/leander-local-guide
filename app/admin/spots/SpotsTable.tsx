'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { setHidden } from '@/app/actions';

export type SpotRow = {
  slug: string;
  name: string;
  cat: string;
  verdict: string | null;
  visited: boolean;
  hidden: boolean;
};

// Client-side search + table. The list is long (200+ spots), so filter by
// name / category / verdict instead of scrolling.
export default function SpotsTable({ rows }: { rows: SpotRow[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.cat || '').toLowerCase().includes(s) ||
        (r.verdict || '').toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <div>
      <div className="sticky top-0 bg-paper z-10 pb-3 pt-1">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search spots by name, category, or verdict…"
          autoFocus
          className="w-full bg-paper-raised border-2 border-rule focus:border-ink outline-none px-3 py-2 font-ui text-sm text-ink rounded-[2px]"
        />
        <p className="font-stamp uppercase tracking-[0.1em] text-ink-soft text-xs mt-2">
          {q.trim() ? `${filtered.length} of ${rows.length} match` : `${rows.length} spots`}
        </p>
      </div>

      <table className="w-full font-ui text-sm">
        <thead>
          <tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
            <th className="py-2">Spot</th><th>Verdict</th><th>Visited</th><th></th><th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.slug} className={`border-b border-rule/60 ${r.hidden ? 'opacity-50' : ''}`}>
              <td className="py-2">
                <span className="font-display font-semibold text-ink text-base">{r.name}</span>
                <span className="text-ink-soft text-xs ml-2">{r.cat}</span>
                {r.hidden ? <span className="font-stamp uppercase tracking-[0.06em] text-[9px] bg-oxblood text-paper px-1 rounded-sm ml-2">Hidden</span> : null}
              </td>
              <td className="text-oxblood font-stamp uppercase tracking-[0.06em]">{r.verdict || 'none'}</td>
              <td>{r.visited ? '✓' : ''}</td>
              <td className="text-right">
                <form action={setHidden.bind(null, r.slug, !r.hidden)} className="inline">
                  <button className={`font-stamp uppercase tracking-[0.08em] hover:opacity-70 ${r.hidden ? 'text-ink-soft' : 'text-oxblood'}`}>{r.hidden ? 'Show' : 'Hide'}</button>
                </form>
              </td>
              <td className="text-right"><Link href={`/admin/r/${r.slug}`} className="text-chile font-stamp uppercase tracking-[0.08em] hover:text-oxblood">Edit</Link></td>
            </tr>
          ))}
          {filtered.length === 0 ? (
            <tr><td colSpan={5} className="py-6 font-hand text-xl text-oxblood">No spot matches &quot;{q}&quot;.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
