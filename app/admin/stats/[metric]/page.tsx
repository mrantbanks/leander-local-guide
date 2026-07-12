import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { metricRows, METRICS, isMetric, parseWin, WINDOWS, windowOf } from '@/lib/stats';

export const dynamic = 'force-dynamic';

// The working behind a number. If the tile says 34 and this list has 34 rows, the tile is true.
// That is the whole argument for counting in our own database rather than in someone else's.

const stamp = (d: Date | null) =>
  d
    ? new Date(d).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        timeZone: 'America/Chicago',
      })
    : 'unknown';

export default async function MetricPage({
  params, searchParams,
}: {
  params: Promise<{ metric: string }>;
  searchParams: Promise<{ win?: string }>;
}) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }

  const { metric } = await params;
  if (!isMetric(metric)) notFound();
  const win = parseWin((await searchParams).win);
  const rows = await metricRows(metric, win);
  const m = METRICS[metric];
  const b = windowOf(win);
  const range = b.from
    ? `${b.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })} to ${b.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })}`
    : 'Everything we have ever recorded';

  return (
    <main className="max-w-3xl mx-auto px-5 py-8">
      <Link href={`/admin/stats?win=${win}`} className="inline-flex font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile mb-4">
        ← Back to the numbers
      </Link>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-3xl text-ink">{m.label}</h1>
          <p className="font-ui text-sm text-ink-soft mt-1">{range}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {WINDOWS.map((w) => (
            <Link
              key={w.key}
              href={`/admin/stats/${metric}?win=${w.key}`}
              className={`font-stamp uppercase tracking-[0.06em] text-xs px-3 py-1.5 rounded-sm border ${
                w.key === win ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {w.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="font-ui text-sm text-ink-soft mt-4 mb-6 border-l-2 border-chile/50 pl-3 leading-relaxed">{m.hint}</p>

      <p className="font-stamp uppercase tracking-[0.1em] text-sm text-chile mb-3">
        {rows.length === 0 ? 'Nothing in this window' : `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}
      </p>

      {rows.length === 0 ? (
        <p className="font-hand text-2xl text-oxblood">
          Nothing here yet. That is the honest answer, not a broken page.
        </p>
      ) : (
        <ul className="border-t border-rule">
          {rows.map((r, i) => (
            <li key={i} className="border-b border-rule py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft w-44 shrink-0">{stamp(r.when)}</span>
              <span className="font-display font-bold text-ink">
                {r.slug ? (
                  <Link href={`/r/${r.slug}`} className="hover:text-chile">{r.name}</Link>
                ) : (
                  r.name
                )}
              </span>
              {r.detail && <span className="font-ui text-sm text-ink-soft min-w-0 break-words">{r.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
