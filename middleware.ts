import { NextResponse } from 'next/server';

// Admin auth is now handled by Auth.js (Google sign-in) at the page level.
// This middleware is intentionally a no-op (matches nothing).
export function middleware() {
  return NextResponse.next();
}

export const config = { matcher: ['/__disabled__'] };
