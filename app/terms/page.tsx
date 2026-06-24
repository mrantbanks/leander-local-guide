import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Terms of Use',
  description: 'The terms for using The Leander Local Guide, including how user-submitted content is handled.',
  alternates: { canonical: '/terms' },
};

const UPDATED = 'June 24, 2026';
const EMAIL = 'Anthony@leanderlocalguide.com';

const SECTIONS: { h: string; body: string }[] = [
  { h: 'Using the guide', body: `By using The Leander Local Guide you agree to these terms. If you do not agree, please do not use the site.` },
  { h: 'Our reviews are opinion', body: `The reviews, verdicts, and rankings on this site are the honest personal opinion of Anthony Martinez. Hours, prices, menus, and other details change often and can be wrong. Always confirm with the restaurant before you go. Rankings are never for sale, and a business cannot pay to move up.` },
  { h: 'Content you submit', body: `You keep ownership of the photos, tips, reviews, and other content you submit. By submitting it, you grant us a non-exclusive, royalty-free license to display, store, and show it on the guide. You promise that you created the content or have the right to share it, and that it does not break the law or anyone else's rights. This matters most for photos: only upload images you took or are allowed to use.` },
  { h: 'Be decent', body: `Do not submit spam, advertising, links, harassment, hate, impersonation, or anything false or illegal. We review submissions before they appear, and we can edit or remove any content, or remove access, at our discretion.` },
  { h: 'Claiming a listing', body: `Business owners can claim their listing to respond to reviews. Claims are verified by hand. Claiming a listing never affects its ranking, its verdict, or what the reviews say.` },
  { h: 'No warranty', body: `The guide is provided as is, without warranties of any kind. We are not liable for decisions you make based on the information here. Eat at your own risk, and tip your server.` },
  { h: 'Contact', body: `Questions about these terms? Email ${EMAIL}.` },
];

export default function TermsPage() {
  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-5">
          <h1 className="font-display font-black text-ink leading-[0.95]" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>Terms of Use</h1>
          <p className="mt-2 font-ui text-sm text-ink-soft">Last updated: {UPDATED}</p>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-1">{s.h}</h2>
            <p className="font-ui text-[15px] leading-relaxed text-ink">{s.body}</p>
          </section>
        ))}
      </div>
      <SiteFooter />
    </main>
  );
}
