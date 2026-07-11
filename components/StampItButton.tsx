'use client';

import { useState, useTransition } from 'react';
import { recordStampRedeem } from '@/app/actions';

/**
 * The counter tap: a local showed their stamp, the owner confirms it.
 *
 * This is the number that closes a sale. "63 people pulled a stamp" invites "but did they show
 * up?"; "63 people stood at your counter" does not. So the tap has to be one press, with no
 * hardware and no code to type, or staff will simply stop doing it.
 *
 * No running total is shown. That is on purpose (see the attribution memo): counts stay internal
 * until they are big enough to be impressive, because "2 stamps" is worse than no number at all.
 * The feedback here is only "that registered", which staff genuinely need.
 */
export default function StampItButton({ specialId }: { specialId: number }) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return <span className="font-stamp uppercase tracking-[0.06em] text-xs text-chile">Stamped ✓</span>;
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await recordStampRedeem(specialId);
          if (r.ok) setDone(true);
          else setFailed(true);
        })
      }
      className="font-stamp uppercase tracking-[0.06em] text-xs border border-ink text-ink px-3 py-1.5 rounded-sm hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {pending ? 'Stamping…' : failed ? 'Try again' : 'Stamp it'}
    </button>
  );
}
