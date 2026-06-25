import PageHero from '@/components/PageHero';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'About Anthony Martinez',
  description:
    'Anthony Martinez lives in Leander, Texas with three kids, a dog, and a permanent appetite. The mission: eat at every restaurant in town and keep the most complete, honest, up-to-date guide to Leander food.',
  alternates: { canonical: '/about' },
};

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
          I&apos;m Anthony Martinez, and I live right here in Leander. I&apos;m not a chef. I&apos;m not a critic
          parachuted in from some glossy magazine to sneer at your taco truck. I&apos;m a guy with three
          kids, a dog who is convinced every drive-thru was built for him, a stomach that is always
          about three minutes from a decision, and a stubborn, full-body belief that this town eats
          far better than anyone gives it credit for.
        </p>
        <p>
          So here is the mission, and yeah, it is a little unhinged: eat at every single place in
          Leander. All of them. The strip-mall pho, the gravel-lot brisket, the bakery only the
          school-pickup crowd knows about, the bar where the queso is somehow the whole point. Try
          everything once, go back to what is worth going back to, and keep the most complete, most
          honest, most up-to-date map of Leander food anybody has bothered to make.
        </p>
        <p>
          I love the first bite of something new almost as much as the tenth bite of something I
          already know is great. That is the entire job. New things, and the best things, on repeat.
          If a place earns it, I&apos;ll send you straight there. If it doesn&apos;t, I&apos;ll save you the trip.
        </p>
        <p className="!mt-2">
          <a href="https://www.linkedin.com/in/anthony-m-493b2691/" target="_blank" rel="noopener noreferrer" className="font-stamp uppercase tracking-[0.1em] text-xs text-chile hover:text-oxblood">Anthony on LinkedIn →</a>
          <span className="font-ui text-xs text-ink-soft"> · a real Leander local, not a faceless brand.</span>
        </p>
        <p className="!mt-6 font-ui text-sm text-ink-soft leading-relaxed">
          And since that dog isn&apos;t the only one who ends up in a drive-thru: some friends over in the Austin
          metro keep a <a href="https://austinweightlosstoday.com/tools/fast-food-finder" target="_blank" rel="noopener" className="text-chile underline underline-offset-2 hover:text-oxblood">Texas Fast Food Survival Guide</a> for
          the nights the drive-thru wins, the smarter picks at the chains we all end up at anyway.
        </p>

        <p className="!mt-12 pt-6 font-ui text-xs text-ink-soft leading-relaxed border-t border-rule">
          My reviews are my honest opinion, one local who actually goes. No pay-to-play, the rankings
          are not for sale. Just the good eats, honestly called.
        </p>
      </article>

      <SiteFooter />
    </main>
  );
}
