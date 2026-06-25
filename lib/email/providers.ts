import { pool } from '@/lib/db';

export type Provider = {
  id: number; name: string; kind: string; config: Record<string, string>;
  daily_quota: number; monthly_quota: number; sent_today: number; sent_month: number;
};

// Roll per-day/per-month counters, then pick the enabled provider with remaining
// capacity and the lowest priority number. Returns null if all are tapped out.
export async function pickProvider(): Promise<Provider | null> {
  await pool.query("update email_providers set sent_today=0, day_anchor=current_date where coalesce(day_anchor, date '2000-01-01') <> current_date");
  await pool.query("update email_providers set sent_month=0, month_anchor=date_trunc('month',current_date)::date where coalesce(month_anchor, date '2000-01-01') <> date_trunc('month',current_date)::date");
  const { rows } = await pool.query(
    "select id,name,kind,config,daily_quota,monthly_quota,sent_today,sent_month from email_providers where enabled and sent_today < daily_quota and sent_month < monthly_quota order by priority, id limit 1"
  );
  return (rows[0] as Provider) || null;
}

// Deliver via the chosen provider. Add new API providers by extending the switch.
export async function deliver(p: Provider, to: string, subject: string, html: string): Promise<void> {
  const from = p.config?.from || 'Anthony@leanderlocalguide.com';
  const fromName = p.config?.fromName || 'Anthony, The Leander Local';

  if (p.kind === 'log') {
    console.log(`[email:log] via="${p.name}" to=${to} subject="${subject}"`);
    return;
  }
  if (p.kind === 'mailjet') {
    const r = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${p.config.apiKey}:${p.config.apiSecret}`).toString('base64') },
      body: JSON.stringify({ Messages: [{ From: { Email: from, Name: fromName }, To: [{ Email: to }], Subject: subject, HTMLPart: html }] }),
    });
    if (!r.ok) throw new Error(`mailjet ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  if (p.kind === 'resend') {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.config.apiKey}` },
      body: JSON.stringify({ from: `${fromName} <${from}>`, to, subject, html }),
    });
    if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  if (p.kind === 'sendgrid') {
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.config.apiKey}` },
      body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: from, name: fromName }, subject, content: [{ type: 'text/html', value: html }] }),
    });
    if (!r.ok) throw new Error(`sendgrid ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  throw new Error('unknown provider kind ' + p.kind);
}
