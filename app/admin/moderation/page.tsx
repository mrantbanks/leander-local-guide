import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import { approvePhoto, rejectPhoto, approveTip, rejectTip, approveReview, rejectReview, verifyClaim, rejectClaim, approveEvent, rejectEvent } from '@/app/actions';
import { uploadUrl } from '@/lib/uploads';
import { EVENT_LABELS } from '@/lib/events';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const [claims, reviews, tips, photos, eventsP] = await Promise.all([
    pool.query(`select c.id, c.role, c.contact, c.user_email, r.name, r.slug from claims c join restaurants r on r.id = c.place_id where c.status = 'pending' order by c.created_at`),
    pool.query(`select rv.id, rv.stars, rv.body, rv.user_email, r.name, r.slug from reviews rv join restaurants r on r.id = rv.place_id where rv.status = 'pending' order by rv.created_at`),
    pool.query(`select t.id, t.body, t.user_email, r.name, r.slug from tips t join restaurants r on r.id = t.place_id where t.status = 'pending' order by t.created_at`),
    pool.query(`select p.id, p.filename, p.uploaded_by, r.name, r.slug from photos p join restaurants r on r.id = p.place_id where p.status = 'pending' order by p.created_at`),
    pool.query(`select e.id, e.event_type, e.title, e.freq, e.days_of_week, e.start_time, e.source, e.source_url, r.name, r.slug from events e join restaurants r on r.id = e.place_id where e.status = 'pending' order by e.created_at`),
  ]);
  const total = claims.rows.length + reviews.rows.length + tips.rows.length + photos.rows.length + eventsP.rows.length;

  return (
    <main className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-3 mb-6">
        <h1 className="font-display font-black text-4xl text-ink">Moderation</h1>
        <Link href="/admin" className="font-stamp uppercase tracking-[0.1em] text-sm text-chile">← Newsroom</Link>
      </div>
      {total === 0 && <p className="font-hand text-2xl text-oxblood">Nothing pending. Inbox zero, chef.</p>}

      {eventsP.rows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-3">Events ({eventsP.rows.length})</h2>
          <div className="space-y-3">
            {eventsP.rows.map((e) => (
              <div key={e.id} className="border border-rule bg-paper-raised p-3 flex items-start gap-3">
                <div className="flex-1">
                  <Link href={`/r/${e.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood">{e.name}</Link>
                  <p className="font-ui text-sm text-ink mt-1">{EVENT_LABELS[e.event_type] || e.event_type}: {e.title}{' '}
                    <span className="text-ink-soft text-xs">({e.freq}{e.days_of_week ? ' ' + (e.days_of_week as number[]).join(',') : ''}{e.start_time ? ' ' + e.start_time.slice(0, 5) : ''})</span></p>
                  <p className="font-ui text-[11px] text-ink-soft">via {e.source}{e.source_url ? ` · ${e.source_url}` : ''}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <form action={approveEvent.bind(null, e.id as number)}><button className="font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper px-3 py-1 hover:bg-chile">Approve</button></form>
                  <form action={rejectEvent.bind(null, e.id as number)}><button className="font-stamp uppercase tracking-[0.08em] text-xs text-oxblood border border-oxblood/60 px-3 py-1 hover:bg-oxblood hover:text-paper">Reject</button></form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {claims.rows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-3">Owner claims ({claims.rows.length})</h2>
          <div className="space-y-3">
            {claims.rows.map((c) => (
              <div key={c.id} className="border border-rule bg-paper-raised p-3 flex items-start gap-3">
                <div className="flex-1">
                  <Link href={`/r/${c.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood">{c.name}</Link>
                  <p className="font-ui text-sm text-ink mt-1">{c.role} · {c.contact}</p>
                  <p className="font-ui text-[11px] text-ink-soft">{c.user_email}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <form action={verifyClaim.bind(null, c.id as number)}><button className="font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper px-3 py-1 hover:bg-chile">Verify</button></form>
                  <form action={rejectClaim.bind(null, c.id as number)}><button className="font-stamp uppercase tracking-[0.08em] text-xs text-oxblood border border-oxblood/60 px-3 py-1 hover:bg-oxblood hover:text-paper">Reject</button></form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {reviews.rows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-3">Reviews ({reviews.rows.length})</h2>
          <div className="space-y-3">
            {reviews.rows.map((rv) => (
              <div key={rv.id} className="border border-rule bg-paper-raised p-3 flex items-start gap-3">
                <div className="flex-1">
                  <Link href={`/r/${rv.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood">{rv.name}</Link>
                  <p className="text-amber text-sm">{'★'.repeat(rv.stars)}<span className="text-rule">{'★'.repeat(5 - rv.stars)}</span></p>
                  {rv.body && <p className="font-ui text-sm text-ink mt-1">{rv.body}</p>}
                  <p className="font-ui text-[11px] text-ink-soft">{rv.user_email}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <form action={approveReview.bind(null, rv.id as number)}><button className="font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper px-3 py-1 hover:bg-chile">Approve</button></form>
                  <form action={rejectReview.bind(null, rv.id as number)}><button className="font-stamp uppercase tracking-[0.08em] text-xs text-oxblood border border-oxblood/60 px-3 py-1 hover:bg-oxblood hover:text-paper">Reject</button></form>
                </div>
              </div>
            ))}
          </div>
        </section>
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
                  <p className="font-ui text-[11px] text-ink-soft">{t.user_email}</p>
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
                  <img src={uploadUrl(p.filename)} alt="" className="w-full h-full object-cover" />
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
