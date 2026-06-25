import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';
export const metadata = { title: "You're a Leander Local now", robots: { index: false } };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  const err = sp.e === '1';
  return (
    <main>
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        {err ? (
          <>
            <h1 className="font-display font-black text-4xl text-ink mb-3">That link looks expired.</h1>
            <p className="font-ui text-ink-soft">No worries. <Link href="/subscribe" className="text-chile underline">Sign up again</Link> and I&apos;ll send a fresh confirmation.</p>
          </>
        ) : (
          <>
            <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-3">You&apos;re in</p>
            <h1 className="font-display font-black text-ink leading-[0.95] tracking-[-0.02em]" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>You&apos;re a Leander Local now.</h1>
            <p className="mt-4 font-ui text-ink-soft leading-relaxed">Welcome in. Your starter guide just hit your inbox, and from here it&apos;s one note a week: the new, the hidden, and the genuinely good. I&apos;ll do the legwork and the eating. You decide where to sit.</p>
            <p className="mt-6"><Link href="/best" className="font-stamp uppercase tracking-[0.1em] text-base bg-ink text-paper px-6 py-3 hover:bg-chile transition-colors">Start with the best of</Link></p>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
