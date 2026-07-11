import Link from 'next/link';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

type Item = { done?: boolean; t: string; note?: string };
const Section = ({ title, blurb, items }: { title: string; blurb?: string; items: Item[] }) => (
  <section className="mb-8">
    <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">{title}</h2>
    {blurb && <p className="font-ui text-xs text-ink-soft mb-3 max-w-2xl leading-relaxed">{blurb}</p>}
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 font-ui text-sm">
          <span className={`mt-0.5 shrink-0 w-4 h-4 border ${it.done ? 'bg-amber border-amber text-ink text-sm text-center leading-4' : 'border-rule'}`}>{it.done ? '✓' : ''}</span>
          <span className={it.done ? 'text-ink-soft line-through' : 'text-ink'}>{it.t}{it.note && <span className="block text-ink-soft text-xs no-underline">{it.note}</span>}</span>
        </li>
      ))}
    </ul>
  </section>
);

export default async function GrowthPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">Growth Playbook</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-6 max-w-2xl leading-relaxed">
        The product is built. The job now is <span className="text-ink font-semibold">distribution + trust</span>, not more features. This is the plan a committee converged on. Work it top to bottom.
      </p>

      <div className="border-2 border-chile bg-paper-raised p-4 mb-8">
        <p className="font-stamp uppercase tracking-[0.12em] text-chile text-xs mb-1">The one goal right now</p>
        <p className="font-display font-bold text-xl text-ink leading-snug">Get 10 real Leander locals to use the site this week, and see if any come back next week.</p>
        <p className="font-ui text-xs text-ink-soft mt-2">That single signal — do real humans return? — decides what to build next. Everything below serves it. (Leander is the fastest-growing city in the US: a firehose of new movers who don&apos;t know where to eat. The audience is there.)</p>
      </div>

      <Section title="Launch / distribution — do now" blurb="Hyperlocal traffic comes from Facebook community groups first, SEO second. The leaderboards + new-openings are your most shareable assets — lead with those, value-first, not link dumps."
        items={[
          { done: true, t: 'Kill the 2-month sitemap slow-roll (full sitemap is live).' },
          { t: 'Submit the sitemap in Google Search Console + Bing Webmaster; request indexing on the top ~30 pages (home, /best/*, /whats-on, top spots).' },
          { t: 'Post the leaderboards into Leander Facebook community groups (value-first, ~2×/week):', note: 'Keep Leander Connected · Bryson · Travisso · Santa Rita Ranch · Bar W Ranch · Crystal Falls · Palmera Ridge · Deerbrooke · Pecan Creek · Summerlyn. Answer "where\'s good [X]?" with Anthony\'s verdict + a soft link.' },
          { t: 'Share "New in Leander" openings as they happen — the most-forwarded hyperlocal content there is.' },
          { t: 'Claim a Nextdoor business page (don\'t spam it — anti-self-promo).' },
          { t: 'Turn on email capture everywhere; send the weekly "What\'s On" digest once the list passes ~300.' },
          { t: 'Ask 3 real local friends to find a place to eat using the site, and tell you where it failed them.' },
        ]} />

      <Section title="Later (once there's traffic)" items={[
        { t: '"New to Leander? Start here" page → hand to realtors + community lifestyle directors (every master-planned community has one).' },
        { t: 'Short-form video (Reels/TikTok) — "ranking every taco in Leander" — only if Anthony has a face/voice for it, 3×/week.' },
        { t: 'Weekly email digest send (new openings + this week\'s events + one fresh verdict).' },
      ]} />

      <Section title="Don't waste time on" items={[
        { t: 'r/Leander (too small, mods dislike self-promo) and heavy Nextdoor investment.' },
        { t: 'Paid Google/Meta ads before the return-visit loop is proven.' },
        { t: 'Fighting Yelp/TripAdvisor for "restaurants in Leander" — win the long tail ("best tacos / happy hour / new restaurants in Leander") instead.' },
      ]} />

      <Section title="Money — later, when there's an audience" blurb="Monetize visibility + tools, never the rankings."
        items={[
          { t: 'Food tours (Anthony\'s own) — highest near-term, not traffic-dependent. Add a "Book a tour" CTA + a booking link (Peek/FareHarbor/Cal.com).' },
          { t: 'One clearly-labeled local sponsor of the guide/newsletter ("Presented by …").' },
          { t: 'Claimed-listing subscription (~$29/mo): venue dashboard + extra media + review responses. Never touches ranking. The compounding engine.' },
        ]} />

      <Section title="Hardening gates (before a real traffic push)" blurb="Tracked separately so growth doesn't break things."
        items={[
          { done: true, t: 'Close the updateReview auth hole (was an open content-takeover bug).' },
          { t: 'Cache Google Place photos so /img doesn\'t bill the Places API on every request.' },
          { t: 'Logical pg_dump backups + a schema.sql in the repo (current raw-volume backup restores corrupt).' },
          { t: 'Real Cloudflare Turnstile keys (test keys = no bot protection). NEEDS OWNER: create a Managed widget.' },
          { t: 'Restore strict TLS (install the vaulted origin cert; flip Cloudflare to Full-Strict).' },
          { t: 'Per-user write rate limits + EXIF-strip on uploads + worker claim-locking.' },
        ]} />

      <p className="font-ui text-xs text-ink-soft border-t border-rule pt-4">Resolved: every spot reads as an honest summary of local diner reviews (not a personal visit) until Anthony actually goes, marks it visited in the editor, and posts his own first-person take.</p>
    </main>
  );
}
