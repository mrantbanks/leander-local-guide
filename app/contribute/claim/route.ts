import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!email) return NextResponse.json({ error: 'Sign in to claim' }, { status: 401 });

  const fd = await req.formData();
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  if (!(await verifyTurnstile(String(fd.get('turnstileToken') || ''), ip ?? undefined))) return NextResponse.json({ error: 'Verification failed, try again' }, { status: 400 });

  const slug = String(fd.get('slug') || '');
  const role = String(fd.get('role') || '').trim().slice(0, 80);
  const contact = String(fd.get('contact') || '').trim().slice(0, 200);
  if (!role || !contact) return NextResponse.json({ error: 'Tell us your role and a contact' }, { status: 400 });

  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  await pool.query(
    `insert into claims (place_id, user_email, role, contact, ip, status) values ($1,$2,$3,$4,$5,'pending')
     on conflict (place_id, user_email) do update set role = $3, contact = $4, ip = $5, status = 'pending', created_at = now()`,
    [rows[0].id, email, role, contact, ip]
  );
  return NextResponse.json({ ok: true });
}
