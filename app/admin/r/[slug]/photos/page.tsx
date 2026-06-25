import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import PhotoStudio from '@/components/PhotoStudio';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photos', robots: { index: false } };

export default async function AdminPhotos({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) redirect('/');
  const { slug } = await params;
  const { rows } = await pool.query("select name, photos->0->>'name' google_photo from restaurants where slug = $1", [slug]);
  if (!rows[0]) return <main className="p-10 text-center font-ui">Not found.</main>;
  const ph = await pool.query('select id, filename, caption, is_menu, is_header from photos where place_id = (select id from restaurants where slug = $1) order by sort, created_at', [slug]);

  return (
    <main className="max-w-3xl mx-auto px-5 py-8">
      <Link href={`/admin/r/${slug}`} className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile">← Back to {rows[0].name}</Link>
      <h1 className="font-display font-black text-3xl text-ink mt-2 mb-1">Photos · {rows[0].name}</h1>
      <p className="font-ui text-sm text-ink-soft mb-5">Upload one or many, then edit any photo: crop, rotate, color, or AI magic-edit. <b>Drag to reorder.</b> The <b>Google</b> image is the header by default; tap ★ on a photo to make it the header instead. 📋 marks a menu.</p>
      <PhotoStudio slug={slug} googlePhoto={rows[0].google_photo} initial={ph.rows.map((p) => ({ id: p.id, filename: p.filename, caption: p.caption, isMenu: p.is_menu, isHeader: p.is_header }))} />
    </main>
  );
}
