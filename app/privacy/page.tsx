import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How The Leander Local Guide collects, uses, and protects your information.',
  alternates: { canonical: '/privacy' },
};

const UPDATED = 'June 24, 2026';
const EMAIL = 'Anthony@leanderlocalguide.com';

const SECTIONS: { h: string; body: string }[] = [
  { h: 'Who we are', body: `The Leander Local Guide is an independent local food guide for Leander, Texas, run by Anthony Martinez. You can reach us any time at ${EMAIL}.` },
  { h: 'What we collect', body: `If you sign in with Google, we receive your name and email address from Google so we can identify you and let you contribute. When you submit content (photos, tips, star reviews, votes, or a listing claim) we store that content along with the account it came from. For anonymous one-tap reactions we set a small random cookie so the same device is not counted twice. Our servers also keep standard request logs (IP address, browser type, time) for security and troubleshooting.` },
  { h: 'How we use it', body: `We use this information to operate the guide: to show your contributions, to attribute them to you, to moderate submissions, to prevent spam and abuse, and to contact you if there is a question about something you submitted. We do not sell your personal information, and we do not use it for third-party advertising.` },
  { h: 'Who we share it with', body: `We rely on a few service providers to run the site: Google (for sign-in), and Cloudflare (for hosting, content delivery, and bot protection). They process data only to provide those services. We may disclose information if required by law.` },
  { h: 'How long we keep it', body: `We keep your account information and contributions for as long as your content is on the site. You can ask us to delete your account and your submissions at any time by emailing ${EMAIL}, and we will remove them.` },
  { h: 'Your choices', body: `You can request access to, correction of, or deletion of your information by writing to ${EMAIL}. You can also sign out at any time, and you can stop using Google sign-in to stop sharing your Google profile with us.` },
  { h: 'Security', body: `The site is served over HTTPS, and access to stored data is limited. No method of storage or transmission is perfectly secure, but we take reasonable steps to protect your information.` },
  { h: 'Children', body: `The guide is intended for adults and is not directed at children under 13. We do not knowingly collect information from children under 13.` },
  { h: 'Changes', body: `We may update this policy as the site evolves. When we do, we will change the date below.` },
];

export default function PrivacyPage() {
  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-5">
          <h1 className="font-display font-black text-ink leading-[0.95]" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>Privacy Policy</h1>
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
