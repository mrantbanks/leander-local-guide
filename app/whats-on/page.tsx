import Link from 'next/link';
import { getWhatsOn } from '@/lib/events';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "What's On in Leander",
  description: 'Trivia, karaoke, live music, bingo and more, happening this week in Leander, Texas. Tonight and the next 7 days, by a local.',
  alternates: { canonical: '/whats-on' },
};

export default async function WhatsOnPage() {
  const days = await getWhatsOn();
  const total = days.reduce((n, d) => n + d.items.length, 0);

  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-5">
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">The Week Ahead · Leander, TX</p>
          <h1 className="font-display font-black text-ink leading-[0.9] tracking-[-0.03em]" style={{ fontSize: 'clamp(2.25rem, 7vw, 5rem)' }}>What&apos;s On</h1>
          <p className="mt-3 font-ui text-ink-soft max-w-xl">Trivia, karaoke, live music, bingo and the rest. Tonight and the next seven days. Always call ahead to be sure, schedules change.</p>
        </div>
      </header>

      {total === 0 ? (
        <div className="max-w-4xl mx-auto px-5 py-16 text-center">
          <p className="font-hand text-3xl text-oxblood">The calendar&apos;s still filling up.</p>
          <p className="mt-3 font-ui text-ink-soft max-w-md mx-auto">Anthony is rounding up Leander&apos;s trivia nights, live music, and karaoke. Run a spot? <Link href="/contact" className="text-chile">Tell us what you host.</Link></p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-5 py-8 space-y-8">
          {days.map((d) => (
            <section key={d.iso}>
              <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft border-b border-rule pb-1 mb-3">
                <span className="text-ink">{d.label}</span> · {d.date}
              </h2>
              {d.items.length === 0 ? (
                <p className="font-ui text-sm text-ink-soft/70">Nothing listed yet.</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {d.items.map((it) => (
                    <li key={`${d.iso}-${it.id}`} className="py-3 flex items-baseline gap-3">
                      <span className="font-stamp uppercase tracking-[0.06em] text-sm text-chile w-20 shrink-0">{it.time || 'TBA'}</span>
                      <span className="text-xl shrink-0">{it.emoji}</span>
                      <div className="min-w-0">
                        <span className="font-display font-semibold text-ink text-lg">{it.title}</span>
                        <span className="font-ui text-base text-ink-soft"> · <Link href={`/r/${it.slug}`} className="hover:text-oxblood">{it.spot}</Link></span>
                        <span className="ml-2 font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">{it.label}{!it.fresh && ' · unconfirmed'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
      <SiteFooter />
    </main>
  );
}
