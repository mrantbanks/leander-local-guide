// Module-resolution hooks so `node --test` can import the app's real TypeScript modules.
//
// Two jobs:
//   1. Resolve the `@/...` path alias from tsconfig, which Node knows nothing about.
//   2. Redirect the few framework/driver modules that would otherwise open a socket or demand a
//      request context: `pg` and `next/headers`. Everything else under test is the REAL code, on
//      purpose: a security test that runs against a copy of the logic proves nothing.
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const STUBS = {
  pg: path.join(ROOT, 'tests/stubs/pg.mjs'),
  'next/headers': path.join(ROOT, 'tests/stubs/next-headers.mjs'),
};

function withExt(p) {
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  for (const ext of ['.ts', '.tsx', '.mjs', '.js']) {
    if (fs.existsSync(p + ext)) return p + ext;
  }
  const idx = path.join(p, 'index.ts');
  return fs.existsSync(idx) ? idx : p;
}

export async function resolve(specifier, context, next) {
  if (STUBS[specifier]) {
    return { url: pathToFileURL(STUBS[specifier]).href, shortCircuit: true };
  }
  if (specifier.startsWith('@/')) {
    const target = withExt(path.join(ROOT, specifier.slice(2)));
    return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  // Relative imports between .ts files omit the extension; Node requires one.
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts')) {
    const base = path.dirname(new URL(context.parentURL).pathname);
    const target = withExt(path.resolve(base, specifier));
    if (fs.existsSync(target)) return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  return next(specifier, context);
}
