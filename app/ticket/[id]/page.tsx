import Link from 'next/link';
import { getSpecial, issuerLabel, handoffLabel } from '@/lib/specials';
import { stampCodeIfKnown } from '@/app/actions';
import PrintButton from '@/components/PrintButton';
import TicketCard from '@/components/TicketCard';
import StampCode from '@/components/StampCode';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSpecial(Number(id));
  return { title: s ? `${s.title} · Local Passport` : 'Local Passport', robots: { index: false } };
}

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { id } = await params;
  const { src } = await searchParams;
  const s = await getSpecial(Number(id));
  if (!s) return <main className="min-h-[70vh] grid place-items-center font-ui text-ink-soft px-5 text-center">This perk isn&apos;t running anymore.</main>;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
  // The code the owner will tap. A returning device already has the cookie, so this is on screen on
  // first paint. A first-time visitor gets null here (a page render may not SET a cookie) and the
  // island below fills it in from the server action a moment later.
  const code = await stampCodeIfKnown(s.id);

  return (
    <main className="min-h-[85vh] bg-paper-sunk px-4 py-8 flex flex-col items-center">
      <style>{`@media print { nav, .no-print { display:none !important; } body, main { background:#fff !important; } .ticket { box-shadow:none !important; } }`}</style>

      <TicketCard
        restaurant={issuerLabel(s)}
        title={s.title}
        details={s.details}
        recurring={s.recurring}
        daysOfWeek={s.daysOfWeek}
        endsOn={s.endsOn}
        today={today}
        code={<StampCode specialId={s.id} source={src || 'direct'} initial={code} />}
        handoff={handoffLabel(s)}
        fromGuide={s.issuerType === 'guide'}
      />

      <div className="no-print mt-6 flex items-center gap-4">
        <PrintButton />
        {s.slug && <Link href={`/r/${s.slug}`} className="font-stamp uppercase tracking-[0.08em] text-sm text-chile hover:text-oxblood">Back to {s.restaurant} →</Link>}
      </div>
      <p className="no-print font-ui text-xs text-ink-soft mt-3 text-center max-w-xs">Don&apos;t want to print? Just show this screen{s.issuerType === 'guide' ? '.' : ' at the restaurant.'}</p>
    </main>
  );
}
