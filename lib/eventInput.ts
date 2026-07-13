// Pure, client-safe event helpers (no DB import, so the composer can use them in the browser).
//
// Day numbering here is ISO: Mon = 1 ... Sun = 7. That is what events.days_of_week stores and what
// getWhatsOn() matches against. NOTE it is NOT the same as the Local Passport, where specials
// days_of_week is 0 = Mon ... 6 = Sun. Two tables, two conventions, and mixing them silently shifts
// every event by a day.

export const ISO_DAYS: [number, string][] = [
  [1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun'],
];

export const FREQS: { value: EventFreq; label: string; help: string }[] = [
  { value: 'weekly', label: 'Every week', help: 'Same days, every week. The usual: trivia every Tuesday.' },
  { value: 'monthly_dow', label: 'Every month', help: 'A given week of the month, e.g. the first Friday, or the last Saturday.' },
  { value: 'once', label: 'One time', help: 'A single date. It drops off the board by itself once it has passed.' },
];

export const WEEKS_OF_MONTH: { value: number; label: string }[] = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
];

export type EventFreq = 'once' | 'weekly' | 'monthly_dow';

export type EventInput = {
  eventType: string;
  title: string;
  description?: string | null;
  freq: EventFreq;
  daysOfWeek?: number[];        // ISO 1-7, for weekly and monthly_dow
  weekOfMonth?: number | null;  // 1-4, or -1 for "last", for monthly_dow
  eventDate?: string | null;    // yyyy-mm-dd, for once
  startTime?: string | null;    // HH:MM
  endTime?: string | null;
  endsOn?: string | null;       // yyyy-mm-dd, optional stop date for a recurring event
};

/** The one place we decide whether an event is coherent. The server re-checks; the UI uses it live. */
export function validateEvent(e: EventInput): string | null {
  if (!e.title.trim()) return 'Give it a name.';
  if (e.freq === 'once' && !e.eventDate) return 'Pick the date it happens.';
  if (e.freq !== 'once' && !(e.daysOfWeek || []).length) return 'Pick at least one day of the week.';
  if (e.freq === 'monthly_dow' && !e.weekOfMonth) return 'Pick which week of the month.';
  if (e.startTime && e.endTime && e.endTime <= e.startTime) return 'It cannot finish before it starts.';
  // For everything else the end time is a nicety. For a happy hour it IS the offer: "3 to 6" is a
  // window you have to beat, and "happy hour from 3pm" tells a person nothing they can act on.
  if (e.eventType === 'happy_hour') {
    if (!e.startTime || !e.endTime) return 'A happy hour needs a start AND an end. When does it stop?';
    if (!e.description?.trim()) return 'Say what the deal actually is. "Happy hour" on its own is not an offer.';
  }
  return null;
}

const dayName = (n: number) => ISO_DAYS.find(([v]) => v === n)?.[1] || '';

/** "Every Tue and Thu" / "First Friday of the month" / "Sat 12 Jul". Matches how the board reads. */
export function whenLabel(e: EventInput): string {
  const days = (e.daysOfWeek || []).slice().sort((a, b) => a - b).map(dayName).filter(Boolean);

  if (e.freq === 'once') {
    if (!e.eventDate) return 'Pick a date';
    return new Date(e.eventDate + 'T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
  }
  if (!days.length) return 'Pick a day';

  const list = days.length === 1 ? days[0] : `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`;
  if (e.freq === 'weekly') return `Every ${list}`;

  const w = WEEKS_OF_MONTH.find((x) => x.value === e.weekOfMonth)?.label || '';
  return w ? `${w} ${list} of the month` : `Monthly on ${list}`;
}

/** 19:30 -> 7:30pm. Same shape the board prints. */
export function prettyTime(t?: string | null): string | null {
  if (!t) return null;
  const [hRaw, m] = t.split(':');
  const h = Number(hRaw);
  if (Number.isNaN(h)) return null;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m && m !== '00' ? `${h12}:${m}${ampm}` : `${h12}${ampm}`;
}
