import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpotAny } from '@/lib/spots';
import { ownerGate } from '@/lib/owner';
import { getOwnerSpecials, scheduleLabel } from '@/lib/specials';
import { removeSpecialAction } from '@/app/actions';
import LocalsOnlyStudio from '@/components/LocalsOnlyStudio';
import StampItButton from '@/components/StampItButton';
import Help from '@/components/Help';

export const dynamic = 'force-dynamic';

export default async function OwnerPassport({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await ownerGate(slug))) notFound();

  const spot = await getSpotAny(slug);
  if (!spot) notFound();
  const specials = await getOwnerSpecials(slug);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/locals-only.webp" alt="" width={28} height={28} className="w-7 h-7" />
        <h1 className="font-display font-black text-2xl text-ink">Local Passport</h1>
        <Help
          text="A standing perk you offer to people who found you through the guide. It shows on your page and on the town-wide Passport, and locals pull up a printable stamp to show you at the counter. Honor system: you decide what to give."
          example="Free churro with any plate."
        />
      </div>
      <p className="font-ui text-sm text-ink-soft mb-6">
        Your call what it is. When someone shows you their stamp, tap <strong>Stamp it</strong>. That tap is the only
        way we can ever prove the guide sent you a real person, so it is worth the second it takes.
      </p>

      <LocalsOnlyStudio slug={slug} restaurant={spot.name} category={spot.category} cuisines={spot.cuisines} />

      {specials.length > 0 && (
        <ul className="mt-6 space-y-2">
          {specials.map((s) => (
            <li key={s.id} className="bg-paper-raised border border-rule rounded-sm p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-bold text-ink truncate">{s.title}</p>
                <p className="font-stamp uppercase tracking-[0.06em] text-sm text-chile">{scheduleLabel(s)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StampItButton specialId={s.id} />
                <Link href={`/ticket/${s.id}`} target="_blank" className="font-stamp uppercase tracking-[0.06em] text-xs text-chile">Stamp →</Link>
                <form action={async () => { 'use server'; await removeSpecialAction(s.id); }}>
                  <button className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-oxblood">End it</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
