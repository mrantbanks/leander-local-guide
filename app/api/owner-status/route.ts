import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isVerifiedOwner } from '@/lib/spots';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  const slug = req.nextUrl.searchParams.get('slug') || '';
  const isOwner = email ? await isVerifiedOwner(slug, email) : false;
  return NextResponse.json({ loggedIn: !!email, isOwner }, { headers: { 'Cache-Control': 'private, no-store' } });
}
