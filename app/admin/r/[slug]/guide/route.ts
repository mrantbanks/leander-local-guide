import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { guideBody, printShell } from '@/lib/ownerPrint';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function buildGuideBody(name: string): Promise<string> {
  const qrSvg = await QRCode.toString('https://leanderlocalguide.com/owner', { type: 'svg', errorCorrectionLevel: 'Q', margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  return guideBody({ name, qrSvg });
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return new Response('Forbidden', { status: 403 });
  const { slug } = await params;
  const { rows } = await pool.query(`select name from restaurants where slug = $1`, [slug]);
  if (!rows[0]) return new Response('Not found', { status: 404 });
  return new Response(printShell(`Owner Desk guide — ${rows[0].name}`, [await buildGuideBody(rows[0].name)]), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
