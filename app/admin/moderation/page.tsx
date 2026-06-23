import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import { approvePhoto, rejectPhoto, approveTip, rejectTip } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return (
      <main className="max-w-md mx-auto px-5 py-24 text-center">
        <p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p>
      </main>
    );
  }
  const [photos, tips] = await Promise.all([
    pool.query(`select p.id, p.filename, p.uploaded_by, r.name, r.slug from photos p join restaurants r on r.id = p.place_id where p.status = 'pending' order by p.created_at`),
    pool.query(`select t.id, t.body, t.user_email, r.name, r.slug from tips t join restaurants r on r.id = t.place_id where t.status = 'pending' order by t.created_at`),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-3 mb-6">
        <h1 className="font-display font-black text-4xl text-ink">Moderation</h1>
        <Link href="/admin" className="font-stamp uppercase tracking-[0.1em] text-sm text-chile">← Newsroom</Link>
      </div>

      {photos.rows.length === 0 && tips.rows.length === 0 && (
        <p className="font-hand text-2xl text-oxblood">Nothing pending. Inbox zero, chef.</p>
      )}

      {tips.rows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-3">Tips ({tips.rows.length})</h2>
          <div className="space-y-3">
            {tips.rows.map((t) => (
              <div key={t.id} className="border border-rule bg-paper-raised p-3 flex items-start gap-3">
                <div className="flex-1">
                  <Link href={`/r/${t.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood">{t.name}</Link>
                  <p className="font-ui text-sm text-ink mt-1">{t.body}</p>
                  <p className="font-ui text-[11px] text-ink-soft mt-1">{t.user_email}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <form action={approveTip.bind(null, t.id as number)}><button className="font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper px-3 py-1 hover:bg-chile">Approve</button></form>
                  <form action={rejectTip.bind(null, t.id as number)}><button className="font-stamp uppercase tracking-[0.08em] text-xs text-oxblood border border-oxblood/60 px-3 py-1 hover:bg-oxblood hover:text-paper">Reject</button></form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {photos.rows.length > 0 && (
        <section>
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-3">Photos ({photos.rows.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.rows.map((p) => (
              <div key={p.id} className="border border-rule bg-paper-raised">
                <div className="aspect-square overflow-hidden bg-paper-sunk">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/uploads/${p.filename}`} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <Link href={`/r/${p.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood block truncate">{p.name}</Link>
                  <p className="font-ui text-[11px] text-ink-soft truncate">{p.uploaded_by}</p>
                  <div className="mt-2 flex gap-2">
                    <form action={approvePhoto.bind(null, p.id as number)} className="flex-1"><button className="w-full font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper py-1 hover:bg-chile">Approve</button></form>
                    <form action={rejectPhoto.bind(null, p.id as number)} className="flex-1"><button className="w-full font-stamp uppercase tracking-[0.08em] text-xs text-oxblood border border-oxblood/60 py-1 hover:bg-oxblood hover:text-paper">Reject</button></form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
