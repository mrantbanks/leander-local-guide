'use client';

import { useSyncExternalStore } from 'react';
import { evalHours, centralNowAbs, fmtAbs } from '@/lib/hours';

/**
 * Open / Closed, decided in Leander, live.
 *
 * A clock is an external system, so it is subscribed to rather than copied into state. That matters
 * here more than usual: /r/[slug] is ISR-cached for 60s, so ANYTHING the server decides about "now"
 * is stale the moment it is written into the cache. This page used to render a boolean computed at
 * cache-fill time and could therefore tell you, with total confidence, that a place was open a
 * minute after it had shut.
 *
 * getServerSnapshot returns null, so the server renders nothing and the browser fills it in against
 * the real clock. A beat of blank is honest. A stale "Open Now" is not.
 */
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};

export default function OpenNowBadge({ periods, open24 }: { periods: number[][] | null; open24: boolean }) {
  // centralNowAbs() is minutes-of-week, so it is stable within a minute and safe to read per render.
  const nowAbs = useSyncExternalStore(subscribe, () => centralNowAbs(), () => null);

  if (nowAbs == null) return null;
  const s = evalHours(periods, open24, nowAbs);
  if (s.state === 'unknown') return null;

  const open = s.state === 'open' || s.state === 'open24';
  const soon = s.state === 'closing_soon';
  const label =
    s.state === 'open24' ? 'Open 24 hrs'
    : soon ? (s.closeAbs != null ? `Closing soon · ${fmtAbs(s.closeAbs)}` : 'Closing soon')
    : open ? (s.closeAbs != null ? `Open until ${fmtAbs(s.closeAbs)}` : 'Open Now')
    : s.nextOpenAbs != null ? `Closed · opens ${fmtAbs(s.nextOpenAbs)}` : 'Closed';

  const cls = open ? 'text-ink bg-amber' : soon ? 'text-paper bg-oxblood' : 'text-ink-soft border border-rule';
  return <span className={`font-stamp uppercase tracking-[0.08em] text-sm px-2 py-0.5 rounded-sm ${cls}`}>{label}</span>;
}
