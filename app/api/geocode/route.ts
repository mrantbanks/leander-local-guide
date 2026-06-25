import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Server-side address -> lat/lng for the map's "you are here" address fallback.
// Keeps the Google key off the client. Biased to the Leander area.
export async function POST(req: NextRequest) {
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
