import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import { setHidden } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function AdminSpotsPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const { rows } = await pool.query(
    `select slug, name, primary_category cat, editorial->>'verdict' verdict,
            coalesce((editorial->>'visited')::bool,false) visited, hidden
     from restaurants order by (editorial->>'verdict' is null) desc, name`
  );
  const visited = rows.filter((r) => r.visited).length;
  const hiddenCt = rows.filter((r) => r.hidden).length;

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">Spots &amp; Reviews</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-5">
        Every spot in the guide. Click <span className="text-chile font-semibold">Edit</span> to change Anthony&apos;s verdict, review, what-to-order, gotcha, happy hour, badges, photos, and recurring events for that place. Saves go live immediately.
        <span className="block mt-1">{rows.length} spots · {visited} marked &quot;Anthony visited&quot; · {rows.length - visited} still need his verdict{hiddenCt > 0 ? <> · <span className="text-oxblood">{hiddenCt} hidden</span></> : null}.</span>
        <span className="block mt-1">Use <span className="text-oxblood font-semibold">Hide</span> for places that closed or aren&apos;t open yet (coming soon) — they vanish from the whole site but stay here so you can bring them back.</span>
      </p>
      <table className="w-full font-ui text-sm">
        <thead>
          <tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
            <th className="py-2">Spot</th><th>Verdict</th><th>Visited</th><th></th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className={`border-b border-rule/60 ${r.hidden ? 'opacity-50' : ''}`}>
              <td className="py-2">
                <span className="font-display font-semibold text-ink text-base">{r.name}</span>
                <span className="text-ink-soft text-xs ml-2">{r.cat}</span>
                {r.hidden ? <span className="font-stamp uppercase tracking-[0.06em] text-[9px] bg-oxblood text-paper px-1 rounded-sm ml-2">Hidden</span> : null}
              </td>
              <td className="text-oxblood font-stamp uppercase tracking-[0.06em]">{r.verdict || 'none'}</td>
              <td>{r.visited ? '✓' : ''}</td>
              <td className="text-right">
                <form action={async () => { 'use server'; await setHidden(r.slug, !r.hidden); }} className="inline">
                  <button className={`font-stamp uppercase tracking-[0.08em] hover:opacity-70 ${r.hidden ? 'text-ink-soft' : 'text-oxblood'}`}>{r.hidden ? 'Show' : 'Hide'}</button>
                </form>
              </td>
              <td className="text-right"><Link href={`/admin/r/${r.slug}`} className="text-chile font-stamp uppercase tracking-[0.08em] hover:text-oxblood">Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
