'use client';

import { useState, useTransition } from 'react';
import { recordStampRedeem, recentPulls } from '@/app/actions';

/**
 * The counter tap. Two taps, and the second one is the whole product.
 *
 * It used to be ONE tap that wrote a row with no link to anything. So "we sent you 63 customers" was
 * really "the owner pressed a button 63 times", and we were about to sell that as causal proof. The
 * moment an owner worked that out, the guide's honesty position would have died with it.
 *
 * Now: tap "Stamp it", see the stamps actually pulled for this perk in the last four hours (a code
 * and a time, nothing else), and tap the one standing in front of you. The confirm joins to that
 * pull, so it carries a real device, a real time and a real source. An owner cannot manufacture a
 * walk-in without a real person having pulled a stamp first.
 *
 * Still no running total. Counts stay internal until they are big enough to be worth showing, because
 * "2 stamps" is worse than no number at all. Staff get the one thing they need: that registered.
 */
export default function StampItButton({ specialId }: { specialId: number }) {
  const [open, setOpen] = useState(false);
  const [pulls, setPulls] = useState<{ id: number; code: string; when: string }[]>([]);
  const [doneCode, setDoneCode] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      setErr('');
      const list = await recentPulls(specialId);
      setPulls(list);
      setOpen(true);
    });

  const confirm = (pullId: number, code: string) =>
    start(async () => {
      const r = await recordStampRedeem(pullId);
      if (!r.ok) { setErr(r.error || 'That did not go through.'); return; }
      setDoneCode(code);
      setOpen(false);
    });

  if (doneCode) {
    return (
      <span className="font-stamp uppercase tracking-[0.06em] text-xs text-chile">
        Stamped {doneCode} ✓
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={load}
        disabled={pending}
        className="font-stamp uppercase tracking-[0.06em] text-xs border border-ink text-ink px-3 py-1.5 rounded-sm hover:bg-ink hover:text-paper disabled:opacity-50"
      >
        {pending ? 'Looking...' : 'Stamp it'}
      </button>
    );
  }

  return (
    <div className="border-2 border-ink bg-paper-raised p-3 rounded-sm w-full sm:w-72">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-chile">Which one is in front of you?</p>
        <button onClick={() => { setOpen(false); setErr(''); }} className="font-stamp uppercase text-xs text-ink-soft hover:text-ink">
          Close
        </button>
      </div>

      {pulls.length === 0 ? (
        <p className="font-ui text-sm text-ink-soft">
          Nobody has pulled this stamp in the last four hours. Ask them to open it on their phone, then try again.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {pulls.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => confirm(p.id, p.code)}
                className="w-full flex items-center justify-between gap-3 border border-rule bg-paper px-3 py-2 rounded-sm hover:border-chile hover:bg-paper-raised disabled:opacity-50 transition-colors"
              >
                <span className="font-display font-black text-ink text-xl tracking-[0.18em]">{p.code}</span>
                <span className="font-ui text-xs text-ink-soft">{p.when}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {err && <p className="font-ui text-sm text-oxblood mt-2">{err}</p>}

      <p className="font-ui text-xs text-ink-soft mt-2.5 leading-snug">
        The code is on their stamp. Tapping it is the only way we can ever prove the guide sent you a real person.
      </p>
    </div>
  );
}
