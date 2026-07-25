import { createHmac } from 'crypto';

/**
 * Turn a caller's IP into the pseudonymous value the `ip_hash` columns have always claimed to hold.
 *
 * The columns are named ip_hash on tips and place_signals, and were being handed the raw address.
 * That is worse than a column honestly named `ip`, because everything downstream (and everyone
 * reading the schema) treats a hash as already de-identified.
 *
 * KEYED, not a bare digest. IPv4 is 4 billion values: a plain sha256 of an address is reversible by
 * anyone with a laptop and an afternoon, so an unkeyed "hash" here would be decoration. The key is
 * AUTH_SECRET, which already exists in the deployment and whose loss is already a re-key event.
 *
 * If no key is configured we return null rather than storing something reversible. We keep this
 * value to tell submissions apart during abuse review; not keeping it is an acceptable outcome, and
 * quietly storing a raw address is not.
 */
export function hashIp(ip: string | null | undefined): string | null {
  const addr = (ip || '').trim();
  if (!addr) return null;
  const key = process.env.IP_HASH_KEY || process.env.AUTH_SECRET;
  if (!key) return null;
  return createHmac('sha256', key).update(addr).digest('hex').slice(0, 32);
}
