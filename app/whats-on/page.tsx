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
        <div className="max-w-4xl mx-auto px-5 py-8 space-y-10">
          {days.map((d) => (
            <section key={d.iso}>
              {/* The day, spelled out. A listings board should tell you what day you are looking at
                  from across the room, not in 14px grey. */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 border-ink pb-2 mb-4">
                <h2 className="font-display font-black text-ink text-3xl leading-none tracking-[-0.02em]">{d.label}</h2>
                <span className="font-stamp uppercase tracking-[0.14em] text-chile text-base">{d.full}</span>
                {d.items.length > 0 && (
                  <span className="font-ui text-sm text-ink-soft ml-auto">{d.items.length} on</span>
                )}
              </div>

              {d.items.length === 0 ? (
                <p className="font-hand text-2xl text-oxblood">Nothing listed for this one yet.</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {d.items.map((it) => (
                    <li key={`${d.iso}-${it.id}`}>
                      {/* The whole card is the link, so the hit area is the card and not four words
                          of the venue name. */}
                      <Link
                        href={`/r/${it.slug}`}
                        className="group flex gap-3 h-full border border-rule bg-paper-raised rounded-sm p-4 transition-colors hover:border-ink hover:bg-paper"
                      >
                        <span className="text-3xl leading-none shrink-0" aria-hidden="true">{it.emoji}</span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-stamp uppercase tracking-[0.08em] text-chile text-base">{it.time || 'Time TBA'}</span>
                            <span className="font-stamp uppercase tracking-[0.08em] text-sm text-ink-soft">{it.label}</span>
                          </div>
                          <p className="font-display font-bold text-ink text-xl leading-tight mt-1 transition-colors group-hover:text-oxblood">
                            {it.title}
                          </p>
                          <p className="font-ui text-base text-ink-soft mt-0.5 truncate">{it.spot}</p>
                          {!it.fresh && (
                            <p className="font-stamp uppercase tracking-[0.06em] text-sm text-ink-soft/80 mt-1.5">⚠ Unconfirmed, call ahead</p>
                          )}
                        </div>
                      </Link>
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
