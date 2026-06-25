import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || '';
  await pool.query("update subscribers set status='unsubscribed', ar_next_due=null where unsub_token=$1", [t]);
  return new NextResponse(
    `<!doctype html><html><body style="margin:0;background:#f4efe6;font-family:Georgia,serif;color:#221d18;">
     <div style="max-width:520px;margin:60px auto;padding:0 22px;text-align:center;">
       <h1 style="font-size:28px;">You're unsubscribed.</h1>
       <p style="font-size:16px;line-height:1.6;color:#5a534a;">No hard feelings. The door's open if you ever want back in.</p>
       <p><a href="https://leanderlocalguide.com" style="color:#9a3324;">Back to the guide</a></p>
     </div></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}
