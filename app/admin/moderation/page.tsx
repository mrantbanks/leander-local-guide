import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import { approvePhoto, rejectPhoto, approveTip, rejectTip, approveReview, rejectReview, verifyClaim, rejectClaim, approveEvent, rejectEvent } from '@/app/actions';
import { uploadUrl } from '@/lib/uploads';
import { EVENT_LABELS } from '@/lib/events';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am'; const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`;
}
function whenStr(e: { freq: string; days_of_week: number[] | null; start_time: string | null; event_date: string | null }): { text: string; vague: boolean } {
  const days = (e.days_of_week || []).map((d) => DAYS[d - 1]).join(' & ');
  const time = fmtTime(e.start_time);
  if (e.freq === 'once') return { text: e.event_date ? `one-off on ${e.event_date}` : 'one-off (no date)', vague: !e.event_date };
  if (days && time) return { text: `${days} at ${time}`, vague: false };
  if (days) return { text: `${days} (time not detected)`, vague: true };
  if (time) return { text: `weekly at ${time} (day not detected)`, vague: true };
  return { text: 'recurring — day & time not detected', vague: true };
}

function fmtClaimTime(ts: string | Date | null): string {
  if (!ts) return 'time unknown';
  return new Date(ts).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const SectionNote = ({ children }: { children: ReactNode }) => (
  <p className="font-ui text-xs text-ink-soft mb-3 max-w-2xl leading-relaxed">{children}</p>
);

export default async function ModerationPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const [claims, reviews, tips, photos, eventsP] = await Promise.all([
    pool.query(`select c.id, c.role, c.contact, c.user_email, c.created_at, c.ip, r.name, r.slug from claims c join restaurants r on r.id = c.place_id where c.status='pending' order by c.created_at`),
    pool.query(`select rv.id, rv.stars, rv.body, rv.user_email, r.name, r.slug from reviews rv join restaurants r on r.id = rv.place_id where rv.status='pending' order by rv.created_at`),
    pool.query(`select t.id, t.body, t.user_email, r.name, r.slug from tips t join restaurants r on r.id = t.place_id where t.status='pending' order by t.created_at`),
    pool.query(`select p.id, p.filename, p.uploaded_by, r.name, r.slug from photos p join restaurants r on r.id = p.place_id where p.status='pending' order by p.created_at`),
    pool.query(`select e.id, e.event_type, e.title, e.freq, e.days_of_week, e.start_time, e.event_date, e.source, e.source_url, e.source_quote, r.name, r.slug from events e join restaurants r on r.id = e.place_id where e.status='pending' order by e.created_at`),
  ]);
  const total = claims.rows.length + reviews.rows.length + tips.rows.length + photos.rows.length + eventsP.rows.length;
  const Btns = ({ approve, reject }: { approve: () => Promise<void>; reject: () => Promise<void> }) => (
    <div className="flex flex-col gap-2 shrink-0">
      <form action={approve}><button className="font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper px-3 py-1 hover:bg-chile">Approve</button></form>
      <form action={reject}><button className="font-stamp uppercase tracking-[0.08em] text-xs text-oxblood border border-oxblood/60 px-3 py-1 hover:bg-oxblood hover:text-paper">Reject</button></form>
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">Moderation</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-6 max-w-2xl leading-relaxed">
        <span className="text-ink font-semibold">Nothing on this page is public yet.</span> Each item is something submitted by a visitor, or suggested by the event scraper, waiting for your call. <span className="text-ink">Approve</span> publishes it on the site; <span className="text-ink">Reject</span> discards it (rejected things never come back). Work top to bottom; when it&apos;s empty you&apos;re done.
      </p>

      {total === 0 && <p className="font-hand text-2xl text-oxblood">Inbox zero, chef. Nothing waiting.</p>}

      {eventsP.rows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-1">Event suggestions ({eventsP.rows.length})</h2>
          <SectionNote>
            Recurring events the scraper spotted on a venue&apos;s own website. They are <span className="text-ink">unverified guesses</span> — the &quot;From their site&quot; quote is the exact text it found. Approve only if it looks like a real recurring event; reject the vague ones (a bare &quot;live music&quot; mention with no day usually isn&apos;t worth listing). Your remote workers also verify these automatically, so you can leave them if workers are running.
          </SectionNote>
          <div className="space-y-3">
            {eventsP.rows.map((e) => {
              const w = whenStr(e);
              return (
                <div key={e.id} className="border border-rule bg-paper-raised p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/r/${e.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood">{e.name}</Link>
                    <p className="font-ui text-sm text-ink mt-0.5">
                      <span className="font-stamp uppercase tracking-[0.06em] text-chile text-xs">{EVENT_LABELS[e.event_type] || e.event_type}</span>
                      {' · '}<span className={w.vague ? 'text-oxblood' : 'text-ink'}>{w.vague ? '⚠ ' : ''}{w.text}</span>
                    </p>
                    {e.source_quote && <p className="font-ui text-xs text-ink-soft mt-1 italic border-l-2 border-rule pl-2">From their site: &ldquo;{e.source_quote}&rdquo;</p>}
                    {e.source_url && <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="font-ui text-[12px] text-chile hover:underline mt-1 inline-block">view source page →</a>}
                  </div>
                  <Btns approve={approveEvent.bind(null, e.id as number)} reject={rejectEvent.bind(null, e.id as number)} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {claims.rows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-1">Owner claims ({claims.rows.length})</h2>
          <SectionNote>A business owner is asking to manage their listing. <span className="text-ink">Approve</span> only if they look legit (verify the contact) — it lets them post owner responses to reviews. It never changes their ranking or Anthony&apos;s verdict.</SectionNote>
          <div className="space-y-3">
            {claims.rows.map((c) => (
              <div key={c.id} className="border border-rule bg-paper-raised p-3 flex items-start gap-3">
                <div className="flex-1"><Link href={`/r/${c.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood">{c.name}</Link>
                  <p className="font-ui text-sm text-ink mt-1">Claims to be: <span className="font-semibold">{c.role}</span> · contact: {c.contact}</p>
                  <p className="font-ui text-[12px] text-ink-soft">signed in as {c.user_email}</p>
                  <p className="font-ui text-[12px] text-ink-soft">submitted {fmtClaimTime(c.created_at)}{c.ip ? <> · IP <span className="font-mono">{c.ip}</span></> : ''}</p></div>
                <Btns approve={verifyClaim.bind(null, c.id as number)} reject={rejectClaim.bind(null, c.id as number)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {reviews.rows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-1">Star reviews ({reviews.rows.length})</h2>
          <SectionNote>A visitor&apos;s star rating + comment. <span className="text-ink">Approve</span> to show it under &quot;Local reviews&quot; on the spot page and count it toward the local average.</SectionNote>
          <div className="space-y-3">
            {reviews.rows.map((rv) => (
              <div key={rv.id} className="border border-rule bg-paper-raised p-3 flex items-start gap-3">
                <div className="flex-1"><Link href={`/r/${rv.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood">{rv.name}</Link>
                  <p className="text-amber text-sm">{'★'.repeat(rv.stars)}<span className="text-rule">{'★'.repeat(5 - rv.stars)}</span></p>
                  {rv.body && <p className="font-ui text-sm text-ink mt-1">{rv.body}</p>}
                  <p className="font-ui text-[12px] text-ink-soft">by {rv.user_email}</p></div>
                <Btns approve={approveReview.bind(null, rv.id as number)} reject={rejectReview.bind(null, rv.id as number)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {tips.rows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-1">Tips ({tips.rows.length})</h2>
          <SectionNote>A short visitor tip (&quot;what to order / heads-up&quot;). <span className="text-ink">Approve</span> to show it under &quot;Locals say&quot;.</SectionNote>
          <div className="space-y-3">
            {tips.rows.map((t) => (
              <div key={t.id} className="border border-rule bg-paper-raised p-3 flex items-start gap-3">
                <div className="flex-1"><Link href={`/r/${t.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood">{t.name}</Link>
                  <p className="font-ui text-sm text-ink mt-1">{t.body}</p>
                  <p className="font-ui text-[12px] text-ink-soft">by {t.user_email}</p></div>
                <Btns approve={approveTip.bind(null, t.id as number)} reject={rejectTip.bind(null, t.id as number)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {photos.rows.length > 0 && (
        <section>
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-1">Photos ({photos.rows.length})</h2>
          <SectionNote>A visitor-uploaded photo. <span className="text-ink">Approve</span> to show it on the spot (approved photos lead the card + detail page).</SectionNote>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.rows.map((p) => (
              <div key={p.id} className="border border-rule bg-paper-raised">
                <div className="aspect-square overflow-hidden bg-paper-sunk">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={uploadUrl(p.filename)} alt="" className="w-full h-full object-cover" /></div>
                <div className="p-2">
                  <Link href={`/r/${p.slug}`} className="font-display font-semibold text-ink text-sm hover:text-oxblood block truncate">{p.name}</Link>
                  <p className="font-ui text-[12px] text-ink-soft truncate">{p.uploaded_by}</p>
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
