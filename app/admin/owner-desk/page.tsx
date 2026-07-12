import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/** The hidden restaurant the demo desk runs on. Hidden = absent from every public surface. */
export const DEMO_SLUG = 'demo-cielo-rojo';

/**
 * The owner-desk demo IS the owner desk.
 *
 * This used to iframe public/owner-desk-demo.html: 754 hand-maintained lines that promised 148/63/211
 * lifetime tiles no real owner will see for a year, still said "Locals Only" months after the rebrand
 * to The Local Passport, and misled a product memo into describing a blank text box that had not
 * existed for weeks. A demo that drifts from the product is worse than no demo, because it is a demo
 * of a product that does not exist.
 *
 * So it now redirects to the REAL /owner/<slug>, on a demo restaurant that is hidden from the whole
 * public site. Admins can open any owner desk (lib/owner.ts canManage). Every change we ever ship to
 * real owners shows up here the same day, automatically, because it is the same code.
 *
 * GUARDRAIL: never rebuild a separate fake of the owner desk. If you want to show it, show it.
 */
export default async function OwnerDeskDemoPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) redirect('/admin');
  redirect(`/owner/${DEMO_SLUG}`);
}
