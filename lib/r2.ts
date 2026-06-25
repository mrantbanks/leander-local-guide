import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Photo storage. R2 write is currently deferred (token is read-only), so we store
// uploads on the local persisted volume (llg-uploads -> /app/uploads) and serve via /u/[name].
export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

export async function putUpload(key: string, body: Buffer, _contentType: string): Promise<void> {
  const safe = path.basename(key); // never escape the dir
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, safe), body);
}
