'use client';

import { useState, useTransition } from 'react';
import { recordSignal } from '@/app/actions';

type Counts = { worthIt: number; itsFine: number; skipIt: number; beenHere: number; wantToGo: number };

export default function SignalBar({
  placeId,
  initial,
  compact = false,
}: {
  placeId: string;
  initial: Counts;
  compact?: boolean;
}) {
  const [c, setC] = useState(initial);
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function tap(type: 'verdict' | 'been_here' | 'want_to_go', verdict?: 'worth_it' | 'its_fine' | 'skip_it', key?: string) {
    const k = key || type;
    if (tapped.has(k)) return;
    setTapped((s) => new Set(s).add(k));
    // optimistic
    setC((prev) => ({
      ...prev,
      ...(verdict === 'worth_it' ? { worthIt: prev.worthIt + 1 } : {}),
      ...(verdict === 'its_fine' ? { itsFine: prev.itsFine + 1 } : {}),
      ...(verdict === 'skip_it' ? { skipIt: prev.skipIt + 1 } : {}),
      ...(type === 'been_here' ? { beenHere: prev.beenHere + 1 } : {}),
      ...(type === 'want_to_go' ? { wantToGo: prev.wantToGo + 1 } : {}),
    }));
    startTransition(async () => {
      const r = await recordSignal(placeId, type, verdict);
      if (r) setC({ worthIt: r.worth_it_ct, itsFine: r.its_fine_ct, skipIt: r.skip_it_ct, beenHere: r.been_here_ct, wantToGo: r.want_to_go_ct });
    });
  }

  const votedVerdict = tapped.has('verdict');
  const stampBtn = (label: string, n: number, v: 'worth_it' | 'its_fine' | 'skip_it') => (
    <button
      onClick={(e) => { e.preventDefault(); tap('verdict', v, 'verdict'); }}
      disabled={votedVerdict}
      className={`font-stamp uppercase tracking-[0.06em] border-2 rounded-[2px] px-2.5 py-1 leading-none transition-colors ${
        votedVerdict ? 'opacity-60 cursor-default text-oxblood border-oxblood/50' : 'text-oxblood border-oxblood/70 hover:bg-oxblood hover:text-paper -rotate-1'
      } ${compact ? 'text-[12px]' : 'text-sm'}`}
    >
      {label} {n > 0 && <span className="opacity-70">{n}</span>}
    </button>
  );

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-1.5' : 'flex flex-col gap-3'}>
      <div className="flex flex-wrap items-center gap-1.5">
        {stampBtn('Worth it', c.worthIt, 'worth_it')}
        {stampBtn("It's fine", c.itsFine, 'its_fine')}
        {stampBtn('Skip it', c.skipIt, 'skip_it')}
      </div>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={(e) => { e.preventDefault(); tap('been_here', undefined, 'been_here'); }}
            disabled={tapped.has('been_here')}
            className={`font-stamp uppercase tracking-[0.06em] text-sm px-3 py-1 border-2 rounded-[2px] transition-colors ${tapped.has('been_here') ? 'opacity-60 text-ink-soft border-rule' : 'text-ink border-ink hover:bg-ink hover:text-paper'}`}
          >
            ✓ Been here {c.beenHere > 0 && <span className="opacity-70">{c.beenHere}</span>}
          </button>
          <button
            onClick={(e) => { e.preventDefault(); tap('want_to_go', undefined, 'want_to_go'); }}
            disabled={tapped.has('want_to_go')}
            className={`font-stamp uppercase tracking-[0.06em] text-sm px-3 py-1 border-2 rounded-[2px] transition-colors ${tapped.has('want_to_go') ? 'opacity-60 text-ink-soft border-rule' : 'text-ink-soft border-rule hover:border-ink hover:text-ink'}`}
          >
            ☆ Want to go {c.wantToGo > 0 && <span className="opacity-70">{c.wantToGo}</span>}
          </button>
        </div>
      )}
    </div>
  );
}
