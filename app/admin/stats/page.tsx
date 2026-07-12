import Link from 'next/link';
import { auth } from '@/auth';
import StatTile from '@/components/StatTile';
import Help from '@/components/Help';
import {
  siteStats, siteStatsPrev, topSpots, subscribersBySource, pendingQueue, stampAudit,
  parseWin, WINDOWS, windowOf,
} from '@/lib/stats';

export const dynamic = 'force-dynamic';

// Phase 1 of the stats build: EVERY number on this page comes from data we already had. There is no
// tracking code behind it. place_signals and passport_stamp_events were complete, timestamped,
// place-tied event logs that nothing in the repo had ever read.
//
// What is deliberately absent: page views, menu views, and outbound link taps. They were never
// recorded, and they cannot be reconstructed with a restaurant attached. An estimated "view" sitting
// next to a real confirmed stamp would poison the real one, so those tiles do not exist yet rather
// than existing and lying.

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ win?: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }

  const win = parseWin((await searchParams).win);
  const [s, prev, movers, subs, queue, audit] = await Promise.all([
    siteStats(win), siteStatsPrev(win), topSpots(win), subscribersBySource(), pendingQueue(), stampAudit(),
  ]);
  const b = windowOf(win);
  const range = b.from ? `${fmtDate(b.from)} to ${fmtDate(b.to)}` : 'Everything we have ever recorded';
  const pendingTotal = queue.photos + queue.tips + queue.reviews + queue.claims + queue.events;
  const delta = (now: number, before?: number) => (prev && before !== undefined ? now - before : null);

  const verdicts = s.worthIt + s.itsFine + s.skipIt;

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-3xl text-ink">The Numbers</h1>
          <p className="font-ui text-sm text-ink-soft mt-1">{range}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {WINDOWS.map((w) => (
            <Link
              key={w.key}
              href={`/admin/stats?win=${w.key}`}
              className={`font-stamp uppercase tracking-[0.06em] text-xs px-3 py-1.5 rounded-sm border ${
                w.key === win ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {w.label}
            </Link>
          ))}
        </div>
      </div>

      {/* The honest disclaimer, at the top, not buried. */}
      <p className="font-ui text-xs text-ink-soft mt-4 mb-6 border-l-2 border-chile/50 pl-3 max-w-3xl leading-relaxed">
        Everything here is counted in our own database, from the day each thing started being recorded.
        Page views and outbound taps (phone, directions, website, order) are <strong>not here yet</strong>:
        nothing has ever recorded them, and they cannot be reconstructed. They arrive when the tracker
        ships. Nothing on this page is estimated.
      </p>

      {/* THE PASSPORT: the only place we can honestly claim we put a body in a dining room. */}
      <section className="border-2 border-ink bg-paper-raised p-5 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-stamp uppercase tracking-[0.14em] text-chile text-sm">The Local Passport</h2>
          <Help
            text="A pull is someone opening a stamp on their phone. A stamp at the counter is an owner confirming they served that person. The stamp is the only number that proves the guide put a real body in a real dining room, so it is the only one that ever goes in a sales email."
            example="4 pulls, 1 stamped means four people wanted the perk and one owner confirmed a walk-in."
          />
        </div>
        {s.pulls === 0 && s.stamped === 0 ? (
          <p className="font-hand text-2xl text-oxblood mt-2">
            Nothing to count yet. There are {s.perksLive === 0 ? 'no perks live' : `${s.perksLive} perks live`}, so nobody can pull a stamp.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <StatTile label="Stamps pulled" value={s.pulls} delta={delta(s.pulls, prev?.pulls)} href={`/admin/stats/pulls?win=${win}`} />
            <StatTile label="Distinct people" value={s.pullers} sub="one device, however many pulls" href={`/admin/stats/pulls?win=${win}`} />
            <StatTile label="Stamped at a counter" value={s.stamped} accent zeroText="none yet" delta={delta(s.stamped, prev?.stamped)} href={`/admin/stats/stamped?win=${win}`} />
            <StatTile label="Perks live" value={s.perksLive} sub={s.guidePerks > 0 ? `${s.guidePerks} from the Guide` : undefined} zeroText="none live" href={`/admin/stats/perks?win=${win}`} />
          </div>
        )}
        {audit.tokens > 0 && audit.pct >= 60 && (
          <p className="font-ui text-xs text-oxblood mt-3">
            ⚠ {audit.pct}% of stamp-pull devices have exactly one event ({audit.singleUse} of {audit.tokens}). That is the
            signature of a cookie-less crawler, not a person. Treat pull history before the robots fix as unverified,
            and keep it out of any sales conversation.
          </p>
        )}
      </section>

      {/* WHAT LOCALS SAID. Real, timestamped, full history, and nothing has ever displayed it. */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">What locals said</h2>
      <p className="font-ui text-xs text-ink-soft mb-3">
        One-tap signals from the spot pages. Full history: these have always been recorded, we had just never read them.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-8">
        <StatTile label="Worth it" value={s.worthIt} accent zeroText="none" href={`/admin/stats/worth-it?win=${win}`} />
        <StatTile label="It's fine" value={s.itsFine} zeroText="none" href={`/admin/stats/its-fine?win=${win}`} />
        <StatTile label="Skip it" value={s.skipIt} zeroText="none" href={`/admin/stats/skip-it?win=${win}`} />
        <StatTile label="Been here" value={s.beenHere} zeroText="none" href={`/admin/stats/been-here?win=${win}`} />
        <StatTile label="Want to go" value={s.wantToGo} zeroText="none" href={`/admin/stats/want-to-go?win=${win}`} />
        <StatTile
          label="Locals who tapped"
          value={s.tappers}
          delta={delta(s.tappers, prev?.tappers)}
          sub="devices, not people"
          zeroText="none"
          href={`/admin/stats/tappers?win=${win}`}
        />
      </div>

      {/* CONTRIBUTIONS + THE BUSINESS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">What locals gave us</h2>
          <p className="font-ui text-xs text-ink-soft mb-3">
            Contributions from real people, not from you. Anthony&apos;s own photos are counted separately below,
            because {s.photosFromAnthony} photos of your own is a well-stocked guide, not a community.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Reviews" value={s.reviews} accent zeroText="none" href={`/admin/stats/reviews?win=${win}`} />
            <StatTile label="Photos from locals" value={s.photosFromLocals} accent zeroText="none yet" href={`/admin/stats/photos-user?win=${win}`} />
            <StatTile label="Tips" value={s.tips} zeroText="none" href={`/admin/stats/tips?win=${win}`} />
            <StatTile label="Owner claims" value={s.claims} zeroText="none" href={`/admin/stats/claims?win=${win}`} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <StatTile
              label="Anthony's photos"
              value={s.photosFromAnthony}
              sub="yours, not theirs"
              zeroText="none"
              href={`/admin/stats/photos-anthony?win=${win}`}
            />
          </div>
          {pendingTotal > 0 && (
            <p className="font-ui text-sm text-ink-soft mt-3">
              <Link href="/admin/moderation" className="text-chile underline underline-offset-2">{pendingTotal} waiting on you</Link>
              {' '}({[queue.photos && `${queue.photos} photos`, queue.tips && `${queue.tips} tips`, queue.reviews && `${queue.reviews} reviews`, queue.claims && `${queue.claims} claims`, queue.events && `${queue.events} events`].filter(Boolean).join(', ')}).
            </p>
          )}
        </div>

        <div>
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-3">The business</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Verified owners" value={s.verifiedOwners} accent zeroText="none yet" href={`/admin/stats/claims?win=all`} />
            <StatTile label="Subscribers" value={s.confirmedSubs} sub={s.subscribers > s.confirmedSubs ? `${s.subscribers - s.confirmedSubs} unconfirmed` : undefined} zeroText="none" href={`/admin/stats/subscribers?win=${win}`} />
            <StatTile label="Spots added" value={s.spotsAdded} zeroText="none" href={`/admin/stats/spots?win=${win}`} />
            <StatTile label="Verdict votes" value={verdicts} zeroText="none" />
          </div>
        </div>
      </div>

      {/* THE SPOTS PEOPLE ACTUALLY ENGAGE WITH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">Most tapped spots</h2>
          <p className="font-ui text-xs text-ink-soft mb-3">
            By one-tap signals, because views do not exist yet. Admin only: never show a number this small to an owner.
          </p>
          {movers.length === 0 ? (
            <p className="font-hand text-2xl text-oxblood">Nobody tapped anything in this window.</p>
          ) : (
            <table className="w-full font-ui text-sm">
              <thead>
                <tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
                  <th className="py-2">Spot</th><th className="text-right">Taps</th><th className="text-right">Been</th><th className="text-right">Want to go</th>
                </tr>
              </thead>
              <tbody>
                {movers.map((m) => (
                  <tr key={m.slug} className="border-b border-rule/50">
                    <td className="py-2"><Link href={`/r/${m.slug}`} className="text-ink hover:text-chile">{m.name}</Link></td>
                    <td className="text-right font-semibold text-ink">{m.signals}</td>
                    <td className="text-right text-ink-soft">{m.beenHere}</td>
                    <td className="text-right text-ink-soft">{m.wantToGo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">Where subscribers came from</h2>
          <p className="font-ui text-xs text-ink-soft mb-3">
            A <code className="text-chile">spot:</code> source is a local who joined the list from that restaurant&apos;s page.
            Google can never tell an owner that.
          </p>
          {subs.length === 0 ? (
            <p className="font-hand text-2xl text-oxblood">No subscribers yet.</p>
          ) : (
            <table className="w-full font-ui text-sm">
              <thead>
                <tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
                  <th className="py-2">Source</th><th className="text-right">Signups</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((x) => (
                  <tr key={x.source} className="border-b border-rule/50">
                    <td className="py-2 text-ink">{x.source}</td>
                    <td className="text-right font-semibold text-ink">{x.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="font-ui text-xs text-ink-soft mt-10 border-t border-rule pt-4 max-w-3xl leading-relaxed">
        Next: the tracker (page views, menu views, and taps on phone / directions / website / order online),
        then the owner desk. Owners will never see a number that implies a visit we cannot prove: a tap on
        &ldquo;directions&rdquo; is not a customer, and we will not call it one.
      </p>
    </main>
  );
}
