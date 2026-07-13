import { pool } from './db';

// The vocabulary lives in lib/eventLabels.ts so the client-side composer can import it without
// dragging the Postgres pool into the browser bundle. Re-exported here so existing callers still work.
export { EVENT_LABELS, EVENT_EMOJI, EVENT_TYPES } from './eventLabels';
import { EVENT_LABELS, EVENT_EMOJI } from './eventLabels';

const DOW_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // index by ISO-1
const ORD = ['', '1st', '2nd', '3rd', '4th'];

function clean(s: string | null | undefined): string | null {
  if (s == null) return null;
  return String(s).replace(/[ \t]*[—–][ \t]*/g, ', ').replace(/\s{2,}/g, ' ').trim() || null;
}
function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`;
}
// "Tuesdays at 7pm" / "1st Thursday at 7pm" / "Sat, Jun 28 at 8pm"
function fmtWhen(r: EventRow): string {
  const t = fmtTime(r.start_time);
  const at = t ? ` at ${t}` : '';
  if (r.freq === 'once' && r.event_date) {
    const d = new Date(r.event_date + 'T12:00:00Z');
    return `${DOW_ABBR[(d.getUTCDay() + 6) % 7]}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}${at}`;
  }
  const days = (r.days_of_week || []).map((d) => DOW_ABBR[d - 1]);
  if (r.freq === 'monthly_dow' && r.week_of_month && days[0]) {
    return `${r.week_of_month === -1 ? 'Last' : ORD[r.week_of_month]} ${days[0]}${at}`;
  }
  if (days.length) return `${days.join(' & ')}${days.length === 1 ? 's' : ''}${at}`;
  return at.trim() || 'See venue';
}

type EventRow = {
  id: number; place_id: string; event_type: string; title: string; description: string | null; url: string | null;
  freq: 'once' | 'weekly' | 'monthly_dow'; days_of_week: number[] | null; week_of_month: number | null;
  event_date: string | null; start_time: string | null; end_time: string | null;
  source: string; verified: boolean; last_confirmed_at: string | null; name?: string; slug?: string;
};

const DAY_URL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export type SpotEvent = {
  id: number; type: string; label: string; emoji: string; title: string; description: string | null;
  when: string; url: string | null; fresh: boolean; confirmedNote: string | null;
  schedule: { byDay: string[]; startTime: string | null; endTime: string | null; freq: string; date: string | null };
  startDate: string | null; endDate: string | null; // next concrete occurrence (ISO, Central) for structured data
};

function freshness(r: EventRow): { fresh: boolean; note: string | null } {
  if (r.verified || r.source === 'admin' || r.source === 'owner') {
    const note = r.last_confirmed_at ? `Confirmed ${ago(r.last_confirmed_at)}` : 'Listed by the guide';
    return { fresh: true, note };
  }
  if (r.last_confirmed_at) {
    const days = (Date.now() - new Date(r.last_confirmed_at).getTime()) / 86400000;
    return { fresh: days < 30, note: days < 30 ? `Confirmed ${ago(r.last_confirmed_at)}` : 'Not recently confirmed, check with the venue' };
  }
  return { fresh: false, note: 'Unconfirmed, check with the venue' };
}
function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

// --- structured-data dates: the next concrete occurrence in America/Chicago (DST-aware) ---
function centralOffset(dateISO: string): string {
  const d = new Date(dateISO + 'T12:00:00Z');
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'longOffset' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value || 'GMT-06:00';
  const m = tz.match(/([+-]\d{2}):?(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '-06:00';
}
function addHours(hhmm: string, h: number): string {
  const [H, M] = hhmm.split(':').map(Number);
  const tot = H * 60 + M + h * 60;
  if (tot >= 1440) return '23:59';
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
}
function nextOccurrence(r: EventRow): { date: string; start: string | null; end: string | null } | null {
  const start = r.start_time ? r.start_time.slice(0, 5) : null;
  const end = r.end_time ? r.end_time.slice(0, 5) : null;
  if (r.freq === 'once') return r.event_date ? { date: r.event_date, start, end } : null;
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const nowHM = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const base = new Date(todayStr + 'T12:00:00Z');
  for (let i = 0; i < 40; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const dow = ((d.getUTCDay() + 6) % 7) + 1;
    const wom = Math.ceil(d.getUTCDate() / 7);
    const isLast = d.getUTCDate() + 7 > new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    let hit = false;
    if (r.freq === 'weekly') hit = (r.days_of_week || []).includes(dow);
    else if (r.freq === 'monthly_dow') hit = (r.days_of_week || []).includes(dow) && (r.week_of_month === wom || (r.week_of_month === -1 && isLast));
    if (hit) { if (i === 0 && start && start < nowHM) continue; return { date: iso, start, end }; }
  }
  return null;
}
function eventDates(r: EventRow): { startDate: string; endDate: string } | null {
  const n = nextOccurrence(r);
  if (!n) return null;
  const off = centralOffset(n.date);
  const startDate = n.start ? `${n.date}T${n.start}:00${off}` : n.date;
  const endT = n.end || (n.start ? addHours(n.start, 2) : null);
  const endDate = endT ? `${n.date}T${endT}:00${off}` : n.date;
  return { startDate, endDate };
}

// Brunch is not an event, it is a restaurant being open on a Sunday. It was the single biggest
// "event type" on the board (9 of 26 rows) and it made the whole board look like filler. Filtered
// here as well as removed from the vocabulary, because the scraper writes straight to this table and
// would happily reintroduce it.
//
// ends_on / starts_on were never checked, so a recurring event with an end date would have run for
// ever. That matters a lot more now that owners can set one.
const LIVE = `e.status = 'approved'
  and e.event_type <> 'brunch'
  and (e.expires_at is null or e.expires_at > now())
  and (e.starts_on is null or e.starts_on <= current_date)
  and (e.ends_on   is null or e.ends_on   >= current_date)`;

export async function getEventsForSpot(slug: string): Promise<SpotEvent[]> {
  const { rows } = await pool.query(
    `select e.* from events e join restaurants r on r.id = e.place_id where r.slug = $1 and ${LIVE} order by e.event_type`, [slug]
  );
  return rows.map((r: EventRow) => {
    const f = freshness(r);
    const d = eventDates(r);
    return {
      id: r.id, type: r.event_type, label: EVENT_LABELS[r.event_type] || 'Event', emoji: EVENT_EMOJI[r.event_type] || '📅',
      title: clean(r.title) || r.title, description: clean(r.description), when: fmtWhen(r), url: r.url,
      fresh: f.fresh, confirmedNote: f.note,
      schedule: {
        byDay: (r.days_of_week || []).map((d) => `https://schema.org/${DAY_URL[d - 1]}`),
        startTime: r.start_time ? r.start_time.slice(0, 5) : null,
        endTime: r.end_time ? r.end_time.slice(0, 5) : null,
        freq: r.freq, date: r.event_date,
      },
      startDate: d?.startDate || null, endDate: d?.endDate || null,
    };
  });
}

