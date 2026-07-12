import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';
import { putUpload } from '@/lib/r2';
import { autoCaption } from '@/lib/ai/caption';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!email) return NextResponse.json({ error: 'Sign in to add photos' }, { status: 401 });

  const fd = await req.formData();
  const token = String(fd.get('turnstileToken') || fd.get('cf-turnstile-response') || '');
  const ip = req.headers.get('cf-connecting-ip') || undefined;
  if (!(await verifyTurnstile(token, ip))) return NextResponse.json({ error: 'Verification failed, please try again' }, { status: 400 });
  if (fd.get('rights') !== 'true') return NextResponse.json({ error: 'Rights acknowledgment required' }, { status: 400 });

  const slug = String(fd.get('slug') || '');
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  const placeId = rows[0].id;
  const cnt = await pool.query("select count(*)::int n from photos where uploaded_by = $1 and created_at > now() - interval '1 day'", [email]);
  if (cnt.rows[0].n >= 30) return NextResponse.json({ error: "You've hit today's photo limit, try again tomorrow" }, { status: 429 });

  const files = fd.getAll('photos').filter((f): f is File => f instanceof File);
  let saved = 0;
  for (const file of files.slice(0, 6)) {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) continue;
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fn = `${randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await putUpload(fn, buf, file.type);
    const ins = await pool.query(
      "insert into photos (place_id, filename, source, status, uploaded_by, rights_ack, rights_ack_at) values ($1,$2,'user','pending',$3,true,now()) returning id",
      [placeId, fn, email]
    );
    // Reader photos get captioned too, even though they wait in the moderation queue: a captioned
    // photo is quicker to judge, and the caption is the guide's own words either way.
    void autoCaption(ins.rows[0].id as number, placeId, buf, file.type);
    saved++;
  }
  return NextResponse.json({ saved });
}
