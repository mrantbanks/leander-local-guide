import Link from 'next/link';
import FeedMe from '@/components/FeedMe';
import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: 'Page not found', robots: { index: false } };

// The 404 gets real traffic — second only to the homepage. So it does not dead-end: the same Feed
// Me engine the homepage runs is right here, restricted to the top two verdicts. Someone who
// already took a wrong turn should get our best answer, not a random one.
const BEST_TIERS = ['WORTH THE GRAVEL', 'WORTH IT'];

export default function NotFound() {
  return (
    <>
      <main className="max-w-3xl mx-auto px-5 py-16">
        <p className="font-stamp uppercase tracking-[0.2em] text-sm text-chile mb-3">404</p>
        <h1 className="font-display font-black text-4xl md:text-5xl text-ink leading-[1.05]">
          You&apos;ve hit gravel.
        </h1>
        <p className="font-ui text-lg text-ink-soft mt-4 max-w-xl">
          This page doesn&apos;t exist, but plenty of good ones do.
        </p>

        <div className="mt-10 bg-ink text-paper px-6 py-8 md:px-8 md:py-10 rounded-sm">
          <p className="font-stamp uppercase tracking-[0.12em] text-sm text-paper/60 mb-1">
            Since you&apos;re here
          </p>
          <p className="font-hand text-2xl text-amber mb-6">
            Let me point you at something worth the drive.
          </p>
          <FeedMe tiers={BEST_TIERS} label="Feed Me Anyway" stamp />
        </div>

        <p className="font-ui text-sm text-ink-soft mt-8">
          Or head back to{' '}
          <Link href="/" className="text-chile underline underline-offset-4 hover:text-oxblood">
            the guide
          </Link>
          {', '}
          <Link href="/map" className="text-chile underline underline-offset-4 hover:text-oxblood">
            the map
          </Link>
          {', or '}
          <Link href="/passport" className="text-chile underline underline-offset-4 hover:text-oxblood">
            The Local Passport
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
