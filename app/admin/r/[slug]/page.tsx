import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { updateReview, addEventAction, deleteEvent } from '@/app/actions';
import { EVENT_LABELS } from '@/lib/events';
import { HIDDEN_GEM } from '@/lib/spots';
import { auth } from '@/auth';
import PhotoStudio from '@/components/PhotoStudio';
import MenuStudio from '@/components/MenuStudio';
import ReviewComposer from '@/components/ReviewComposer';
import TagPicker from '@/components/TagPicker';
import EventComposer from '@/components/EventComposer';
import type { EventInput } from '@/lib/eventInput';
import { AMENITY_TAGS, MEAL_TAGS, FACILITY_TAGS, CATEGORIES, computedTags, ownershipOf } from '@/lib/tags';

export const dynamic = 'force-dynamic';

const VERDICTS = ['WORTH THE GRAVEL', 'WORTH IT', "IT'S FINE", 'SKIP IT'];

export default async function AdminEdit({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) redirect('/admin');
  const { slug } = await params;
  // primary_category was missing from this list, and it silently corrupted data on every save:
  // r.primary_category came back undefined, so <select defaultValue={undefined}> fell through to its
  // first <option> ("Restaurant"), and updateReview then wrote that back. Editing ANYTHING on a food
  // truck, cafe or bakery quietly turned it into a Restaurant.
  const { rows } = await pool.query(
    `select slug, name, primary_category, editorial, happy_hour, attributes, ratings, owner_content, hidden, menu,
            photos->0->>'name' google_photo, ${HIDDEN_GEM}
       from restaurants where slug = $1`,
    [slug]
  );
  const r = rows[0];
  if (!r) notFound();
  const ed = r.editorial || {};
  const attr = r.attributes || {};
  const oc = r.owner_content || {};
  const ph = await pool.query('select id, filename, caption, is_menu, is_header from photos where place_id = (select id from restaurants where slug = $1) order by sort, created_at', [slug]);
  const ev = await pool.query('select id, event_type, title, freq, days_of_week, start_time, status from events where place_id = (select id from restaurants where slug = $1) order by event_type', [slug]);
  const action = updateReview.bind(null, slug);
  async function addForSpot(input: EventInput) {
    'use server';
    return addEventAction(slug, input);
  }
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
        <label className={`flex items-center gap-2 border-2 rounded-sm px-3 py-2.5 mb-1 cursor-pointer ${r.hidden ? 'border-oxblood bg-oxblood/5' : 'border-rule'}`}>
          <input type="checkbox" name="hidden" defaultChecked={!!r.hidden} className="w-4 h-4" />
          <span className="font-stamp uppercase tracking-[0.08em] text-xs text-ink">Hide this listing</span>
          <span className="font-ui text-xs text-ink-soft">— closed or gone for good. Removes it from the whole public site. For a spot that just hasn&apos;t opened yet, DON&apos;T hide it; set Opening status to Coming Soon below and it shows with a Coming Soon stamp.</span>
        </label>
        {r.hidden ? <p className="font-ui text-xs text-oxblood mb-2">This listing is currently hidden from the site.</p> : null}

        <label className={label}>Category (venue type — drives the Food Truck filter, map pin, icons &amp; boards)</label>
        <select name="category" defaultValue={r.primary_category} className={field}>
          {[...new Set([r.primary_category as string, ...CATEGORIES])].filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="font-ui text-xs text-ink-soft mt-1">Set this to <strong>Food Truck</strong> to tag a trailer/stand. The spot keeps its cuisine; it just shows under the Food Truck filter and the 🚚 boards.</p>

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

        <label className={label}>Menu link {oc.menuUrl ? <span className="text-chile lowercase tracking-normal">· owner set their own (live)</span> : null}</label>
        <input name="menuUrl" defaultValue={attr.menuUrl || ''} className={field} placeholder="https://..." />
        {oc.menuUrl ? <p className="font-ui text-xs text-ink-soft mt-1">Owner&apos;s link shows on the site: <span className="break-all">{oc.menuUrl}</span>. Yours is the fallback if they clear theirs.</p> : null}

        <label className={label}>Order online link {oc.orderUrl ? <span className="text-chile lowercase tracking-normal">· owner set their own (live)</span> : null}</label>
        <input name="orderUrl" defaultValue={attr.orderUrl || ''} className={field} placeholder="https://..." />
        {oc.orderUrl ? <p className="font-ui text-xs text-ink-soft mt-1">Owner&apos;s link shows on the site: <span className="break-all">{oc.orderUrl}</span>. Yours is the fallback if they clear theirs.</p> : null}

        <label className={label}>Tags on the page</label>
        <TagPicker
          amenities={AMENITY_TAGS.map(([k]) => k).filter((k) => !!attr[k])}
          meals={MEAL_TAGS.map(([k]) => k).filter((k) => !!attr[k])}
          facilities={FACILITY_TAGS.map(([k]) => k).filter((k) => !!attr[k])}
          badges={Array.isArray(ed.badges) ? ed.badges : []}
          chainStatus={ownershipOf(attr.chainStatus, attr.chainTier) || 'unknown'}
          computed={computedTags({
            isHiddenGem: !!r.is_hidden_gem,
            chainStatus: attr.chainStatus,
            ratingGoogle: r.ratings?.google?.rating ?? null,
            ratingCount: r.ratings?.google?.count ?? null,
            comingSoon: ed.openingStatus === 'coming_soon',
          })}
        />
        <p className="font-ui text-xs text-ink-soft mt-1">Hidden Gem / Local Favorite are auto-applied to top-rated local spots; use this to pin them manually.</p>

        <label className={label}>Opening status (Coming Soon = visible with a COMING SOON stamp + badge; also feeds the &quot;New in Leander&quot; wire)</label>
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
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">Photos</h2>
        <p className="font-ui text-xs text-ink-soft mb-3">Hover a photo: <b>Edit</b> opens crop / rotate / color / AI magic-edit · <b>📋</b> marks it as a menu · <b>★</b> makes it the header · drag to reorder.</p>
        <PhotoStudio slug={slug} googlePhoto={r.google_photo} initial={ph.rows.map((p) => ({ id: p.id, filename: p.filename, caption: p.caption, isMenu: p.is_menu, isHeader: p.is_header }))} />
      </section>

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">The Menu page (SEO)</h2>
        <MenuStudio slug={slug} initial={(r.menu && Array.isArray(r.menu.sections) && r.menu.sections.length) ? r.menu : null} menuPhotoCount={ph.rows.filter((p) => p.is_menu).length} />
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
        {/* Same composer the owner uses, so an event Anthony adds on a visit and one the owner adds
            are the same record, made the same way, with the same live preview. */}
        <EventComposer spotName={r.name as string} onCreate={addForSpot} />
      </section>
    </main>
  );
}
