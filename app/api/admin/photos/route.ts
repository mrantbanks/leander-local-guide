import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { revalidateSpot } from '@/lib/revalidate';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { putUpload, deleteUpload } from '@/lib/r2';
import { uploadUrl } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

const extOf = (t: string) => (t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : 'jpg');

// Admin-only: multi-upload new photos, OR (with replaceId) swap one existing photo in place.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean; email?: string } | undefined)?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const email = (session!.user as { email?: string }).email!;
  const fd = await req.formData();
  const slug = String(fd.get('slug') || '');
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  const placeId = rows[0].id;
  const replaceId = Number(fd.get('replaceId')) || 0;

  const files = fd.getAll('files').filter((f): f is File => f instanceof File);
  const saved: { id: number; filename: string; url: string }[] = [];
  try {
    // Overwrite an existing photo in place: same row (keeps sort/main + caption), new file, old file deleted.
    if (replaceId) {
      const file = files[0];
      if (!file || !file.type.startsWith('image/')) return NextResponse.json({ error: 'No image to save' }, { status: 400 });
      const old = await pool.query('select filename from photos where id = $1 and place_id = $2', [replaceId, placeId]);
      if (!old.rows[0]) return NextResponse.json({ error: 'photo not found' }, { status: 404 });
      const fn = `${randomUUID()}.${extOf(file.type)}`;
      await putUpload(fn, Buffer.from(await file.arrayBuffer()), file.type);
      await pool.query('update photos set filename = $2 where id = $1', [replaceId, fn]);
      await deleteUpload(old.rows[0].filename);
      revalidateSpot(slug);
      return NextResponse.json({ saved: [{ id: replaceId, filename: fn, url: uploadUrl(fn) }], replaced: true });
    }
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
  } catch (e) {
    return NextResponse.json({ error: `Storage error: ${(e as Error).name} — ${(e as Error).message}`, saved }, { status: 500 });
  }
  return NextResponse.json({ saved });
}
