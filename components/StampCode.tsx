'use client';

import { useEffect, useRef, useState } from 'react';
import { recordStampPull } from '@/app/actions';

/**
 * The four characters the owner taps, and the thing that records the pull. One component, because
 * they are the same moment: this person opened their stamp, and this is the code they will show.
 *
 * WHY THE CLIENT DOES THIS AT ALL. The server cannot mint the device cookie during a page render
 * (Next: "Cookies can only be modified in a Server Action or Route Handler"), so a first-time visitor
 * has no device id when the page is built and therefore no code. recordStampPull IS a Server Action,
 * so it can mint the cookie, and it hands the code straight back. A returning device already has the
 * cookie, so `initial` is filled server-side and the code is on screen before this runs at all.
 *
 * It also has to be a client island for the reason it always did: a server-side hook would count
 * every crawler and every prefetch as a person, and the whole point of this number is that it is real.
 */
export default function StampCode({
  specialId, source, initial,
}: {
  specialId: number;
  source: string;
  initial: string | null;
}) {
  const [code, setCode] = useState<string | null>(initial);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return; // React strict mode double-invokes effects
    fired.current = true;
    void recordStampPull(specialId, source)
      .then((r) => { if (r?.code) setCode(r.code); })
      .catch(() => {});
  }, [specialId, source]);

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-ink/40">
      <p className="font-stamp uppercase tracking-[0.12em] text-xs text-ink-soft">Show them this</p>
      <p className="font-display font-black text-ink text-4xl tracking-[0.2em] leading-none mt-1">
        {code ?? '····'}
      </p>
    </div>
  );
}
