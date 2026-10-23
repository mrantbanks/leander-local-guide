import { NextResponse } from 'next/server';

// Admin auth is now handled by Auth.js (Google sign-in) at the page level.
// This proxy (Next 16's name for middleware) is intentionally a no-op (matches nothing).
export function proxy() {
  return NextResponse.next();
}

export const config = { matcher: ['/__disabled__'] };
