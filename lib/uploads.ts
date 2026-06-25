// Local uploads are served same-origin via the /uploads/[name] route (sharp-resized, CF-cacheable).
// (R2 custom-domain serving is deferred until the R2 write token is fixed.)
export const uploadUrl = (filename: string) => `/uploads/${filename}`;
