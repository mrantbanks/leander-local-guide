import type { ReactNode } from 'react';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import AdminSidebar from '@/components/AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  // Sign-in / not-admin screens render without the sidebar.
  if (!isAdmin) return <>{children}</>;
  const pend = await pool.query(
    "select ((select count(*) from photos where status='pending')+(select count(*) from tips where status='pending')+(select count(*) from reviews where status='pending')+(select count(*) from claims where status='pending')+(select count(*) from events where status='pending'))::int n"
  );
  return (
    <div className="flex">
      <AdminSidebar pending={pend.rows[0].n as number} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
