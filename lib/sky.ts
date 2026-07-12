// What the sky over Leander is actually doing, right now.
//
// Open-Meteo needs no API key and no account, which is why it is here rather than one of the paid
// ones. Cached for ten minutes: the weather does not change faster than that, and the homepage is
// force-dynamic, so without a cache we would hit them on every single page load.

const LAT = 30.5788;
const LNG = -97.8531; // Leander, TX
export const TZ = 'America/Chicago';

export type Condition = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow';

/** Night, the two golden hours either side of it, and plain daylight. Drives the colour of the wash. */
export type DayPart = 'night' | 'dawn' | 'day' | 'dusk';

export type Sky = {
  isDay: boolean;
  part: DayPart;
  tempF: number | null;
  condition: Condition;
  description: string;
  /** 0 = new, 0.5 = full, 1 = new again. */
  moonPhase: number;
  moonName: string;
  /** Fraction of the disc that is lit, 0 to 1. */
  moonLit: number;
  localTime: string;
  ok: boolean; // false when the fetch failed and we are guessing from the clock alone
};

// WMO weather interpretation codes. Grouped into the handful of things you would actually draw.
function readCode(code: number): { condition: Condition; description: string } {
  if (code === 0) return { condition: 'clear', description: 'Clear' };
  if (code === 1) return { condition: 'clear', description: 'Mostly clear' };
  if (code === 2) return { condition: 'partly', description: 'Partly cloudy' };
  if (code === 3) return { condition: 'cloudy', description: 'Overcast' };
  if (code === 45 || code === 48) return { condition: 'fog', description: 'Fog' };
  if (code >= 51 && code <= 57) return { condition: 'rain', description: 'Drizzle' };
  if (code >= 61 && code <= 67) return { condition: 'rain', description: 'Rain' };
  if (code >= 71 && code <= 77) return { condition: 'snow', description: 'Snow' };
  if (code >= 80 && code <= 82) return { condition: 'rain', description: 'Showers' };
  if (code >= 85 && code <= 86) return { condition: 'snow', description: 'Snow showers' };
  if (code >= 95) return { condition: 'storm', description: 'Thunderstorm' };
  return { condition: 'partly', description: 'Cloudy' };
}

const PHASES: [number, string][] = [
  [0.03, 'New moon'],
  [0.22, 'Waxing crescent'],
  [0.28, 'First quarter'],
  [0.47, 'Waxing gibbous'],
  [0.53, 'Full moon'],
  [0.72, 'Waning gibbous'],
  [0.78, 'Last quarter'],
  [0.97, 'Waning crescent'],
];

/**
 * Moon phase from the date. No API: the moon is extremely predictable.
 *
 * Days since a known new moon (6 Jan 2000, 18:14 UTC), modulo the synodic month. Good to within a
 * couple of hours, which is far more than enough to draw the right shape in the corner of a
 * restaurant guide.
 */
export function moonPhaseOf(now: Date): { phase: number; name: string; lit: number } {
  const SYNODIC = 29.530588853;
  const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const days = now.getTime() / 86400000 - KNOWN_NEW;
  const phase = ((days % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC; // 0..1

  const name = PHASES.find(([edge]) => phase < edge)?.[1] ?? 'New moon';
  // Illuminated fraction: 0 at new, 1 at full, and back.
  const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  return { phase, name, lit };
}

export async function getSky(): Promise<Sky> {
  const now = new Date();
  const moon = moonPhaseOf(now);
  const localTime = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', minute: '2-digit',
  }).format(now);

  // If the hour is between 7pm and 7am, assume night. Only used if the fetch fails.
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(now));
  const fallbackDay = hour >= 7 && hour < 20;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
      `&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&forecast_days=1` +
      `&temperature_unit=fahrenheit&timezone=${encodeURIComponent(TZ)}`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    const cur = j?.current;
    if (!cur) throw new Error('no current');

    const { condition, description } = readCode(Number(cur.weather_code));

    // Golden hour, properly: within an hour of the real sunrise or sunset for THIS date, not a guess
    // from the clock. It is the difference between the corner glowing amber at the right moment and
    // glowing amber because somebody hardcoded 6pm.
    const isDay = cur.is_day === 1;
    let part: DayPart = isDay ? 'day' : 'night';
    const sunrise = j?.daily?.sunrise?.[0] ? new Date(j.daily.sunrise[0]).getTime() : null;
    const sunset = j?.daily?.sunset?.[0] ? new Date(j.daily.sunset[0]).getTime() : null;
    const t = now.getTime();
    const HOUR = 3_600_000;
    if (sunrise && Math.abs(t - sunrise) < HOUR) part = 'dawn';
    else if (sunset && Math.abs(t - sunset) < HOUR) part = 'dusk';

    return {
      isDay,
      part,
      tempF: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null,
      condition,
      description,
      moonPhase: moon.phase,
      moonName: moon.name,
      moonLit: moon.lit,
      localTime,
      ok: true,
    };
  } catch {
    // The sky still exists even when the API does not. Draw the clock and the moon, say nothing
    // about the weather rather than inventing it.
    return {
      isDay: fallbackDay,
      part: fallbackDay ? 'day' : 'night',
      tempF: null,
      condition: 'clear',
      description: '',
      moonPhase: moon.phase,
      moonName: moon.name,
      moonLit: moon.lit,
      localTime,
      ok: false,
    };
  }
}
