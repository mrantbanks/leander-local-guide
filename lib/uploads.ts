// Public base URL for uploaded photos (Cloudflare R2 custom domain, edge-served).
export const UPLOADS_BASE = process.env.UPLOADS_BASE || 'https://img.leanderlocalguide.com';
export const uploadUrl = (filename: string) => `${UPLOADS_BASE}/${filename}`;
