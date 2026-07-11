'use client';

import { useState } from 'react';
import { saveOwnerEdits } from '@/app/actions';
import type { OwnerContent, OwnerHours } from '@/lib/owner';
import Help from '@/components/Help';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Initial = { phone: string; website: string; menuUrl: string; orderUrl: string; happyHour: string; blurb: string; hours: OwnerHours | null };

export default function OwnerEditor({ slug, initial, googleWeek }: { slug: string; initial: Initial; googleWeek: string[] | null }) {
  const [f, setF] = useState({ phone: initial.phone, website: initial.website, menuUrl: initial.menuUrl, orderUrl: initial.orderUrl, happyHour: initial.happyHour, blurb: initial.blurb });
  const [editHours, setEditHours] = useState(!!initial.hours);
  const [hours, setHours] = useState<OwnerHours>(initial.hours || Array.from({ length: 7 }, () => ({ open: '11:00', close: '21:00' })));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  function setDay(i: number, part: 'open' | 'close', val: string) {
    setHours((h) => h.map((d, j) => j === i ? { ...(d || { open: '', close: '' }), [part]: val } : d));
  }
  function toggleClosed(i: number) {
    setHours((h) => h.map((d, j) => j === i ? (d ? null : { open: '11:00', close: '21:00' }) : d));
  }

  async function save() {
    setStatus('saving');
    const patch: OwnerContent = { ...f };
    if (editHours) patch.hours = hours;
    const r = await saveOwnerEdits(slug, patch);
    setStatus(r.ok ? 'saved' : 'error');
    if (r.ok) setTimeout(() => setStatus('idle'), 2500);
  }

  const field = 'w-full bg-paper border border-rule px-3 py-2 text-[16px] sm:text-sm text-ink outline-none rounded-sm focus:border-chile';
  const card = 'bg-paper-raised border border-rule rounded-sm p-4';
  const lbl = 'font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1.5 block';

  return (
    <div className="space-y-4">
      <div className={card}>
        <span className={lbl}>From the owner <span className="normal-case tracking-normal text-ink-soft/70">(shows as a labeled note on your page)</span>
          <Help text="A short note in your own voice. It shows on your public page under a 'From the owner' heading — separate from Anthony's review, which you can't edit. Good for the story or an off-menu tip." example="Family-run since 2019. Ask for the off-menu green salsa." />
        </span>
        <textarea value={f.blurb} onChange={set('blurb')} rows={3} maxLength={280} placeholder="Family-run since 2019. Ask for the off-menu green salsa." className={field} />
      </div>

      <div className={card}>
        <span className={lbl}>Contact &amp; links</span>
        <div className="space-y-2">
          <input value={f.phone} onChange={set('phone')} placeholder="Phone" className={field} />
          <input value={f.website} onChange={set('website')} placeholder="Website (https://...)" className={field} />
          <input value={f.menuUrl} onChange={set('menuUrl')} placeholder="Menu link" className={field} />
          <input value={f.orderUrl} onChange={set('orderUrl')} placeholder="Order-online link" className={field} />
          <input value={f.happyHour} onChange={set('happyHour')} placeholder="Happy hour (e.g. Mon-Fri 3-6, $5 margs)" className={field} />
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between">
          <span className={lbl + ' mb-0'}>Hours
            <Help text="By default your page shows the hours Google has for you. Flip 'Set my own' to type your own — they replace Google's everywhere on your page, including the open-now badge." example="Closed Mondays; open 11am–9pm Tue–Sun." />
          </span>
          <label className="font-ui text-xs text-ink-soft flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={editHours} onChange={(e) => setEditHours(e.target.checked)} /> Set my own
          </label>
        </div>
        {googleWeek && !editHours && (
          <div className="font-ui text-xs text-ink-soft mt-2 leading-relaxed">
            {googleWeek.map((w, i) => <div key={i}>{w}</div>)}
            <p className="mt-1 text-ink-soft/80">Wrong? Flip &ldquo;Set my own&rdquo; and yours will replace these everywhere.</p>
          </div>
        )}
        {editHours && (
          <div className="mt-3 space-y-1.5">
            {DAYS.map((day, i) => {
              const d = hours[i];
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="font-ui text-xs text-ink w-20 shrink-0">{day}</span>
                  {d ? (
                    <>
                      <input type="time" value={d.open} onChange={(e) => setDay(i, 'open', e.target.value)} className="bg-paper border border-rule px-2 py-1 text-sm rounded-sm" />
                      <span className="text-ink-soft">to</span>
                      <input type="time" value={d.close} onChange={(e) => setDay(i, 'close', e.target.value)} className="bg-paper border border-rule px-2 py-1 text-sm rounded-sm" />
                    </>
                  ) : (
                    <span className="font-ui text-sm text-ink-soft flex-1">Closed</span>
                  )}
                  <button onClick={() => toggleClosed(i)} className="font-stamp uppercase text-[12px] tracking-[0.06em] text-chile ml-auto shrink-0">{d ? 'Closed?' : 'Open it'}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sticky bottom-2">
        <button onClick={save} disabled={status === 'saving'} className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-6 py-3 rounded-sm hover:bg-oxblood disabled:opacity-60 shadow-lg">
          {status === 'saving' ? 'Saving...' : 'Save changes'}
        </button>
        {status === 'saved' && <span className="font-hand text-xl text-fern" style={{ color: '#3E6B47' }}>Saved ✓ it&apos;s live</span>}
        {status === 'error' && <span className="font-ui text-sm text-oxblood">Couldn&apos;t save. Try again.</span>}
      </div>
    </div>
  );
}
