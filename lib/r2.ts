import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

// Photo storage. R2 write is currently deferred (token not authorized for this bucket), so we
// store uploads on the local persisted volume (llg-uploads -> /app/uploads), served via /uploads/[name].
export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

export async function putUpload(key: string, body: Buffer, _contentType: string): Promise<void> {
  const safe = path.basename(key); // never escape the dir
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, safe), body);
}

export async function deleteUpload(filename: string): Promise<void> {
  try { await unlink(path.join(UPLOAD_DIR, path.basename(filename))); } catch { /* already gone */ }
}
