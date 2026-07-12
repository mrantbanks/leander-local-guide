import Link from 'next/link';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import ArchiveTable, { type ArchivedRow } from './ArchiveTable';

export const dynamic = 'force-dynamic';

// The archive is the only door to a permanent delete, and it is the screen's job to say exactly what
// would go with the spot. Reader photos, tips, reviews and votes are contributions from real people
// and they are the one thing here we genuinely cannot get back.
export default async function ArchivePage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }

  const { rows } = await pool.query(`
    select r.slug, r.name, r.primary_category as cat, r.archived_at,
           (select count(*) from photos        p where p.place_id = r.id)::int as photos,
           (select count(*) from reviews      rv where rv.place_id = r.id)::int as reviews,
           (select count(*) from tips          t where t.place_id = r.id)::int as tips,
           (select count(*) from place_signals s where s.place_id = r.id)::int as signals,
           (select count(*) from events        e where e.place_id = r.id)::int as events,
           (select count(*) from claims        c where c.place_id = r.id and c.status = 'verified')::int as owners
      from restaurants r
     where r.archived_at is not null
     order by r.archived_at desc`);

  const archived: ArchivedRow[] = rows.map((r) => ({
    slug: r.slug, name: r.name, cat: r.cat,
    archivedAt: r.archived_at ? new Date(r.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    photos: r.photos, reviews: r.reviews, tips: r.tips, signals: r.signals, events: r.events, owners: r.owners,
  }));

  return (
    <main className="max-w-4xl mx-auto px-5 py-8">
      <Link href="/admin/spots" className="inline-flex font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile mb-4">
        ← Back to spots
      </Link>

      <h1 className="font-display font-black text-3xl text-ink">The Archive</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-6 max-w-2xl leading-relaxed">
        Spots taken out of circulation. They are off the public site and out of the working list, but nothing has been
        thrown away. Put one back whenever you like. Deleting is for ever, and it takes every photo, review, tip and
        vote real people left on it, so the button tells you the count before you press it.
      </p>

      {archived.length === 0 ? (
        <p className="font-hand text-2xl text-oxblood">Nothing archived. Nothing lost.</p>
      ) : (
        <ArchiveTable rows={archived} />
      )}
    </main>
  );
}
