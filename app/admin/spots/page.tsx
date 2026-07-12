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
    // Suspected duplicates. Three ways the same restaurant ends up in here twice, and we have hit
    // all three: a Place ID that arrived wrapped in quotes so `on conflict (id)` missed it, the same
    // place added again under a slightly different name, and two rows at the same street address.
    // Flag, never merge automatically: only a human knows whether two Domino's on US-183 are one
    // shop entered twice or two actual shops.
    `with n as (
       select id, slug, name, address_formatted, hidden, primary_category, editorial, archived_at,
              regexp_replace(lower(name), '[^a-z0-9]', '', 'g')      as name_key,
              regexp_replace(id, '[^A-Za-z0-9_-]', '', 'g')          as id_key
         from restaurants
     )
     select n.slug, n.name, n.primary_category cat, n.editorial->>'verdict' verdict,
            coalesce((n.editorial->>'visited')::bool,false) visited, n.hidden,
            exists (
              select 1 from n d
               where d.archived_at is null
                 and d.id <> n.id
                 and ( d.id_key = n.id_key
                    or d.name_key = n.name_key
                    or (n.address_formatted is not null and d.address_formatted = n.address_formatted) )
            ) as dup
       from n
      where n.archived_at is null
      order by (n.editorial->>'verdict' is null) desc, n.name`
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
