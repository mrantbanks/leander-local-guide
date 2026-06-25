'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSpecialAction } from '@/app/actions';
import TicketCard from '@/components/TicketCard';

type Preset = { title: string; details?: string; recurring?: boolean; days?: number[] };
const PRESETS: Preset[] = [
  { title: '10% off for Leander locals', details: 'Show your ticket. Dine-in.' },
  { title: 'Free chips & queso with any entree', details: 'One per table.' },
  { title: 'Free appetizer with orders over $25', details: 'Dine-in, one per table.' },
  { title: '$5 off your first visit', details: 'New locals, one time.' },
  { title: 'Buy one entree, get one half off', details: 'Equal or lesser value, dine-in.' },
  { title: 'Free drink with any meal', details: 'Fountain drink, tea, or coffee.' },
  { title: 'Kids eat free', details: 'One kid meal per adult entree.', recurring: true, days: [1] },
  { title: 'Free dessert with two entrees' },
  { title: '10% off carry-out', details: 'Call ahead or order in person.' },
];

const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type Exp = { key: string; label: string; months?: number; days?: number; custom?: boolean };
const EXPIRY: Exp[] = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: '3m', label: '3 months', months: 3 },
  { key: '1m', label: '1 month', months: 1 },
  { key: '2w', label: '2 weeks', days: 14 },
  { key: 'custom', label: 'Pick a date', custom: true },
];
const iso = (d: Date) => d.toISOString().slice(0, 10);
function addMonths(m: number) { const d = new Date(); d.setMonth(d.getMonth() + m); return iso(d); }
function addDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); }

export default function LocalsOnlyStudio({ slug, restaurant }: { slug: string; restaurant: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [expiry, setExpiry] = useState('ongoing');
  const [customDate, setCustomDate] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function pick(p: Preset) { setTitle(p.title); setDetails(p.details || ''); setRecurring(!!p.recurring); setDays(p.days || []); setOpen(true); }
  function toggleDay(i: number) { setDays((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i]); }
  function endsOn(): string | null {
    const e = EXPIRY.find((x) => x.key === expiry);
    if (!e || e.key === 'ongoing') return null;
    if (e.custom) return customDate || null;
    if (e.months) return addMonths(e.months);
    if (e.days) return addDays(e.days);
    return null;
  }
  function reset() { setOpen(false); setTitle(''); setDetails(''); setRecurring(false); setDays([]); setExpiry('ongoing'); setCustomDate(''); }
  async function approve() {
    if (!title.trim()) return;
    setBusy(true);
    const r = await createSpecialAction(slug, { title, details, recurring, daysOfWeek: days, endsOn: endsOn() });
    setBusy(false);
    if (r.ok) { reset(); router.refresh(); }
  }

  const field = 'w-full bg-paper border border-rule px-3 py-2 text-[16px] sm:text-sm text-ink outline-none rounded-sm focus:border-chile';

  if (!open) {
    return (
      <div>
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-2">Pick a deal to activate — or write your own</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => pick(p)} className="text-left bg-paper-raised border border-rule rounded-sm p-3 hover:border-ink transition-colors">
              <span className="font-display font-bold text-ink text-sm">{p.title}</span>
              {p.recurring && <span className="block font-stamp uppercase text-[10px] tracking-[0.06em] text-chile mt-0.5">weekly</span>}
            </button>
          ))}
        </div>
        <button onClick={() => { reset(); setOpen(true); }} className="mt-3 font-stamp uppercase tracking-[0.08em] text-sm border border-ink text-ink px-4 py-2 rounded-sm hover:bg-ink hover:text-paper">✎ Write my own</button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <div className="space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The deal — e.g. $5 off any plate" className={field} />
        <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Fine print (optional)" className={field} />
        <label className="flex items-center gap-2 font-ui text-sm text-ink-soft"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Repeats weekly</label>
        {recurring && <div className="flex gap-1">{DAY.map((d, i) => <button type="button" key={i} onClick={() => toggleDay(i)} className={`font-stamp uppercase text-xs px-2 py-1 border rounded-sm ${days.includes(i) ? 'bg-chile text-paper border-chile' : 'border-rule text-ink-soft hover:text-ink'}`}>{d}</button>)}</div>}
        <div>
          <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mt-2 mb-1">Runs until</p>
          <div className="flex flex-wrap gap-1.5">
            {EXPIRY.map((e) => <button key={e.key} onClick={() => setExpiry(e.key)} className={`font-stamp uppercase text-xs px-2.5 py-1 border rounded-sm ${expiry === e.key ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-soft hover:text-ink'}`}>{e.label}{e.key === 'ongoing' ? ' ★' : ''}</button>)}
          </div>
          {expiry === 'custom' && <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="mt-2 bg-paper border border-rule px-2 py-1 rounded-sm" />}
          <p className="font-ui text-[11px] text-ink-soft mt-1">An ongoing deal keeps working with zero upkeep. Short ones are great for a weekend push.</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={approve} disabled={busy || !title.trim()} className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2.5 rounded-sm hover:bg-oxblood disabled:opacity-60">{busy ? 'Posting...' : 'Approve & post'}</button>
          <button onClick={reset} className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft hover:text-ink">Cancel</button>
        </div>
      </div>
      <div>
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-2">Live preview — this is their ticket</p>
        <TicketCard restaurant={restaurant} title={title} details={details} recurring={recurring} daysOfWeek={days} endsOn={endsOn()} />
      </div>
    </div>
  );
}
