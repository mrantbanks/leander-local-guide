'use server';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

async function ok(): Promise<boolean> {
  const s = await auth();
  return !!(s?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
}

export async function addProvider(fd: FormData) {
  if (!(await ok())) return;
  const name = String(fd.get('name') || '').trim();
  const kind = String(fd.get('kind') || 'log');
  if (!name) return;
  const config: Record<string, string> = {
    from: String(fd.get('from') || 'Anthony@leanderlocalguide.com'),
    fromName: 'Anthony, The Leander Local',
  };
  if (kind === 'mailjet') { config.apiKey = String(fd.get('apiKey') || ''); config.apiSecret = String(fd.get('apiSecret') || ''); }
  if (kind === 'resend' || kind === 'sendgrid') { config.apiKey = String(fd.get('apiKey') || ''); }
  await pool.query(
    'insert into email_providers (name,kind,config,daily_quota,monthly_quota,priority) values ($1,$2,$3,$4,$5,$6)',
    [name, kind, JSON.stringify(config), parseInt(String(fd.get('daily') || '200'), 10) || 200, parseInt(String(fd.get('monthly') || '6000'), 10) || 6000, parseInt(String(fd.get('priority') || '50'), 10) || 50]
  );
  revalidatePath('/admin/email');
}

export async function toggleProvider(id: number) {
  if (!(await ok())) return;
  await pool.query('update email_providers set enabled = not enabled where id=$1', [id]);
  revalidatePath('/admin/email');
}

export async function deleteProvider(id: number) {
  if (!(await ok())) return;
  await pool.query('delete from email_providers where id=$1', [id]);
  revalidatePath('/admin/email');
}

export async function createBroadcast(fd: FormData) {
  if (!(await ok())) return;
  const subject = String(fd.get('subject') || '').trim();
  const raw = String(fd.get('body') || '').trim();
  if (!subject || !raw) return;
  // plain text -> simple paragraphs (the sender wraps this in the email shell)
  const body = raw.split(/\n\n+/).map((b) => `<p style="font-size:16px;line-height:1.7;margin:0 0 14px;">${b.replace(/\n/g, '<br>')}</p>`).join('');
  const when = String(fd.get('scheduledAt') || '');
  const scheduledAt = when ? new Date(when) : new Date();
  await pool.query("insert into email_campaigns (kind,subject,body,status,scheduled_at) values ('broadcast',$1,$2,'scheduled',$3)", [subject, body, scheduledAt]);
  revalidatePath('/admin/email');
}
