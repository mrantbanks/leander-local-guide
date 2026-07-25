// Minimal `next/headers` so lib/ratelimit.ts can be imported outside a request.
let CURRENT = new Map();

export function __setHeaders(obj) {
  CURRENT = new Map(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

export async function headers() {
  return { get: (name) => CURRENT.get(String(name).toLowerCase()) ?? null };
}

export async function cookies() {
  return { get: () => undefined, set: () => {} };
}
