'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { setHidden, archiveSpot } from '@/app/actions';

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
            <th className="py-2">Spot</th><th>Verdict</th><th>Visited</th><th></th><th></th><th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.slug} className={`border-b border-rule/60 ${r.hidden ? 'opacity-50' : ''}`}>
              <td className="py-2">
                <span className="font-display font-semibold text-ink text-base">{r.name}</span>
                <span className="text-ink-soft text-xs ml-2">{r.cat}</span>
                {r.hidden ? <span className="font-stamp uppercase tracking-[0.06em] text-sm bg-oxblood text-paper px-1 rounded-sm ml-2">Hidden</span> : null}
              </td>
              <td className="text-oxblood font-stamp uppercase tracking-[0.06em]">{r.verdict || 'none'}</td>
              {/* A real stamp, not a tick. Only 4 of 197 spots have actually been visited, and that
                  distinction is the spine of the whole guide: the verdict on every other spot is
                  synthesised from what reviewers say. It should be unmissable in the one table where
                  Anthony decides where to go next. */}
              <td className="whitespace-nowrap">
                {r.visited ? (
                  <span className="inline-block font-stamp uppercase tracking-[0.06em] text-xs border-2 border-oxblood/70 text-oxblood rounded-[2px] px-2 py-0.5 leading-none -rotate-3">
                    I&apos;ve been here
                  </span>
                ) : (
                  <span className="font-ui text-xs text-ink-soft/60">not yet</span>
                )}
              </td>
              {/* Hide removes a listing from the ENTIRE public site: the directory, the map, search,
                  its own page, the boards. It sat one careless pixel from Edit, with no confirm.
                  Ask first, and put some air between them. */}
              <td className="text-right pr-6">
                <form
                  action={setHidden.bind(null, r.slug, !r.hidden)}
                  className="inline"
                  onSubmit={(e) => {
                    if (r.hidden) return; // showing it again needs no ceremony
                    if (!confirm(`Hide ${r.name}?\n\nIt disappears from the whole public site: the directory, the map, search, the boards, and its own page. Nothing is deleted, and you can show it again from here.`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <button
                    className={`font-stamp uppercase tracking-[0.08em] px-2 py-1 rounded-sm border transition-colors ${
                      r.hidden
                        ? 'text-ink-soft border-rule hover:border-ink hover:text-ink'
                        : 'text-oxblood border-oxblood/40 hover:bg-oxblood hover:text-paper hover:border-oxblood'
                    }`}
                  >
                    {r.hidden ? 'Show' : 'Hide'}
                  </button>
                </form>
              </td>
              {/* Archive: closed for good, never really a restaurant, or a duplicate. Not a delete.
                  Nothing is thrown away, and deleting is a separate, deliberate act from the archive. */}
              <td className="text-right pr-6">
                <form
                  action={archiveSpot.bind(null, r.slug)}
                  className="inline"
                  onSubmit={(e) => {
                    if (!confirm(`Archive ${r.name}?\n\nIt comes off the public site and out of this list, but nothing is thrown away: photos, reviews, tips and votes all stay. You can put it back any time, and you can delete it for good from the archive.`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <button className="font-stamp uppercase tracking-[0.08em] px-2 py-1 rounded-sm border border-rule text-ink-soft hover:border-ink hover:text-ink transition-colors">
                    Archive
                  </button>
                </form>
              </td>
              <td className="text-right">
                <Link
                  href={`/admin/r/${r.slug}`}
                  className="inline-block font-stamp uppercase tracking-[0.08em] px-2 py-1 rounded-sm border border-chile/40 text-chile hover:bg-chile hover:text-paper transition-colors"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
          {filtered.length === 0 ? (
            <tr><td colSpan={6} className="py-6 font-hand text-xl text-oxblood">No spot matches &quot;{q}&quot;.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
