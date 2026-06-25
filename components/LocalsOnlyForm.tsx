'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSpecialAction } from '@/app/actions';

const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function LocalsOnlyForm({ slug }: { slug: string }) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [endsOn, setEndsOn] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function toggleDay(i: number) { setDays((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i]); }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const r = await createSpecialAction(slug, { title, details, recurring, daysOfWeek: days, endsOn: endsOn || null });
    setBusy(false);
    if (r.ok) { setTitle(''); setDetails(''); setRecurring(false); setDays([]); setEndsOn(''); router.refresh(); }
  }

  const field = 'w-full bg-paper border border-rule px-3 py-2 text-[16px] sm:text-sm text-ink outline-none rounded-sm focus:border-chile';
  return (
    <form onSubmit={add} className="space-y-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The deal — e.g. $5 off any plate" className={field} />
      <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Fine print (optional) — dine-in only, one per table..." className={field} />
      <label className="flex items-center gap-2 font-ui text-sm text-ink-soft"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Repeats weekly</label>
      {recurring ? (
        <div className="flex gap-1">{DAY.map((d, i) => <button type="button" key={i} onClick={() => toggleDay(i)} className={`font-stamp uppercase text-xs px-2 py-1 border rounded-sm ${days.includes(i) ? 'bg-chile text-paper border-chile' : 'border-rule text-ink-soft hover:text-ink'}`}>{d}</button>)}</div>
      ) : (
        <label className="font-ui text-xs text-ink-soft block">Ends (optional) <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className="ml-2 bg-paper border border-rule px-2 py-1 rounded-sm" /></label>
      )}
      <button disabled={busy} className="font-stamp uppercase tracking-[0.08em] text-sm bg-chile text-paper px-5 py-2.5 rounded-sm hover:bg-oxblood disabled:opacity-60">{busy ? 'Posting...' : 'Post Locals Only deal'}</button>
    </form>
  );
}
