import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpotAny } from '@/lib/spots';
import { ownerGate } from '@/lib/owner';
import { getOwnerSpecials } from '@/lib/specials';
import { getEventsForSpot } from '@/lib/events';

export const dynamic = 'force-dynamic';

// The overview answers one question: is this working, and what should I do next. Nothing else.
export default async function OwnerOverview({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (!(await ownerGate(slug))) notFound();

  const spot = await getSpotAny(slug);
  if (!spot) notFound();
  const [perks, events] = await Promise.all([getOwnerSpecials(slug), getEventsForSpot(slug)]);

  const anyStats = spot.wantToGo + spot.worthIt + spot.beenHere > 0;

  // The honest to-do list. Each row is a thing they can actually go and do, and the ones already done
  // are ticked rather than hidden, so the desk feels like progress and not a nag.
  const todo = [
    { done: !!spot.hoursToday, label: 'Check your hours are right', href: `/owner/${slug}/details` },
    { done: !!spot.menuUrl, label: 'Add your menu link', href: `/owner/${slug}/details` },
    { done: !!spot.ownerBlurb, label: 'Say something in your own words', href: `/owner/${slug}/details` },
    { done: events.length > 0, label: "Put your trivia night on What's On", href: `/owner/${slug}/events` },
    { done: perks.length > 0, label: 'Offer a perk on the Local Passport', href: `/owner/${slug}/passport` },
  ];
  const left = todo.filter((t) => !t.done).length;

  return (
    <div>
      {sp.welcome && (
        <div className="border-2 border-dashed border-oxblood bg-paper-raised p-4 mb-5 -rotate-1">
          <p className="font-stamp uppercase tracking-[0.12em] text-chile text-xs">Claimed ✓</p>
          <p className="font-hand text-2xl text-ink mt-0.5">Welcome in. This is your place now.</p>
          <p className="font-ui text-sm text-ink-soft mt-1">Do one thing on the list below and watch it go live on your page.</p>
        </div>
      )}

      <h1 className="font-display font-black text-2xl text-ink mb-1">How you are doing</h1>
      <p className="font-ui text-sm text-ink-soft mb-6">
        Everything here is counted on the guide only. Most of your customers will find you elsewhere, and that is normal.
        This is the part we can actually prove.
      </p>

      {anyStats ? (
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { n: spot.wantToGo, label: 'want to try you', lead: true },
            { n: spot.worthIt, label: "say you're worth it" },
            { n: spot.beenHere, label: 'have been here' },
          ].map((s, i) => (
            <div key={i} className={`border rounded-sm p-3 text-center ${s.lead ? 'border-chile bg-paper-raised' : 'border-rule'}`}>
              <div className="font-display font-black text-3xl text-ink">{s.n}</div>
              <div className="font-ui text-sm text-ink-soft leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-ui text-sm text-ink-soft mb-8 bg-paper-raised border border-rule rounded-sm p-3">
          Nobody has tapped anything on your page yet. Numbers show up here as locals start weighing in.
        </p>
      )}

      {/* The to-do list. This is the real job of the overview. */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">
        {left === 0 ? 'Your page is in good shape' : `${left} thing${left === 1 ? '' : 's'} worth doing`}
      </h2>
      <p className="font-ui text-xs text-ink-soft mb-3">
        The spots people tap most are the ones with real hours, a menu link, something on the board, and a perk.
      </p>
      <ul className="border-t border-rule mb-8">
        {todo.map((t) => (
          <li key={t.label} className="border-b border-rule py-2.5 flex items-center gap-3">
            <span className={`font-stamp text-sm shrink-0 ${t.done ? 'text-chile' : 'text-ink-soft/40'}`}>
              {t.done ? '✓' : '□'}
            </span>
            {t.done ? (
              <span className="font-ui text-sm text-ink-soft line-through">{t.label}</span>
            ) : (
              <Link href={t.href} className="font-ui text-sm text-ink hover:text-chile underline underline-offset-2">{t.label}</Link>
            )}
          </li>
        ))}
      </ul>

      <div className="border-2 border-ink bg-paper-raised p-4">
        <p className="font-stamp uppercase tracking-[0.1em] text-xs text-chile mb-1">What locals actually see</p>
        <p className="font-ui text-sm text-ink-soft mb-3">
          Your page is live right now. Everything you change here shows up on it within about a minute.
        </p>
        <Link
          href={`/r/${slug}`}
          target="_blank"
          className="inline-block font-stamp uppercase tracking-[0.08em] text-xs bg-chile text-paper px-4 py-2 rounded-sm hover:bg-oxblood"
        >
          Open your live page →
        </Link>
      </div>

      <p className="font-ui text-xs text-ink-soft mt-8 border-t border-rule pt-4">
        The review, the verdict, and the &ldquo;worth it&rdquo; tally are Anthony&apos;s and the public&apos;s. You cannot edit those,
        and that is the point: your page stays credible, so being on it means something.
      </p>
    </div>
  );
}
