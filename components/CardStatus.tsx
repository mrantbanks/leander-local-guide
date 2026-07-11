'use client';

import { useState, useEffect } from 'react';
import { evalHours, centralNowAbs } from '@/lib/hours';

// One shared minute-tick for the whole grid -- 177 cards must NOT each spin a timer.
let subs: (() => void)[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(fn: () => void) {
  subs.push(fn);
  if (!timer) timer = setInterval(() => subs.forEach((f) => f()), 60000);
  return () => { subs = subs.filter((s) => s !== fn); if (!subs.length && timer) { clearInterval(timer); timer = null; } };
}

// Positive-only browse-card status pill. NEVER stamps CLOSED / unknown (a half-grey
// grid reads as a dead site). Computed live vs Central time; renders only on mount so
// the cached HTML never carries a stale status and there's no hydration mismatch.
export default function CardStatus({ periods, open24, openLate }: { periods: number[][]; open24: boolean; openLate: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [, force] = useState(0);
  useEffect(() => { setMounted(true); return subscribe(() => force((n) => n + 1)); }, []);
  if (!mounted) return null;

  const now = centralNowAbs();
  const st = evalHours(periods, open24, now);
  const hour = Math.floor((now % 1440) / 60);
  let label = '', cls = '';
  if (st.state === 'open24') { label = 'Open 24 Hrs'; cls = 'bg-[#1f7a3d] text-paper'; }
  else if (st.state === 'closing_soon') { label = 'Closing Soon'; cls = 'bg-amber text-ink'; }
  else if (st.state === 'open') {
    if (openLate && hour >= 21) { label = 'Open Late'; cls = 'bg-ink text-paper'; }
    else { label = 'Open Now'; cls = 'bg-[#1f7a3d] text-paper'; }
  } else return null;

  return <span className={`font-stamp uppercase tracking-[0.08em] text-sm px-1.5 py-0.5 rounded-sm shadow-sm ${cls}`}>{label}</span>;
}
