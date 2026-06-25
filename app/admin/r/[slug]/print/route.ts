import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { mintClaimToken } from '@/lib/owner';
import { certBody, printShell, type CertOpts } from '@/lib/ownerPrint';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

// Loads the restaurant, mints a fresh claim token, returns CertOpts for the certificate sheet.
export async function buildCertOpts(slug: string, operatorEmail: string, operatorName: string): Promise<CertOpts | null> {
  const { rows } = await pool.query(
    `select id, name, primary_category cat, address_formatted, cuisines, ratings, editorial from restaurants where slug = $1`, [slug]);
  const r = rows[0];
  if (!r) return null;
  const { raw, code } = await mintClaimToken(r.id, operatorEmail);
  const qrSvg = await QRCode.toString(`https://leanderlocalguide.com/claim/${raw}`, { type: 'svg', errorCorrectionLevel: 'Q', margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  const rating = Math.round(r.ratings?.google?.rating || 0);
  return {
    name: r.name,
    meta: [r.cat, (r.cuisines || [])[0], 'Leander, TX'].filter(Boolean).join(' · '),
    stars: '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating)),
    quote: r.editorial?.hook || 'A Leander spot worth knowing about.',
    date: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()),
    qrSvg, code, operator: operatorName,
    addr: (r.address_formatted || '').replace(/,?\s*USA$/, ''),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return new Response('Forbidden', { status: 403 });
  const { slug } = await params;
  const opts = await buildCertOpts(slug, session!.user!.email!, session!.user!.name || 'Anthony');
  if (!opts) return new Response('Not found', { status: 404 });
  return new Response(printShell(`Featured Listing — ${opts.name}`, [certBody(opts)]), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' },
  });
}
