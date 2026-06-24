import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function AdminSpotsPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const { rows } = await pool.query(
    `select slug, name, primary_category cat, editorial->>'verdict' verdict,
            coalesce((editorial->>'visited')::bool,false) visited
     from restaurants order by (editorial->>'verdict' is null) desc, name`
  );
  const visited = rows.filter((r) => r.visited).length;

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">Spots &amp; Reviews</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-5">
        Every spot in the guide. Click <span className="text-chile font-semibold">Edit</span> to change Anthony&apos;s verdict, review, what-to-order, gotcha, happy hour, badges, photos, and recurring events for that place. Saves go live immediately.
        <span className="block mt-1">{rows.length} spots · {visited} marked &quot;Anthony visited&quot; · {rows.length - visited} still need his verdict.</span>
      </p>
      <table className="w-full font-ui text-sm">
        <thead>
          <tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
            <th className="py-2">Spot</th><th>Verdict</th><th>Visited</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-b border-rule/60">
              <td className="py-2">
                <span className="font-display font-semibold text-ink text-base">{r.name}</span>
                <span className="text-ink-soft text-xs ml-2">{r.cat}</span>
              </td>
              <td className="text-oxblood font-stamp uppercase tracking-[0.06em]">{r.verdict || 'none'}</td>
              <td>{r.visited ? '✓' : ''}</td>
              <td className="text-right"><Link href={`/admin/r/${r.slug}`} className="text-chile font-stamp uppercase tracking-[0.08em] hover:text-oxblood">Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
