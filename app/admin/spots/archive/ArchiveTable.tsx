'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { restoreSpot, deleteSpotForever } from '@/app/actions';

export type ArchivedRow = {
  slug: string; name: string; cat: string; archivedAt: string;
  photos: number; reviews: number; tips: number; signals: number; events: number; owners: number;
};

/**
 * Delete is for ever, so the confirm is not a shrug: it names the spot, counts what real people left
 * on it, and makes you type the name. A photo a local took and a review they wrote are the two things
 * on this site we genuinely cannot get back.
 */
export default function ArchiveTable({ rows }: { rows: ArchivedRow[] }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const doDelete = (r: ArchivedRow) =>
    start(async () => {
      setErr('');
      const res = await deleteSpotForever(r.slug);
      if (!res.ok) { setErr(res.error || 'Could not delete that.'); return; }
      setConfirming(null);
      setTyped('');
    });

  return (
    <ul className="border-t border-rule">
      {rows.map((r) => {
        const contributions = r.photos + r.reviews + r.tips + r.signals;
        const open = confirming === r.slug;

        return (
          <li key={r.slug} className="border-b border-rule py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-bold text-ink text-lg">{r.name}</p>
                <p className="font-ui text-xs text-ink-soft mt-0.5">
                  {r.cat} · archived {r.archivedAt}
                  {contributions > 0 && (
                    <span className="text-oxblood">
                      {' · '}
                      {[
                        r.photos && `${r.photos} photo${r.photos === 1 ? '' : 's'}`,
                        r.reviews && `${r.reviews} review${r.reviews === 1 ? '' : 's'}`,
                        r.tips && `${r.tips} tip${r.tips === 1 ? '' : 's'}`,
                        r.signals && `${r.signals} vote${r.signals === 1 ? '' : 's'}`,
                        r.events && `${r.events} event${r.events === 1 ? '' : 's'}`,
                        r.owners && `${r.owners} verified owner`,
                      ].filter(Boolean).join(', ')}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/admin/r/${r.slug}`} className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-ink px-2 py-1">
                  Look at it
                </Link>
                <form action={restoreSpot.bind(null, r.slug)}>
                  <button className="font-stamp uppercase tracking-[0.06em] text-xs border border-chile/40 text-chile px-3 py-1.5 rounded-sm hover:bg-chile hover:text-paper transition-colors">
                    Put it back
                  </button>
                </form>
                <button
                  onClick={() => { setConfirming(open ? null : r.slug); setTyped(''); setErr(''); }}
                  className="font-stamp uppercase tracking-[0.06em] text-xs border border-oxblood/40 text-oxblood px-3 py-1.5 rounded-sm hover:bg-oxblood hover:text-paper transition-colors"
                >
                  Delete for ever
                </button>
              </div>
            </div>

            {open && (
              <div className="mt-3 border-2 border-oxblood bg-paper-sunk p-4">
                <p className="font-display font-bold text-ink">This cannot be undone.</p>
                {contributions > 0 ? (
                  <p className="font-ui text-sm text-ink-soft mt-1">
                    Deleting <strong>{r.name}</strong> also destroys{' '}
                    <strong className="text-oxblood">
                      {[
                        r.photos && `${r.photos} photo${r.photos === 1 ? '' : 's'}`,
                        r.reviews && `${r.reviews} review${r.reviews === 1 ? '' : 's'}`,
                        r.tips && `${r.tips} tip${r.tips === 1 ? '' : 's'}`,
                        r.signals && `${r.signals} vote${r.signals === 1 ? '' : 's'}`,
                      ].filter(Boolean).join(', ')}
                    </strong>{' '}
                    that locals left on it, and the image files themselves. Putting it back instead costs you nothing.
                  </p>
                ) : (
                  <p className="font-ui text-sm text-ink-soft mt-1">
                    Nobody has left anything on this one, so there is nothing to lose but the listing.
                  </p>
                )}

                <label className="block font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mt-3 mb-1">
                  Type <span className="text-oxblood">{r.name}</span> to confirm
                </label>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="w-full max-w-sm bg-paper border border-rule px-3 py-2 font-ui text-sm text-ink rounded-sm outline-none focus:border-oxblood"
                  placeholder={r.name}
                />

                {err && <p className="font-ui text-sm text-oxblood mt-2">{err}</p>}

                <div className="flex items-center gap-3 mt-3">
                  <button
                    disabled={pending || typed.trim() !== r.name}
                    onClick={() => doDelete(r)}
                    className="font-stamp uppercase tracking-[0.08em] text-sm bg-oxblood text-paper px-4 py-2 rounded-sm hover:opacity-90 disabled:opacity-40"
                  >
                    {pending ? 'Deleting...' : 'Delete it for ever'}
                  </button>
                  <button
                    onClick={() => { setConfirming(null); setTyped(''); setErr(''); }}
                    className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-ink"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
