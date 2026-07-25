/**
 * A link we are willing to put an href on.
 *
 * Returns null for anything that is not plain http(s). React 19 already refuses to render a
 * `javascript:` href, so this is not the last line of defence against script execution, but it is
 * the only line of defence against the rest of it: `data:` documents, `vbscript:`, and the general
 * case of an owner pointing their listing's "Website" at somewhere that is not a website. The
 * admin editor has always normalised links this way; the owner desk did not, which meant the one
 * field a stranger could write went in raw.
 *
 * A bare domain is assumed https, because owners type "tacos.com" and mean it.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  let u: URL;
  try { u = new URL(withScheme); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (!u.hostname || !u.hostname.includes('.')) return null; // "https://localhost", "https://x"
  return u.toString();
}