/**
 * Everything on the record for one spot, live or not, for the people who manage it.
 *
 * getEventsForSpot() applies LIVE, so it hides anything pending, expired or past its end date. That
 * is right for a diner and wrong for an admin: the admin page was running its own raw SQL and
 * printing "Trivia: Trivia (weekly 3 19:30)", which is a database row, not an event. If the one
 * person who can fix a wrong event cannot read it, they cannot fix it.
 *
 * Same formatter as the owner desk and the public page, so all three describe an event identically.
 * `live` says whether a diner can currently see it, which is the question an admin actually has.
 */
export async function getEventsForSpotAdmin(slug: string): Promise<(SpotEvent & { status: string; live: boolean; verified: boolean; source: string })[]> {
  const { rows } = await pool.query(
    `select e.*, (${LIVE.replace(/\be\./g, 'e.')}) as is_live
       from events e join restaurants r on r.id = e.place_id
      where r.slug = $1 order by e.event_type`, [slug]
  );
  return rows.map((r: EventRow & { status: string; is_live: boolean; verified: boolean; source: string }) => {
    const f = freshness(r);
    const d = eventDates(r);
    return {
      id: r.id, type: r.event_type, label: EVENT_LABELS[r.event_type] || 'Event', emoji: EVENT_EMOJI[r.event_type] || '📅',
      title: clean(r.title) || r.title, description: clean(r.description), when: fmtWhen(r), url: r.url,
      fresh: f.fresh, confirmedNote: f.note,
      schedule: {
        byDay: (r.days_of_week || []).map((n) => `https://schema.org/${DAY_URL[n - 1]}`),
        startTime: r.start_time ? r.start_time.slice(0, 5) : null,
        endTime: r.end_time ? r.end_time.slice(0, 5) : null,
        freq: r.freq, date: r.event_date,
      },
      startDate: d?.startDate || null, endDate: d?.endDate || null,
      status: r.status, live: !!r.is_live, verified: !!r.verified, source: r.source,
    };
  });
}

