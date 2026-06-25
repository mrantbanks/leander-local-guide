export type LL = { lat: number; lng: number };

// Straight-line miles. Plenty for a "what's near me" guide; no API, no PostGIS round-trip.
export function haversineMi(a: LL, b: LL): number {
  const R = 3958.8, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Deep-link into the user's native maps app. $0, no key, native turn-by-turn.
export function directionsUrl(p: { lat: number; lng: number }, apple: boolean): string {
  return apple
    ? `https://maps.apple.com/?daddr=${p.lat},${p.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

export function isApple(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
}
