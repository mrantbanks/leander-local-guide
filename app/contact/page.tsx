import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Contact',
  description: 'Reach Anthony Martinez at The Leander Local Guide: corrections, tips, listing claims, and business inquiries.',
  alternates: { canonical: '/contact' },
};

const EMAIL = 'Anthony@leanderlocalguide.com';

const REASONS: { h: string; body: string }[] = [
  { h: 'A correction', body: 'Hours wrong? Place closed, moved, or under new ownership? Tell me and I will fix it fast.' },
  { h: 'A tip', body: 'Found a spot I am missing, or a dish I have to try? This is how the guide gets better. Send it.' },
  { h: 'Claim your listing', body: 'Own or run one of these places? Use the claim button on your listing, or reach out here and I will get you set up.' },
  { h: 'Ideas or feedback', body: 'Something feel off, or got an idea to make the guide better? I read everything. Send it my way.' },
  { h: 'Sponsor or partner', body: 'There is room for one good local sponsor. No pay-to-play on rankings, ever, but let us talk.' },
  { h: 'Privacy and data', body: 'Want your account or a submission removed? Email me and it is done.' },
];

export default function ContactPage() {
  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-5">
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">Say Hello</p>
          <h1 className="font-display font-black text-ink leading-[0.95]" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>Contact</h1>
          <p className="mt-3 font-ui text-ink-soft max-w-xl">I read everything. The fastest way to reach me is email.</p>
          <a href={`mailto:${EMAIL}`} className="mt-4 inline-flex font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2.5 hover:bg-oxblood transition-colors">
            {EMAIL}
          </a>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {REASONS.map((r) => (
          <section key={r.h}>
            <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-1">{r.h}</h2>
            <p className="font-ui text-[15px] leading-relaxed text-ink">{r.body}</p>
          </section>
        ))}
        <p className="font-hand text-2xl text-oxblood pt-2">See you out there. Bring an appetite.</p>
      </div>
      <SiteFooter />
    </main>
  );
}
