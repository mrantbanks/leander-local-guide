import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { updateReview, deletePhoto, addEvent, deleteEvent } from '@/app/actions';
import { EVENT_LABELS } from '@/lib/events';
import { auth } from '@/auth';
import PhotoUploader from '@/components/PhotoUploader';
import ReviewComposer from '@/components/ReviewComposer';
import { uploadUrl } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

const VERDICTS = ['WORTH THE GRAVEL', 'WORTH IT', "IT'S FINE", 'SKIP IT'];

export default async function AdminEdit({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) redirect('/admin');
  const { slug } = await params;
  const { rows } = await pool.query('select slug, name, editorial, happy_hour from restaurants where slug = $1', [slug]);
  const r = rows[0];
  if (!r) notFound();
  const ed = r.editorial || {};
  const ph = await pool.query('select id, filename from photos where place_id = (select id from restaurants where slug = $1) order by sort, created_at', [slug]);
  const ev = await pool.query('select id, event_type, title, freq, days_of_week, start_time, status from events where place_id = (select id from restaurants where slug = $1) order by event_type', [slug]);
  const action = updateReview.bind(null, slug);
  const field = 'w-full bg-paper-raised border border-rule px-3 py-2 font-ui text-ink rounded-[2px]';
  const label = 'block font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1 mt-4';

  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <Link href="/admin" className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile">← Newsroom</Link>
      <h1 className="font-display font-black text-3xl text-ink mt-3 mb-1">{r.name}</h1>
      <p className="font-ui text-sm text-ink-soft mb-2">Editing Anthony&apos;s take. Saves go live immediately. (No em dashes; they get stripped on save.)</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <a href={`/admin/r/${slug}/packet`} target="_blank" rel="noopener" className="inline-block font-stamp uppercase tracking-[0.08em] text-xs bg-chile text-paper px-3 py-1.5 rounded-sm hover:bg-oxblood">🖨 Print packet (claim + guide) →</a>
        <span className="font-ui text-xs text-ink-soft">or just one:</span>
        <a href={`/admin/r/${slug}/print`} target="_blank" rel="noopener" className="inline-block font-stamp uppercase tracking-[0.08em] text-xs border border-ink text-ink px-3 py-1.5 rounded-sm hover:bg-ink hover:text-paper">Claim sheet</a>
        <a href={`/admin/r/${slug}/guide`} target="_blank" rel="noopener" className="inline-block font-stamp uppercase tracking-[0.08em] text-xs border border-ink text-ink px-3 py-1.5 rounded-sm hover:bg-ink hover:text-paper">Owner guide</a>
        <Link href={`/admin/r/${slug}/photos`} className="inline-block font-stamp uppercase tracking-[0.08em] text-xs border border-chile text-chile px-3 py-1.5 rounded-sm hover:bg-chile hover:text-paper">🖼 Photo editor →</Link>
      </div>
      <ReviewComposer slug={slug} />

      <form action={action}>
        <label className={label}>Verdict</label>
        <select name="verdict" defaultValue={ed.verdict || 'WORTH IT'} className={field}>
          {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <label className={label}>Hook (card teaser)</label>
        <input name="hook" defaultValue={ed.hook || ''} className={field} maxLength={140} />

        <label className={label}>Review (summary of reviews until you visit; your real take after)</label>
        <textarea name="review" defaultValue={ed.review || ''} rows={10} className={field} />

        <label className={label}>Summary disclosure note (honest &quot;haven&apos;t been yet&quot; line; shown until visited)</label>
        <input name="summaryNote" defaultValue={ed.summaryNote || ''} className={field} placeholder="e.g. Haven't planted my flag here yet, this is the word from the reviews." />

        <label className={label}>&quot;Can&apos;t wait&quot; closer (shown until visited)</label>
        <input name="cantWait" defaultValue={ed.cantWait || ''} className={field} placeholder="e.g. This one's circled on my map and the map is hungry." />

        <label className={label}>What to order</label>
        <input name="whatToOrder" defaultValue={ed.whatToOrder || ''} className={field} />

        <label className={label}>Gotcha (heads-up, optional)</label>
        <input name="gotcha" defaultValue={ed.gotcha || ''} className={field} />

        <label className={label}>Happy Hour (times/details, optional)</label>
        <input name="happyHour" defaultValue={r.happy_hour || ''} className={field} />

        <label className={label}>Pinned badges (comma-separated, e.g. Hidden Gem, Local Favorite)</label>
        <input name="badges" defaultValue={(ed.badges || []).join(', ')} className={field} />
        <p className="font-ui text-xs text-ink-soft mt-1">Hidden Gem / Local Favorite are auto-applied to top-rated local spots; use this to pin them manually.</p>

        <label className={label}>Opening status (shows on the &quot;New in Leander&quot; wire)</label>
        <select name="openingStatus" defaultValue={ed.openingStatus || ''} className={field}>
          <option value="">— none —</option>
          <option value="now_open">🎉 Now Open</option>
          <option value="coming_soon">🔜 Coming Soon</option>
          <option value="closed">🪦 Recently Closed</option>
        </select>
        <input name="openingNote" defaultValue={ed.openingNote || ''} placeholder="One-line note for the New wire (Anthony's voice)" className={field} />

        <label className="flex items-center gap-2 mt-4 font-ui text-sm text-ink">
          <input type="checkbox" name="visited" defaultChecked={!!ed.visited} />
          I&apos;ve actually been here (flips the page to my real verdict + the visit date below)
        </label>
        <label className={label}>Date visited</label>
        <input name="visitedDate" type="date" defaultValue={ed.visitedDate || ''} className={field} />

        <button type="submit" className="mt-6 font-stamp uppercase tracking-[0.12em] text-base bg-chile text-paper px-6 py-2.5 hover:bg-oxblood transition-colors">
          Save
        </button>
      </form>

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-3">Photos</h2>
        {ph.rows.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {ph.rows.map((p) => (
              <div key={p.id} className="relative w-28 h-28 border border-rule overflow-hidden bg-paper-sunk">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadUrl(p.filename)} alt="" className="w-full h-full object-cover" />
                <form action={deletePhoto.bind(null, p.id as number, slug)}>
                  <button className="absolute top-0 right-0 bg-oxblood/85 text-paper text-xs px-1.5 py-0.5" title="Delete">×</button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-ui text-sm text-ink-soft">No photos yet.</p>
        )}
        <PhotoUploader slug={slug} />
      </section>

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-3">Events</h2>
        {ev.rows.length > 0 && (
          <ul className="mb-4 space-y-1">
            {ev.rows.map((e) => (
              <li key={e.id} className="flex items-center justify-between font-ui text-sm border-b border-rule/50 py-1">
                <span>{EVENT_LABELS[e.event_type] || e.event_type}: {e.title}{' '}
                  <span className="text-ink-soft text-xs">({e.freq}{e.days_of_week ? ' ' + (e.days_of_week as number[]).join(',') : ''}{e.start_time ? ' ' + e.start_time.slice(0, 5) : ''})</span>
                  {e.status !== 'approved' && <span className="text-oxblood text-xs"> · {e.status}</span>}
                </span>
                <form action={deleteEvent.bind(null, e.id as number, slug)}><button className="text-oxblood text-xs font-stamp uppercase tracking-[0.08em]">delete</button></form>
              </li>
            ))}
          </ul>
        )}
        <form action={addEvent.bind(null, slug)} className="space-y-2 bg-paper-raised border border-rule p-3">
          <div className="flex flex-wrap gap-2">
            <select name="event_type" className={`${field} !w-auto`}>{Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select name="freq" defaultValue="weekly" className={`${field} !w-auto`}>
              <option value="weekly">Weekly</option><option value="monthly_dow">Monthly</option><option value="once">One-off</option>
            </select>
            <input name="start_time" type="time" className={`${field} !w-auto`} />
          </div>
          <div className="flex flex-wrap gap-3 font-ui text-xs text-ink">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
              <label key={d} className="flex items-center gap-1"><input type="checkbox" name="dow" value={i + 1} />{d}</label>
            ))}
          </div>
          <input name="title" placeholder="Title (e.g. Geeks Who Drink Trivia)" className={field} />
          <input name="description" placeholder="Description (optional)" className={field} />
          <button className="font-stamp uppercase tracking-[0.1em] text-sm bg-ink text-paper px-4 py-2 hover:bg-chile transition-colors">Add event</button>
        </form>
      </section>
    </main>
  );
}
