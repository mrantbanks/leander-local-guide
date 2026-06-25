import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { putUpload } from '@/lib/r2';
import { uploadUrl } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

// Admin-only multi-upload (raw or edited images) -> R2 -> approved editorial photos.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean; email?: string } | undefined)?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const email = (session!.user as { email?: string }).email!;
  const fd = await req.formData();
  const slug = String(fd.get('slug') || '');
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  const placeId = rows[0].id;

  const files = fd.getAll('files').filter((f): f is File => f instanceof File);
  const saved: { id: number; filename: string; url: string }[] = [];
  for (const file of files.slice(0, 24)) {
    if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) continue;
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fn = `${randomUUID()}.${ext}`;
    await putUpload(fn, Buffer.from(await file.arrayBuffer()), file.type);
    const ins = await pool.query(
      "insert into photos (place_id, filename, source, status, uploaded_by, rights_ack, rights_ack_at) values ($1,$2,'editorial','approved',$3,true,now()) returning id",
      [placeId, fn, email]);
    saved.push({ id: ins.rows[0].id, filename: fn, url: uploadUrl(fn) });
  }
  return NextResponse.json({ saved });
}
