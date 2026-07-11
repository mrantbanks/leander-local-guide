'use client';

import { useState } from 'react';
import Link from 'next/link';

const TAGS = ['Cheap eats', 'Big portions', 'Great service', 'Killer drinks', 'Great patio', 'Counter-service', 'Sit-down', 'Worth the drive', 'Local-owned', 'Kid-friendly', 'Cash only', 'Long wait'];

export default function ReviewComposer({ slug }: { slug: string }) {
  const [notes, setNotes] = useState('');
  const [visited, setVisited] = useState(false);
  const [verdict, setVerdict] = useState('');
  const [hiddenGem, setHiddenGem] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  function toggleTag(t: string) { setTags((x) => x.includes(t) ? x.filter((y) => y !== t) : [...x, t]); }
  function setField(name: string, val: string) {
    const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (el) el.value = val ?? '';
  }
  function setCheck(name: string, checked: boolean) {
    const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
    if (el) el.checked = checked;
  }

  async function draft() {
    setBusy(true); setErr(''); setDone(false);
    try {
      const r = await fetch('/api/admin/review-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, notes, visited, verdict, hiddenGem, tags }) });
      const j = await r.json();
      if (j.error) { setErr(j.error); setBusy(false); return; }
      setField('verdict', j.verdict || 'WORTH IT');
      setField('hook', j.hook || '');
      setField('review', j.review || '');
      setField('whatToOrder', j.whatToOrder || '');
      setField('gotcha', j.gotcha || '');
      setField('summaryNote', j.summaryNote || '');
      setField('cantWait', j.cantWait || '');
      setCheck('visited', !!visited);
      if (visited) setField('visitedDate', new Date().toISOString().slice(0, 10));
      setDone(true);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }

  const chip = 'font-stamp uppercase text-[12px] px-2 py-1 border rounded-sm';
  return (
    <div className="border-2 border-chile rounded-sm bg-paper-raised p-4 mb-6">
      <p className="font-stamp uppercase tracking-[0.12em] text-chile text-sm mb-1">✨ Draft a review with AI</p>
      <p className="font-ui text-xs text-ink-soft mb-2">Jot your notes, answer a couple things, and Anthony writes it up. It fills the fields below; you review and Save.</p>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Scribble it... what you ate, the vibe, what stood out, what to skip. Or leave blank and let the reviews speak." className="w-full bg-paper border border-rule px-3 py-2 text-[16px] sm:text-sm text-ink rounded-sm outline-none focus:border-chile" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
        <label className="flex items-center gap-1.5 font-ui text-sm text-ink"><input type="checkbox" checked={visited} onChange={(e) => setVisited(e.target.checked)} /> I&apos;ve been here</label>
        <span className="font-ui text-sm text-ink-soft">Verdict:</span>
        {['WORTH IT', "IT'S FINE", 'SKIP IT'].map((v) => (
          <button key={v} type="button" onClick={() => setVerdict(verdict === v ? '' : v)} className={`${chip} ${verdict === v ? 'bg-chile text-paper border-chile' : 'border-rule text-ink-soft hover:text-ink'}`}>{v}</button>
        ))}
        <label className="flex items-center gap-1.5 font-ui text-sm text-ink"><input type="checkbox" checked={hiddenGem} onChange={(e) => setHiddenGem(e.target.checked)} /> Hidden gem</label>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {TAGS.map((t) => <button key={t} type="button" onClick={() => toggleTag(t)} className={`${chip} ${tags.includes(t) ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-soft hover:text-ink'}`}>{t}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button type="button" onClick={draft} disabled={busy} className="font-stamp uppercase tracking-[0.08em] text-sm bg-chile text-paper px-4 py-2 rounded-sm hover:bg-oxblood disabled:opacity-60">{busy ? 'Writing...' : "✨ Write it in Anthony's voice"}</button>
        <Link href={`/admin/r/${slug}/photos`} className="font-stamp uppercase tracking-[0.08em] text-xs text-chile hover:text-oxblood">📸 Took photos? Add them →</Link>
      </div>
      {err && <p className="font-ui text-sm text-oxblood mt-2">{err}</p>}
      {done && <p className="font-ui text-sm text-ink mt-2 bg-paper border border-rule rounded-sm px-3 py-2">✓ Drafted into the fields below. Read it over, tweak anything, then hit Save. {visited ? '' : "(Summary mode, since you haven't been yet.)"}</p>}
    </div>
  );
}
