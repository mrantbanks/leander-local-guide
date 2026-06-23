// Verify a Cloudflare Turnstile token server-side.
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const d = await r.json();
    return !!d.success;
  } catch {
    return false;
  }
}
