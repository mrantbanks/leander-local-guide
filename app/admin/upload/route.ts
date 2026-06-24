import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { putUpload } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const fd = await req.formData();
  const slug = String(fd.get('slug') || '');
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  const placeId = rows[0].id;
  const email = (session!.user as { email?: string }).email || null;
  const files = fd.getAll('photos').filter((f): f is File => f instanceof File);
  let saved = 0;
  for (const file of files.slice(0, 12)) {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) continue;
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fn = `${randomUUID()}.${ext}`;
    await putUpload(fn, Buffer.from(await file.arrayBuffer()), file.type);
    await pool.query('insert into photos (place_id, filename, source, uploaded_by) values ($1,$2,$3,$4)', [placeId, fn, 'admin', email]);
    saved++;
  }
  return NextResponse.json({ saved });
}
