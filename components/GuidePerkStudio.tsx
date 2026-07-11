'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGuideSpecialAction } from '@/app/actions';
import TicketCard from '@/components/TicketCard';
import { handoffLabel, GUIDE_ISSUER, type RedeemType } from '@/lib/specials-format';

// Perks the Guide funds and honors itself. No business has to agree to any of these, which is why
// they can go live today and stop /passport reading "No perks live right now."
// Anthony writes the final copy; these are the near-zero-cost starting points.
const PRESETS: { title: string; details: string; redeemType: RedeemType }[] = [
  {
    title: 'Founding Local',
    details: 'A stamp for the people who found the guide first. Yours if you sign up to the newsletter.',
    redeemType: 'digital',
  },
  {
    title: 'The list, a day early',
    details: 'Subscribers get the weekly Leander list 24 hours before it goes public.',
    redeemType: 'digital',
  },
  {
    title: 'The Best-Of zine, in the post',
    details: 'A printed guide to the good stuff, mailed to the first locals who ask.',
    redeemType: 'mail',
  },
];

const HANDOFF: { value: RedeemType; label: string }[] = [
  { value: 'digital', label: 'Online' },
  { value: 'mail', label: 'By post' },
  { value: 'counter', label: 'At a counter' },
];

const field = 'w-full border border-rule bg-paper px-3 py-2 font-ui text-sm rounded-sm';

export default function GuidePerkStudio() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [redeemType, setRedeemType] = useState<RedeemType>('digital');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const reset = () => { setTitle(''); setDetails(''); setRedeemType('digital'); setError(''); };

  const pick = (p: (typeof PRESETS)[number]) => {
    setTitle(p.title); setDetails(p.details); setRedeemType(p.redeemType); setOpen(true);
  };

  const save = () =>
    start(async () => {
      const r = await createGuideSpecialAction({ title, details, recurring: false, endsOn: null, redeemType });
      if (!r.ok) { setError(r.error || 'Could not save that'); return; }
      reset(); setOpen(false); router.refresh();
    });

  if (!open) {
    return (
      <div>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <li key={p.title}>
              <button
                onClick={() => pick(p)}
                className="w-full text-left border border-rule bg-paper-raised rounded-sm p-3 hover:border-chile"
              >
                <p className="font-display font-bold text-ink leading-tight">{p.title}</p>
                <p className="font-ui text-xs text-ink-soft mt-1">{p.details}</p>
                <p className="font-stamp uppercase tracking-[0.06em] text-xs text-chile mt-2">{handoffLabel(p)}</p>
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => { reset(); setOpen(true); }}
          className="mt-3 font-stamp uppercase tracking-[0.08em] text-sm border border-ink text-ink px-4 py-2 rounded-sm hover:bg-ink hover:text-paper"
        >
          ✎ Write my own
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The perk, e.g. Founding Local" className={field} />
        <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="The line under it, e.g. yours if you sign up to the newsletter" className={field} />
        <div>
          <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1.5">How it reaches them</p>
          <div className="flex flex-wrap gap-2">
            {HANDOFF.map((h) => (
              <button
                key={h.value}
                onClick={() => setRedeemType(h.value)}
                className={`font-stamp uppercase tracking-[0.06em] text-xs px-3 py-1.5 rounded-sm border ${
                  redeemType === h.value ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-soft hover:border-ink'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="font-ui text-sm text-oxblood">{error}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={pending || !title.trim()}
            className="font-stamp uppercase tracking-[0.08em] text-sm bg-chile text-paper px-4 py-2 rounded-sm hover:bg-oxblood disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Put it on the Passport'}
          </button>
          <button onClick={() => { reset(); setOpen(false); }} className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-oxblood">
            Cancel
          </button>
        </div>
      </div>

      <div>
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-2">Live preview, this is their stamp</p>
        <TicketCard
          restaurant={GUIDE_ISSUER}
          title={title}
          details={details}
          recurring={false}
          daysOfWeek={null}
          endsOn={null}
          handoff={handoffLabel({ redeemType })}
          fromGuide
        />
      </div>
    </div>
  );
}
