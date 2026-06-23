import { Pool } from 'pg';

// Single pooled connection to llg-db (reused across hot reloads / requests).
const g = globalThis as unknown as { _llgPool?: Pool };
export const pool =
  g._llgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
if (process.env.NODE_ENV !== 'production') g._llgPool = pool;
