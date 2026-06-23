import PageHero from '@/components/PageHero';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'About, The Leander Local Guide',
  description:
    'A guide to Leander, Texas and its local food scene. By a local, for locals. The hidden gems, the bar where everybody knows your name, the one dish worth the drive.',
};

const CONTACT_EMAIL = 'anthony@leanderlocalguide.com'; // TODO: confirm Anthony's real contact

export default function AboutPage() {
  return (
    <main>
      <PageHero eyebrow="What this is" title="The Leander Local Guide" subtitle="A guide to Leander, Texas. By a local, for locals." />

      <article className="max-w-2xl mx-auto px-5 py-12 font-display text-[1.1875rem] leading-[1.7] text-ink space-y-6">
        <p>
          <span className="float-left font-display font-black text-7xl leading-[0.7] pr-3 pt-1 text-chile">T</span>
          his is a guide to Leander, Texas. Not Austin, not Cedar Park, not &quot;the greater area.&quot;
          Leander. Its taco trucks and its bakeries, its dive bars and its family kitchens, the food
          scene the chains keep trying to bury and the locals keep keeping alive. I built it for the
          people who live here, the ones who want to know where to actually eat tonight, not where
          some algorithm in California thinks they should.
        </p>
        <p>
          It is a map to the good stuff. The hidden gems you would drive right past if nobody told you
          to stop. The neighborhood bar where they know your name and your order before you sit down.
          The one dish, at the one place, that is worth rearranging your week for. Skip the chains.
          Find the spots that make Leander worth staying in.
        </p>

        <p className="font-hand text-3xl text-oxblood leading-snug !my-8">
          Skip the chains. Chase the real stuff.
        </p>

        <h2 className="font-stamp uppercase tracking-[0.15em] text-chile text-sm !mt-12 !mb-2">Your guide</h2>
        <p>
          I&apos;m Anthony Martinez, and I live here. By day I&apos;m a site reliability engineer and incident
          commander at eBay, the calm voice on the call when a global marketplace is on fire and a few
          million transactions are hanging in the balance. By night I point that same relentless,
          almost unreasonably systematic obsession at a tastier problem: finding every great place to
          eat in Leander and telling you the truth about it.
        </p>
        <p>
          I review a taco joint the way I&apos;d run a Sev&nbsp;1: methodically, honestly, and with zero
          patience for anything that wastes your time. From desi land, Leander&apos;s surprising, glorious
          run of Indian kitchens, to the gravel-lot food trucks where the best meals in the city
          happen to be parked, I&apos;ve eaten it, ranked it, and I remember exactly where to send you.
        </p>

        {/* Food-tour CTA */}
        <div className="!mt-12 border-2 border-dashed border-oxblood bg-paper-raised p-7 -rotate-1">
          <p className="font-stamp uppercase tracking-[0.15em] text-chile text-sm mb-2">Admit one · The good stuff</p>
          <h2 className="font-display font-black text-3xl text-ink">Come eat with me</h2>
          <p className="mt-3 font-ui text-[15px] leading-relaxed text-ink-soft">
            Want the insider route? I host personalized Leander food tours. Tell me what you&apos;re into
            and I&apos;ll build the crawl, from desi land to the trucks to that bar where everybody knows
            your name. New in town, visiting, or just tired of the same three places: this is your
            shortcut to the real Leander.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Leander%20Food%20Tour`}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 font-stamp uppercase tracking-[0.1em] text-base bg-chile text-paper hover:bg-oxblood transition-colors"
          >
            🍴 Book a personalized food tour
          </a>
        </div>

        <p className="!mt-10 pt-6 font-ui text-xs text-ink-soft leading-relaxed border-t border-rule">
          My reviews are my honest opinion, one local who actually goes. No pay-to-play, the rankings
          are not for sale. Just the good eats, honestly called.
        </p>
      </article>

      <SiteFooter />
    </main>
  );
}
