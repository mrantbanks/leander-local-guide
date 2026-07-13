// Client-safe event vocabulary. Split out of lib/events.ts, which imports the Postgres pool and so
// cannot be pulled into a browser bundle. The composer needs these labels live, as you type.

export const EVENT_LABELS: Record<string, string> = {
  // First, because it is the one people plan around and the one we get asked about most.
  happy_hour: 'Happy Hour',
  trivia: 'Trivia', karaoke: 'Karaoke', live_music: 'Live Music', bingo: 'Bingo',
  game_night: 'Game Night', comedy: 'Comedy', open_mic: 'Open Mic', book_club: 'Book Club',
  watch_party: 'Watch Party', run_club: 'Run Club', kids_eat_free: 'Kids Eat Free',
  market: 'Market', tasting: 'Tasting', other: 'Event',
};

export const EVENT_EMOJI: Record<string, string> = {
  happy_hour: '🍻',
  trivia: '🧠', karaoke: '🎤', live_music: '🎸', bingo: '🎱', game_night: '🎲', comedy: '🎙️',
  open_mic: '🎶', book_club: '📚', watch_party: '🏈', run_club: '🏃', kids_eat_free: '🧒',
  market: '🛍️', tasting: '🍷', other: '📅',
};

/**
 * Happy hour is the one event type where the END time is the whole point. "Trivia at 7:30" is a
 * time you turn up; "3 to 6" is a window you have to beat, and a happy hour without its end time is
 * useless. So it formats differently from every other event, and the composer requires the end.
 *
 * Runs of days collapse: [1,2,3,4,5] reads "Mon-Fri", not "Mon, Tue, Wed, Thu, Fri".
 */
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // ISO: 1=Mon

function hhTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`;
}

/** [1,2,3,4,5] -> "Mon-Fri". [1,3] -> "Mon, Wed". [1,2,3,4,5,6,7] -> "Every day". */
export function daysLabel(days: number[] | null | undefined): string {
  const d = [...new Set(days ?? [])].filter((n) => n >= 1 && n <= 7).sort((a, b) => a - b);
  if (!d.length) return '';
  if (d.length === 7) return 'Every day';
  const runs: number[][] = [];
  for (const n of d) {
    const last = runs[runs.length - 1];
    if (last && n === last[last.length - 1] + 1) last.push(n);
    else runs.push([n]);
  }
  return runs
    .map((r) => (r.length >= 3 ? `${DOW[r[0] - 1]}-${DOW[r[r.length - 1] - 1]}` : r.map((n) => DOW[n - 1]).join(', ')))
    .join(', ');
}

export type HappyHourish = {
  days_of_week?: number[] | null; daysOfWeek?: number[] | null;
  start_time?: string | null; startTime?: string | null;
  end_time?: string | null; endTime?: string | null;
  description?: string | null; title?: string | null;
};

/** One window: "Mon-Fri 3-6pm · 30% off drinks and select appetizers" */
function oneWindow(e: HappyHourish): string | null {
  const days = daysLabel(e.days_of_week ?? e.daysOfWeek);
  const a = hhTime(e.start_time ?? e.startTime);
  const b = hhTime(e.end_time ?? e.endTime);
  // "3pm-6pm" reads better as "3-6pm" when both sides share a meridiem.
  const span = a && b ? (a.slice(-2) === b.slice(-2) ? `${a.slice(0, -2)}-${b}` : `${a}-${b}`) : a || b;
  const when = [days, span].filter(Boolean).join(' ');
  const what = (e.description || '').trim() || (e.title || '').trim();
  return [when, what].filter(Boolean).join(' · ') || null;
}

/**
 * ALL of a spot's happy hours, not the first one.
 *
 * This took `limit 1` for about a day, which meant a bar with a weekday happy hour AND a weekend one
 * would have had the second silently dropped from its card, from the home filter and from the map
 * popup, while still sitting there in the events list looking saved. Plenty of bars run two. A
 * quietly discarded row is the worst kind of bug because everything keeps working.
 *
 * Windows are separated by a semicolon, so two of them stay legible on one card line:
 *   "Mon-Fri 3-6pm · 30% off drinks; Sat-Sun 2-5pm · $2 pints"
 */
export function happyHourLabel(e: HappyHourish | HappyHourish[] | null | undefined): string | null {
  const list = (Array.isArray(e) ? e : e ? [e] : []).filter(Boolean);
  if (!list.length) return null;
  const out = list.map(oneWindow).filter(Boolean).join('; ');
  return out || null;
}

// 'brunch' is deliberately absent: it is a service, not an event. The enum value still exists in
// Postgres (you cannot drop one cheaply) and lib/events.ts filters it out of every query.
export const EVENT_TYPES = Object.keys(EVENT_LABELS);

/**
 * Happy hour is stored as an event and MANAGED as its own thing, so the two desks never mix them.
 *
 * A spot has many events and they churn: trivia this month, a watch party next. It has ONE standing
 * happy hour, maybe two. "Add another" is the right verb for an event and the wrong one for a happy
 * hour, where you almost always mean "change ours". Putting them in one list also buries the happy
 * hour, which is the single thing most people are actually looking for.
 */
export const HAPPY_HOUR_TYPE = 'happy_hour';
export const BOARD_EVENT_TYPES = EVENT_TYPES.filter((t) => t !== HAPPY_HOUR_TYPE);
