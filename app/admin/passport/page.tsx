import Link from 'next/link';
import { auth } from '@/auth';
import { getGuideSpecials, getAllActiveSpecials, scheduleLabel, handoffLabel } from '@/lib/specials';
import { removeGuideSpecialAction } from '@/app/actions';
import GuidePerkStudio from '@/components/GuidePerkStudio';

export const dynamic = 'force-dynamic';

export default async function AdminPassportPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }

  const [guide, all] = await Promise.all([getGuideSpecials(), getAllActiveSpecials()]);
  const owner = all.filter((s) => s.issuerType === 'business');

  return (
    <main className="max-w-3xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">The Local Passport</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-6 max-w-2xl leading-relaxed">
        Perks the Guide offers and honors itself. They need no owner&apos;s permission, so they can go live
        today, and they keep <Link href="/passport" className="text-chile underline underline-offset-2">/passport</Link> from
        reading &ldquo;no perks right now&rdquo; to the next owner who lands on it.
      </p>

      <section className="border-t-2 border-ink pt-5">
        <h2 className="font-stamp uppercase tracking-[0.14em] text-ink text-base mb-3">Add one from the Guide</h2>
        <GuidePerkStudio />
      </section>

      <section className="mt-10 border-t border-rule pt-5">
        <h2 className="font-stamp uppercase tracking-[0.14em] text-ink text-base mb-3">
          Live from the Guide ({guide.length})
        </h2>
        {guide.length === 0 ? (
          <p className="font-hand text-2xl text-oxblood">Nothing from us yet. The Passport is only as alive as we make it.</p>
        ) : (
          <ul className="space-y-2">
            {guide.map((s) => (
              <li key={s.id} className="bg-paper-raised border border-rule rounded-sm p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink truncate">{s.title}</p>
                  {s.details && <p className="font-ui text-xs text-ink-soft truncate">{s.details}</p>}
                  <p className="font-stamp uppercase tracking-[0.06em] text-xs text-chile">{handoffLabel(s)} · {scheduleLabel(s)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/ticket/${s.id}`} target="_blank" className="font-stamp uppercase tracking-[0.06em] text-xs text-chile">Stamp →</Link>
                  <form action={async () => { 'use server'; await removeGuideSpecialAction(s.id); }}>
                    <button className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-oxblood">End it</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 border-t border-rule pt-5">
        <h2 className="font-stamp uppercase tracking-[0.14em] text-ink text-base mb-3">
          Live from owners ({owner.length})
        </h2>
        {owner.length === 0 ? (
          <p className="font-ui text-sm text-ink-soft">No owner has posted one yet. They add these themselves from their own desk.</p>
        ) : (
          <ul className="space-y-2">
            {owner.map((s) => (
              <li key={s.id} className="bg-paper-raised border border-rule rounded-sm p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink truncate">{s.title}</p>
                  <p className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft">{s.restaurant} · {scheduleLabel(s)}</p>
                </div>
                {s.slug && <Link href={`/owner/${s.slug}`} className="shrink-0 font-stamp uppercase tracking-[0.06em] text-xs text-chile">Their desk →</Link>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
