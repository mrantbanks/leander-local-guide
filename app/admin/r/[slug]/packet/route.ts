import { auth } from '@/auth';
import { certBody, printShell } from '@/lib/ownerPrint';
import { buildCertOpts } from '../print/route';
import { buildGuideBody } from '../guide/route';

export const dynamic = 'force-dynamic';

// Both leave-behinds in one print job: the claim certificate (page 1) + the Owner Desk guide (page 2).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return new Response('Forbidden', { status: 403 });
  const { slug } = await params;
  const opts = await buildCertOpts(slug, session!.user!.email!, session!.user!.name || 'Anthony');
  if (!opts) return new Response('Not found', { status: 404 });
  const guide = await buildGuideBody(opts.name);
  return new Response(printShell(`Owner packet — ${opts.name}`, [certBody(opts), guide]), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' },
  });
}
