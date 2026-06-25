import { scheduleLabel } from '@/lib/specials-format';

// Presentational zine "Local's Ticket" — rendered on /ticket/[id] AND as the live preview
// in the owner studio. No 'use client' so it works in both server and client trees.
export default function TicketCard({ restaurant, title, details, recurring, daysOfWeek, endsOn, today }: {
  restaurant: string; title: string; details?: string | null; recurring: boolean; daysOfWeek: number[] | null; endsOn: string | null; today?: string;
}) {
  const label = scheduleLabel({ recurring, daysOfWeek, endsOn });
  return (
    <div className="ticket w-full max-w-sm bg-paper border-2 border-ink shadow-xl mx-auto">
      <div className="text-center px-6 pt-6 pb-4 border-b-2 border-dashed border-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/locals-only.webp" alt="" width={84} height={84} className="w-20 h-20 mx-auto mb-1" />
        <p className="font-stamp uppercase tracking-[0.28em] text-chile text-lg">Locals Only</p>
        <p className="font-stamp uppercase tracking-[0.16em] text-ink-soft text-[10px]">The Leander Local Guide</p>
      </div>
      <div className="px-6 py-6 text-center">
        <p className="font-stamp uppercase tracking-[0.1em] text-ink-soft text-[11px] mb-1">A perk from</p>
        <p className="font-display font-bold text-ink text-lg leading-tight mb-4">{restaurant}</p>
        <p className="font-display font-black text-ink leading-[1.05]" style={{ fontSize: 'clamp(1.5rem, 6.5vw, 2.25rem)' }}>{title || 'Your deal shows up here'}</p>
        {details && <p className="font-ui text-sm text-ink-soft mt-2">{details}</p>}
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-chile mt-3">{label}</p>
      </div>
      <div className="px-6 py-4 border-t-2 border-dashed border-ink text-center bg-paper-raised">
        <p className="font-hand text-xl text-ink leading-tight">Show this to your server.</p>
        <p className="font-ui text-[11px] text-ink-soft mt-1">Leander locals only · one per visit · owner&apos;s discretion</p>
        {today && <p className="font-stamp uppercase tracking-[0.1em] text-[10px] text-ink-soft mt-2">Pulled up {today}</p>}
      </div>
    </div>
  );
}
