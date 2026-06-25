import { pool } from '@/lib/db';
import { pickProvider, deliver } from './providers';

type SendOpts = {
  to: string; subject: string; html: string;
  subscriberId?: string | null; kind: string; campaignId?: number | null; arStep?: number | null;
};

// Send one email: pick a provider with capacity, deliver, bump its counters, and
// log the result to email_sends. Returns true on success. Quota / failover handled
// by pickProvider (lowest-priority provider that still has daily+monthly headroom).
export async function sendEmail(o: SendOpts): Promise<boolean> {
  const p = await pickProvider();
  const sub = o.subscriberId || null, cid = o.campaignId ?? null, step = o.arStep ?? null;
  if (!p) {
    await pool.query("insert into email_sends (subscriber_id,campaign_id,ar_step,kind,provider_id,status,error) values ($1,$2,$3,$4,null,'failed','no provider with capacity')", [sub, cid, step, o.kind]);
    return false;
  }
  try {
    await deliver(p, o.to, o.subject, o.html);
    await pool.query('update email_providers set sent_today=sent_today+1, sent_month=sent_month+1 where id=$1', [p.id]);
    await pool.query("insert into email_sends (subscriber_id,campaign_id,ar_step,kind,provider_id,status) values ($1,$2,$3,$4,$5,'sent')", [sub, cid, step, o.kind, p.id]);
    return true;
  } catch (e) {
    await pool.query("insert into email_sends (subscriber_id,campaign_id,ar_step,kind,provider_id,status,error) values ($1,$2,$3,$4,$5,'failed',$6)", [sub, cid, step, o.kind, p.id, String((e as Error).message).slice(0, 300)]);
    return false;
  }
}
