import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { inspectSpot } from '@/lib/seo-inspect';
import SeoInspector from '@/components/SeoInspector';

export const dynamic = 'force-dynamic';

export default async function AdminSeoSpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) redirect('/admin');
  const { slug } = await params;
  const data = await inspectSpot(slug);
  if (!data) notFound();
  return (
    <main className="px-5 py-6">
      <Link href="/admin/seo" className="inline-flex font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft hover:text-chile mb-4">← All pages</Link>
      <SeoInspector slug={data.slug} name={data.name} hidden={data.hidden} pages={data.pages} />
    </main>
  );
}
