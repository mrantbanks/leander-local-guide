import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, ipOf } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

// Server-side address -> lat/lng for the map's "you are here" address fallback.
// Keeps the Google key off the client. Biased to the Leander area.
export async function POST(req: NextRequest) {
  // This spends money. Every call is a billed Google Geocoding request, there is no sign-in in
  // front of it (the map has to work for a stranger), and it is trivially scriptable, so an
  // unmetered version is somebody else's budget to burn and our map to break when the quota goes.
  // A person locating themselves on the map does it once or twice; 15 an hour is generous.
  const rl = rateLimit(`geocode:${ipOf(req)}`, 15, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many lookups, try again shortly' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const a = String(body.address || '').trim();
  if (a.length < 3) return NextResponse.json({ error: 'Enter an address' }, { status: 400 });
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return NextResponse.json({ error: 'Geocoding unavailable' }, { status: 503 });
  const q = /leander|texas|\btx\b|\d{5}/i.test(a) ? a : `${a}, Leander, TX`;
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&region=us&key=${key}`);
    const j = await r.json();
    const loc = j.status === 'OK' && j.results?.[0]?.geometry?.location;
    if (!loc) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    return NextResponse.json({ lat: loc.lat, lng: loc.lng });
  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
  }
}