export type WhatsOnItem = { id: number; type: string; label: string; emoji: string; title: string; when: string; time: string | null; spot: string; slug: string; fresh: boolean };
// `label` is Tonight / Tomorrow / the weekday. `date` is the short stamp (Jul 12). `full` spells the
// whole thing out (Saturday, July 12) because the board reads like a printed listings page.
export type WhatsOnDay = { iso: string; date: string; full: string; label: string; items: WhatsOnItem[] };

// Expand recurring + one-off events across the next 7 days (America/Chicago).
export async function getWhatsOn(): Promise<WhatsOnDay[]> {
  const { rows } = await pool.query(
    // What's On is a local-first board — national chains stay off it (their own page still shows their events).
    `select e.*, r.name, r.slug from events e join restaurants r on r.id = e.place_id where ${LIVE} and coalesce(r.attributes->>'chainStatus','') <> 'chain'`
  );
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  // Chicago wall-clock, HH:MM. Anything TODAY that has already started is over, and listing an 11am
  // sitting under "Tonight" at 8pm makes the whole board look stale and unmaintained.
  // nextOccurrence() already did this for the spot pages; the town-wide board never did.
  const nowHM = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const base = new Date(todayStr + 'T12:00:00Z');
  const days: WhatsOnDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const isoDow = ((d.getUTCDay() + 6) % 7) + 1;
    const wom = Math.ceil(d.getUTCDate() / 7);
    const isLast = d.getUTCDate() + 7 > new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    const items: WhatsOnItem[] = [];
    for (const r of rows as EventRow[]) {
      let hit = false;
      if (r.freq === 'once') hit = r.event_date === iso;
      else if (r.freq === 'weekly') hit = (r.days_of_week || []).includes(isoDow);
      else if (r.freq === 'monthly_dow') hit = (r.days_of_week || []).includes(isoDow) && (r.week_of_month === wom || (r.week_of_month === -1 && isLast));
      if (!hit) continue;
      // Today only: drop anything whose start time has already gone by.
      if (i === 0 && r.start_time && String(r.start_time).slice(0, 5) < nowHM) continue;
      const f = freshness(r);
      items.push({
        id: r.id, type: r.event_type, label: EVENT_LABELS[r.event_type] || 'Event', emoji: EVENT_EMOJI[r.event_type] || '📅',
        title: clean(r.title) || r.title, when: fmtWhen(r), time: fmtTime(r.start_time), spot: clean(r.name || '') || r.name || '', slug: r.slug || '', fresh: f.fresh,
      });
    }
    items.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const label = i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    days.push({
      iso,
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }),
      label,
      items,
    });
  }
  return days;
}
