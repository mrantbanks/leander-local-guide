import Link from 'next/link';
import { auth, signIn } from '@/auth';
import { getSpot, isVerifiedOwner } from '@/lib/spots';
import { getOwnerContent } from '@/lib/owner';
import { getOwnerSpecials, scheduleLabel } from '@/lib/specials';
import { removeSpecialAction } from '@/app/actions';
import OwnerEditor from '@/components/OwnerEditor';
import LocalsOnlyStudio from '@/components/LocalsOnlyStudio';
import Help from '@/components/Help';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner desk', robots: { index: false } };

export default async function OwnerDash({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5">
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: `/owner/${slug}` }); }} className="text-center">
          <h1 className="font-display font-black text-2xl text-ink mb-3">Sign in to manage your listing</h1>
          <button className="font-stamp uppercase tracking-[0.1em] text-sm bg-ink text-paper px-6 py-3 rounded-sm">Sign in with Google</button>
        </form>
      </main>
    );
  }
  if (!(await isVerifiedOwner(slug, email))) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5 text-center">
        <div>
          <h1 className="font-display font-black text-2xl text-ink">This isn&apos;t your listing yet.</h1>
          <p className="font-ui text-sm text-ink-soft mt-2">Signed in as {email}. If you own this spot, claim it with the code on your printed sheet at <Link href="/claim" className="text-chile underline">/claim</Link>.</p>
        </div>
      </main>
    );
  }

  const spot = await getSpot(slug);
  if (!spot) return <main className="p-10 text-center font-ui">Listing not found.</main>;
  const { ownerContent, googleWeek } = await getOwnerContent(slug);
  const specials = await getOwnerSpecials(slug);

  const stats = [
    { n: spot.wantToGo, label: 'want to try you', lead: true },
    { n: spot.worthIt, label: 'say you&apos;re worth it' },
    { n: spot.beenHere, label: 'have been here' },
  ];
  const anyStats = spot.wantToGo + spot.worthIt + spot.beenHere > 0;

  return (
    <main className="max-w-2xl mx-auto px-5 py-6 pb-24">
      {/* header */}
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-3 mb-5">
        <div>
          <p className="font-stamp uppercase tracking-[0.18em] text-chile text-sm">Owner desk</p>
          <h1 className="font-display font-black text-2xl text-ink leading-tight">{spot.name}</h1>
        </div>
        <Link href={`/r/${slug}`} target="_blank" className="font-stamp uppercase tracking-[0.08em] text-xs text-chile hover:text-oxblood shrink-0">View live page →</Link>
      </div>

      {sp.welcome && (
        <div className="border-2 border-dashed border-oxblood bg-paper-raised p-4 mb-5 -rotate-1">
          <p className="font-stamp uppercase tracking-[0.12em] text-chile text-xs">Claimed ✓</p>
          <p className="font-hand text-2xl text-ink mt-0.5">Welcome in. This is your place now.</p>
          <p className="font-ui text-sm text-ink-soft mt-1">Do one thing below, see it go live. Fix your hours, add a note, drop your menu link. Takes a minute.</p>
        </div>
      )}

      {/* stats — positive only, never "skip it" */}
      {anyStats ? (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {stats.map((s, i) => (
            <div key={i} className={`border rounded-sm p-3 text-center ${s.lead ? 'border-chile bg-paper-raised' : 'border-rule'}`}>
              <div className="font-display font-black text-3xl text-ink">{s.n}</div>
              <div className="font-ui text-sm text-ink-soft leading-tight mt-0.5" dangerouslySetInnerHTML={{ __html: s.label }} />
            </div>
          ))}
        </div>
      ) : (
        <p className="font-ui text-sm text-ink-soft mb-6 bg-paper-raised border border-rule rounded-sm p-3">Once locals start tapping on your page, your numbers show up here. Add a special or a note to get the ball rolling.</p>
      )}

      {/* the editable card stack */}
      <OwnerEditor
        slug={slug}
        googleWeek={googleWeek}
        initial={{
          phone: spot.phone || '', website: spot.website || '', menuUrl: spot.menuUrl || '', orderUrl: spot.orderUrl || '',
          happyHour: spot.happyHour || '', blurb: spot.ownerBlurb || '', hours: ownerContent.hours || null,
        }}
      />

      {/* The Local Passport — owner-posted perks */}
      <section className="mt-8 border-t-2 border-ink pt-5">
        <div className="flex items-center gap-2 mb-1">
          <img src="/locals-only.webp" alt="" width={28} height={28} className="w-7 h-7" />
          <h2 className="font-stamp uppercase tracking-[0.14em] text-ink text-base">Local Passport</h2>
          <Help text="A standing perk you offer to people who found you through the guide. It shows on your page under the Local Passport, and diners pull up a printable stamp to show at the counter. Honor system — you decide what to give." example="Free churro with any plate. Or $2 tacos on Tuesdays." />
        </div>
        <p className="font-ui text-sm text-ink-soft mb-4">Add a perk to the Passport — your call what it is. Locals pull up a stamp to show you at the counter. Post as many as you like.</p>
        <LocalsOnlyStudio slug={slug} restaurant={spot.name} />
        {specials.length > 0 && (
          <ul className="mt-5 space-y-2">
            {specials.map((s) => (
              <li key={s.id} className="bg-paper-raised border border-rule rounded-sm p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink truncate">{s.title}</p>
                  <p className="font-stamp uppercase tracking-[0.06em] text-sm text-chile">{scheduleLabel(s)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/ticket/${s.id}`} target="_blank" className="font-stamp uppercase tracking-[0.06em] text-xs text-chile">Stamp →</Link>
                  <form action={async () => { 'use server'; await removeSpecialAction(s.id); }}><button className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-oxblood">End it</button></form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* the trust line */}
      <p className="font-ui text-xs text-ink-soft mt-8 border-t border-rule pt-4">
        The review, the verdict, and the &ldquo;worth it&rdquo; tally are Anthony&apos;s and the public&apos;s — you can&apos;t edit those, and that&apos;s the point: your page stays credible.
      </p>
    </main>
  );
}
