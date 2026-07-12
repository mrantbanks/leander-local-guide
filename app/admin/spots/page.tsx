import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import SpotsTable, { type SpotRow } from './SpotsTable';

export const dynamic = 'force-dynamic';

export default async function AdminSpotsPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const { rows } = await pool.query(
    `select slug, name, primary_category cat, editorial->>'verdict' verdict,
            coalesce((editorial->>'visited')::bool,false) visited, hidden
     from restaurants where archived_at is null
     order by (editorial->>'verdict' is null) desc, name`
  );
  const spots = rows as SpotRow[];
  const visited = spots.filter((r) => r.visited).length;
  const arch = await pool.query('select count(*)::int n from restaurants where archived_at is not null');
  const archivedCount = arch.rows[0].n as number;
  const hiddenCt = spots.filter((r) => r.hidden).length;

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">Spots &amp; Reviews</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-5">
        Every spot in the guide. Click <span className="text-chile font-semibold">Edit</span> to change Anthony&apos;s verdict, review, what-to-order, gotcha, happy hour, badges, photos, and recurring events for that place. Saves go live immediately.
        <span className="block mt-1">{rows.length} spots · {visited} marked &quot;Anthony visited&quot; · {rows.length - visited} still need his verdict{hiddenCt > 0 ? <> · <span className="text-oxblood">{hiddenCt} hidden</span></> : null}.</span>
        <span className="block mt-1">
          <Link href="/admin/spots/archive" className="text-chile font-stamp uppercase tracking-[0.08em] text-xs hover:text-oxblood">
            The Archive{archivedCount > 0 ? ` (${archivedCount})` : ''} →
          </Link>
        </span>
        <span className="block mt-1">Use <span className="text-oxblood font-semibold">Hide</span> for places that closed or aren&apos;t open yet (coming soon) — they vanish from the whole site but stay here so you can bring them back.</span>
      </p>
      <SpotsTable rows={spots} />
    </main>
  );
}
