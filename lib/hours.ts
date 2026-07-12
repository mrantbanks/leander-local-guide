// Client-side open/closed evaluation. Periods are precomputed server-side as
// [openAbs, closeAbs] pairs in minutes-of-week (closeAbs may exceed 10080 when a
// period runs past the week boundary / midnight). Status is ALWAYS derived live
// against America/Chicago time -- never a stale cached boolean.

const WEEK = 10080;

export type HourState = 'open' | 'closing_soon' | 'closed' | 'open24' | 'unknown';
export type HourStatus = { state: HourState; closeAbs?: number; nextOpenAbs?: number; minsToClose?: number };

/**
 * Which day is it IN LEANDER, Monday=0 (the order Google gives us weekdayDescriptions in).
 *
 * This exists because `new Date().getDay()` is a trap and we fell in it. Our servers run UTC, and
 * after 7pm Central (6pm in winter) UTC has already rolled over to tomorrow. So for the five hours
 * a night when people are actually deciding where to eat, every card on the site was printing
 * TOMORROW'S hours as today's. Ked's showed "closes 11 PM" on a Saturday night when it was open
 * till 1 AM, because the server had picked Sunday's row.
 *
 * It was invisible for months because SpotCard strips the day name off the front of the string
 * before printing it. You cannot see that the wrong day is the wrong day.
 *
 * The site has ONE clock and it is in Texas. Use this, never getDay(). The lint rule will stop you.
 */
export function leanderDayIdx(now: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short' }).format(now);
  return ({ Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 } as Record<string, number>)[wd] ?? 0;
}

export function centralNowAbs(now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value])) as Record<string, string>;
  const day = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[p.weekday] ?? 0;
  const hour = parseInt(p.hour, 10) % 24; // '24' at midnight -> 0
  return day * 1440 + hour * 60 + parseInt(p.minute, 10);
}

export function evalHours(periods: number[][] | null | undefined, open24: boolean, nowAbs: number = centralNowAbs(), soonMins = 30): HourStatus {
  if (open24) return { state: 'open24' };
  if (!periods || !periods.length) return { state: 'unknown' };
  for (const [o, c] of periods) {
    for (const t of [nowAbs, nowAbs + WEEK]) {
      if (t >= o && t < c) {
        const m = c - t;
        return { state: m <= soonMins ? 'closing_soon' : 'open', closeAbs: c % WEEK, minsToClose: m };
      }
    }
  }
  let best = Infinity, nextOpenAbs: number | undefined;
  for (const [o] of periods) for (const cand of [o, o + WEEK]) { const d = cand - nowAbs; if (d >= 0 && d < best) { best = d; nextOpenAbs = o % WEEK; } }
  return { state: 'closed', nextOpenAbs };
}

export function isOpenNow(s: HourState): boolean { return s === 'open' || s === 'closing_soon' || s === 'open24'; }

export function fmtAbs(abs: number): string {
  const mins = ((abs % WEEK) + WEEK) % WEEK % 1440;
  const h = Math.floor(mins / 60), m = mins % 60;
  const ampm = h < 12 ? 'AM' : 'PM', h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Short status label for popups.
export function statusLabel(s: HourStatus): string {
  switch (s.state) {
    case 'open24': return 'Open 24 hrs';
    case 'open': return s.closeAbs != null ? `Open · closes ${fmtAbs(s.closeAbs)}` : 'Open';
    case 'closing_soon': return s.closeAbs != null ? `Closing soon · ${fmtAbs(s.closeAbs)}` : 'Closing soon';
    case 'closed': return s.nextOpenAbs != null ? `Closed · opens ${fmtAbs(s.nextOpenAbs)}` : 'Closed';
    default: return 'Hours unknown';
  }
}
