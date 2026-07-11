import Link from 'next/link';
import { getAllActiveSpecials, scheduleLabel } from '@/lib/specials';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'The Local Passport — every Leander food perk in one place',
  description: 'The Local Passport: standing perks straight from Leander owners to people who found them through the guide. Pull the stamp, show it at the counter, eat like you live here.',
  alternates: { canonical: '/passport' },
  openGraph: { title: 'The Local Passport · Leander, TX', description: 'A passport to all the good stuff — every local perk in Leander, in one place.', url: 'https://leanderlocalguide.com/passport', type: 'website' },
};

export default async function PassportRoundup() {
  const perks = await getAllActiveSpecials();
  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/locals-only.webp" alt="The Local Passport" width={72} height={72} className="w-16 h-16 mx-auto mb-2" />
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm">The Local Passport · Leander, TX</p>
          <h1 className="font-display font-black text-ink leading-[0.95]" style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}>Eat like you live here.</h1>
          <p className="mt-2 font-ui text-ink-soft max-w-lg mx-auto">A passport to all the good stuff. Standing perks straight from the owners to people who found them here. Pull the stamp, show it at the counter. No points, no apps, no gimmicks.</p>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-5 py-8">
        {perks.length === 0 ? (
          <p className="font-hand text-2xl text-oxblood text-center py-8">No perks live right now. Check back soon, locals.</p>
        ) : (
          <>
            <p className="font-ui text-xs text-ink-soft mb-3">{perks.length} live perk{perks.length !== 1 ? 's' : ''}</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perks.map((s) => (
                <li key={s.id} className="border border-rule bg-paper-raised rounded-sm p-4 flex flex-col">
                  <Link href={`/r/${s.slug}`} className="font-stamp uppercase tracking-[0.06em] text-xs text-chile hover:text-oxblood">{s.restaurant}</Link>
                  <p className="font-display font-black text-ink text-xl leading-tight mt-1">{s.title}</p>
                  {s.details && <p className="font-ui text-sm text-ink-soft mt-0.5">{s.details}</p>}
                  <p className="font-stamp uppercase tracking-[0.06em] text-[12px] text-ink-soft mt-1">{scheduleLabel(s)}</p>
                  <Link href={`/ticket/${s.id}`} className="mt-3 self-start font-stamp uppercase tracking-[0.08em] text-xs bg-chile text-paper px-3 py-2 rounded-sm hover:bg-oxblood">Get the stamp →</Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="font-ui text-sm text-ink-soft text-center mt-8 border-t border-rule pt-5">Own a Leander spot? <Link href="/claim" className="text-chile underline">Make your listing yours</Link> and add your own perk to the Passport.</p>
      </div>
      <SiteFooter />
    </main>
  );
}
