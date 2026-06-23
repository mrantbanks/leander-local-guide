import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { updateReview, deletePhoto } from '@/app/actions';
import { auth } from '@/auth';
import PhotoUploader from '@/components/PhotoUploader';

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
  const action = updateReview.bind(null, slug);
  const field = 'w-full bg-paper-raised border border-rule px-3 py-2 font-ui text-ink rounded-[2px]';
  const label = 'block font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1 mt-4';

  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <Link href="/admin" className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile">← Newsroom</Link>
      <h1 className="font-display font-black text-3xl text-ink mt-3 mb-1">{r.name}</h1>
      <p className="font-ui text-sm text-ink-soft mb-4">Editing Anthony&apos;s take. Saves go live immediately. (No em dashes; they get stripped on save.)</p>
      <form action={action}>
        <label className={label}>Verdict</label>
        <select name="verdict" defaultValue={ed.verdict || 'WORTH IT'} className={field}>
          {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>

        <label className={label}>Hook (card teaser)</label>
        <input name="hook" defaultValue={ed.hook || ''} className={field} maxLength={140} />

        <label className={label}>Review</label>
        <textarea name="review" defaultValue={ed.review || ''} rows={10} className={field} />

        <label className={label}>What to order</label>
        <input name="whatToOrder" defaultValue={ed.whatToOrder || ''} className={field} />

        <label className={label}>Gotcha (heads-up, optional)</label>
        <input name="gotcha" defaultValue={ed.gotcha || ''} className={field} />

        <label className={label}>Happy Hour (times/details, optional)</label>
        <input name="happyHour" defaultValue={r.happy_hour || ''} className={field} />

        <label className="flex items-center gap-2 mt-4 font-ui text-sm text-ink">
          <input type="checkbox" name="visited" defaultChecked={!!ed.visited} />
          Anthony has actually been here
        </label>

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
                <img src={`/uploads/${p.filename}`} alt="" className="w-full h-full object-cover" />
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
    </main>
  );
}
