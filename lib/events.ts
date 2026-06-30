import { pool } from './db';

export const EVENT_LABELS: Record<string, string> = {
  trivia: 'Trivia', karaoke: 'Karaoke', live_music: 'Live Music', bingo: 'Bingo',
  game_night: 'Game Night', comedy: 'Comedy', open_mic: 'Open Mic', book_club: 'Book Club',
  watch_party: 'Watch Party', run_club: 'Run Club', kids_eat_free: 'Kids Eat Free',
  brunch: 'Brunch', market: 'Market', tasting: 'Tasting', other: 'Event',
};
export const EVENT_EMOJI: Record<string, string> = {
  trivia: '🧠', karaoke: '🎤', live_music: '🎸', bingo: '🎱', game_night: '🎲', comedy: '🎙️',
  open_mic: '🎶', book_club: '📚', watch_party: '🏈', run_club: '🏃', kids_eat_free: '🧒',
  brunch: '🥂', market: '🛍️', tasting: '🍷', other: '📅',
};

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

const LIVE = `e.status = 'approved' and (e.expires_at is null or e.expires_at > now())`;

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

export type WhatsOnItem = { id: number; type: string; label: string; emoji: string; title: string; when: string; time: string | null; spot: string; slug: string; fresh: boolean };
export type WhatsOnDay = { iso: string; date: string; label: string; items: WhatsOnItem[] };

// Expand recurring + one-off events across the next 7 days (America/Chicago).
export async function getWhatsOn(): Promise<WhatsOnDay[]> {
  const { rows } = await pool.query(
    `select e.*, r.name, r.slug from events e join restaurants r on r.id = e.place_id where ${LIVE}`
  );
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
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
      const f = freshness(r);
      items.push({
        id: r.id, type: r.event_type, label: EVENT_LABELS[r.event_type] || 'Event', emoji: EVENT_EMOJI[r.event_type] || '📅',
        title: clean(r.title) || r.title, when: fmtWhen(r), time: fmtTime(r.start_time), spot: clean(r.name || '') || r.name || '', slug: r.slug || '', fresh: f.fresh,
      });
    }
    items.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const label = i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    days.push({ iso, date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }), label, items });
  }
  return days;
}
