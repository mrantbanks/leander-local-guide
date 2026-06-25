import Subscribe from '@/components/Subscribe';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get the Leander Local digest',
  description: 'One email a week: new openings, the events worth leaving the couch for, and what Leander diners are actually saying. Plus a starter guide on where to eat first.',
  alternates: { canonical: '/subscribe' },
};

export default function SubscribePage() {
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-6">
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">The list · Leander, TX</p>
          <h1 className="font-display font-black text-ink leading-[0.9] tracking-[-0.03em]" style={{ fontSize: 'clamp(2.25rem, 7vw, 4.5rem)' }}>Where to eat in Leander. Settled.</h1>
          <p className="mt-3 font-ui text-ink-soft max-w-xl leading-relaxed">New spots, the events actually worth leaving the couch for, and what your neighbors are quietly raving about. I do the eating and the asking. You just show up hungry.</p>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Subscribe source="subscribe-page" siteKey={siteKey}
          headline="Just moved to Leander? Stop eating by the highway."
          sub="Drop your email and you'll get my honest starter map of where a local actually goes, then one short note a week so you're never stuck on where to go again."
          cta="Get my starter guide" />
        <ul className="mt-8 font-ui text-sm text-ink-soft space-y-2">
          <li>📨 One email a week, the new and the genuinely good.</li>
          <li>🤝 No pay-to-play, no selling your name, one-click unsubscribe.</li>
          <li>🌮 Built by a local who is eating his way through the whole town.</li>
        </ul>
      </div>
      <SiteFooter />
    </main>
  );
}
