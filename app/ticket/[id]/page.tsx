import Link from 'next/link';
import { getSpecial, scheduleLabel } from '@/lib/specials';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSpecial(Number(id));
  return { title: s ? `${s.title} — Locals Only` : 'Locals Only', robots: { index: false } };
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSpecial(Number(id));
  if (!s) return <main className="min-h-[70vh] grid place-items-center font-ui text-ink-soft px-5 text-center">This deal isn&apos;t running anymore.</main>;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });

  return (
    <main className="min-h-[85vh] bg-paper-sunk px-4 py-8 flex flex-col items-center">
      <style>{`@media print { nav, .no-print { display:none !important; } body, main { background:#fff !important; } .ticket { box-shadow:none !important; } }`}</style>

      <div className="ticket w-full max-w-sm bg-paper border-2 border-ink shadow-xl">
        {/* header / seal */}
        <div className="text-center px-6 pt-6 pb-4 border-b-2 border-dashed border-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/locals-only.webp" alt="" width={84} height={84} className="w-20 h-20 mx-auto mb-1" />
          <p className="font-stamp uppercase tracking-[0.28em] text-chile text-lg">Locals Only</p>
          <p className="font-stamp uppercase tracking-[0.16em] text-ink-soft text-[10px]">The Leander Local Guide</p>
        </div>

        {/* the deal */}
        <div className="px-6 py-6 text-center">
          <p className="font-stamp uppercase tracking-[0.1em] text-ink-soft text-[11px] mb-1">A perk from</p>
          <p className="font-display font-bold text-ink text-lg leading-tight mb-4">{s.restaurant}</p>
          <p className="font-display font-black text-ink leading-[1.05]" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.25rem)' }}>{s.title}</p>
          {s.details && <p className="font-ui text-sm text-ink-soft mt-2">{s.details}</p>}
          <p className="font-stamp uppercase tracking-[0.08em] text-xs text-chile mt-3">{scheduleLabel(s)}</p>
        </div>

        {/* stub */}
        <div className="px-6 py-4 border-t-2 border-dashed border-ink text-center bg-paper-raised">
          <p className="font-hand text-xl text-ink leading-tight">Show this to your server.</p>
          <p className="font-ui text-[11px] text-ink-soft mt-1">Leander locals only · one per visit · owner&apos;s discretion</p>
          <p className="font-stamp uppercase tracking-[0.1em] text-[10px] text-ink-soft mt-2">Pulled up {today}</p>
        </div>
      </div>

      <div className="no-print mt-6 flex items-center gap-4">
        <PrintButton />
        {s.slug && <Link href={`/r/${s.slug}`} className="font-stamp uppercase tracking-[0.08em] text-sm text-chile hover:text-oxblood">Back to {s.restaurant} →</Link>}
      </div>
      <p className="no-print font-ui text-xs text-ink-soft mt-3 text-center max-w-xs">Don&apos;t want to print? Just show this screen at the restaurant.</p>
    </main>
  );
}
