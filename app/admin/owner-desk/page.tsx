import Link from 'next/link';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function OwnerDeskDemoPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">Owner Desk</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-5 max-w-2xl leading-relaxed">
        A clickable walkthrough of what a verified owner sees after they claim a listing — sign-in, stats, the “From the owner” editor, hours, and Locals Only deals. It runs on dummy data (Cielo Rojo Taquería) and saves nothing. <a href="/owner-desk-demo.html" target="_blank" className="text-chile hover:text-oxblood">Open in a new tab →</a>
      </p>
      <div className="border-2 border-ink rounded-[2px] overflow-hidden bg-paper" style={{ height: 'calc(100vh - 220px)', minHeight: 560 }}>
        <iframe title="Owner desk demo" src="/owner-desk-demo.html" className="w-full h-full" style={{ border: 0 }} />
      </div>
    </main>
  );
}
