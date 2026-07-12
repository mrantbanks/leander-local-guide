import Link from 'next/link';
import { BOARDS } from '@/lib/boards';
import Icon from '@/components/Icon';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Best of Leander',
  description: "The Leander Local Guide's power rankings: best tacos, BBQ, pizza, bars, patios, food trucks and more, weighted by what locals love.",
};

export default function BestIndex() {
  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-5">
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">Power Rankings · Leander, TX</p>
          <h1 className="font-display font-black text-ink leading-[0.9] tracking-[-0.03em]" style={{ fontSize: 'clamp(2.25rem, 7vw, 5rem)' }}>
            Best of Leander
          </h1>
          <p className="mt-3 font-ui text-ink-soft max-w-xl">Anthony&apos;s running rankings, weighted by what locals actually love. Updated as the votes come in.</p>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-5 pt-6">
        <Link href="/hidden-gems" className="group flex items-center justify-between border-2 border-chile bg-paper-raised p-4 hover:bg-paper-sunk transition-colors">
          <div>
            <span className="font-stamp uppercase tracking-[0.12em] text-chile text-xs">💎 Hand-picked</span>
            <h2 className="font-display font-black text-2xl text-ink mt-0.5">Hidden Gems</h2>
            <p className="font-ui text-sm text-ink-soft">The strip-mall doors and back-lot trucks worth knowing about.</p>
          </div>
          <span className="font-stamp uppercase tracking-[0.1em] text-sm text-chile group-hover:text-oxblood shrink-0 ml-3">See them →</span>
        </Link>
      </div>
      <div className="max-w-4xl mx-auto px-5 py-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BOARDS.map((b) => (
          <Link key={b.slug} href={`/best/${b.slug}`} className="group border border-rule bg-paper-raised p-4 hover:border-ink transition-colors">
            <Icon name={b.slug} fallback={b.emoji} className="w-7 h-7 text-ink group-hover:text-chile transition-colors" />
            <h2 className="font-display font-bold text-xl text-ink group-hover:text-oxblood transition-colors mt-1">{b.title}</h2>
            <p className="font-ui text-sm text-ink-soft">{b.blurb}</p>
          </Link>
        ))}
      </div>
      <SiteFooter />
    </main>
  );
}
