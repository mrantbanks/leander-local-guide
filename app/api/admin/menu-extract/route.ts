import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { runJSON } from '@/lib/ai/router';
import { UPLOAD_DIR } from '@/lib/r2';
import type { MenuData, MenuSection } from '@/lib/spots';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/* eslint-disable @typescript-eslint/no-explicit-any */
let sharpMod: any = undefined;
async function loadSharp(): Promise<any> {
  if (sharpMod === undefined) { try { sharpMod = (await import('sharp')).default; } catch { sharpMod = null; } }
  return sharpMod;
}

const dedash = (s: unknown) => typeof s === 'string' ? s.replace(/[ \t]*[—–][ \t]*/g, ', ').replace(/[—–]/g, '-').trim() : undefined;

// Normalize whatever the model returns into a strict MenuData shape; drop anything malformed.
function normalizeSections(raw: unknown): MenuSection[] {
  if (!Array.isArray(raw)) return [];
  const sections: MenuSection[] = [];
  for (const s of raw as any[]) {
    const name = dedash(s?.name);
    const items = Array.isArray(s?.items) ? s.items : [];
    const clean = items.map((it: any) => ({
      name: dedash(it?.name) || '',
      ...(dedash(it?.desc) ? { desc: dedash(it?.desc) } : {}),
      ...(dedash(String(it?.price ?? '')) ? { price: dedash(String(it.price)) } : {}),
    })).filter((it: { name: string }) => it.name);
    if (name && clean.length) sections.push({ name, ...(dedash(s?.note) ? { note: dedash(s?.note) } : {}), items: clean });
  }
  return sections;
}

// Admin-only: transcribe the photos marked 📋 Menu into structured menu data (saved as a draft
// on restaurants.menu; the admin can hand-edit it in the Menu studio before/after it goes live).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { slug } = await req.json().catch(() => ({}));
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const spot = await pool.query('select id, name, menu from restaurants where slug = $1', [slug]);
  if (!spot.rows[0]) return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
  const ph = await pool.query(
    `select id, filename from photos where place_id = $1 and is_menu and status = 'approved' order by sort, created_at limit 8`,
    [spot.rows[0].id]
  );
  if (!ph.rows.length) return NextResponse.json({ error: 'No photos are marked as menu yet. In the photo studio, hover a menu photo and tap 📋 first.' }, { status: 400 });

  // Downscale to keep the vision payload sane while every word stays legible.
  const sh = await loadSharp();
  const images: { mimeType: string; data: string }[] = [];
  for (const p of ph.rows) {
    try {
      let buf = await readFile(path.join(UPLOAD_DIR, p.filename));
      if (sh) { try { buf = await sh(buf).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(); } catch { /* keep original */ } }
      images.push({ mimeType: 'image/jpeg', data: buf.toString('base64') });
    } catch { /* missing file: skip */ }
  }
  if (!images.length) return NextResponse.json({ error: 'Menu photo files could not be read' }, { status: 500 });

  const prompt = `These photo(s) show the printed menu of the restaurant "${spot.rows[0].name}". Transcribe the ENTIRE menu into structured data.

Return ONLY minified JSON with exactly this shape:
{"sections":[{"name":"<section heading as printed>","note":"<optional section-wide note, e.g. choose-your-protein pricing>","items":[{"name":"<dish name>","desc":"<the printed description, only if one is printed>","price":"<price as printed, digits only, no $ sign; multi-size prices verbatim like 3/5/8>"}]}]}

Rules:
- Transcribe EXACTLY what is printed. Never invent, guess, or embellish dish names, descriptions, or prices.
- LEGIBILITY BAR: only include a description if you can read EVERY word of it with certainty. If any word is blurry or ambiguous, omit the desc field entirely for that item. A missing description is correct; a garbled or guessed one is a serious error.
- Same bar for prices: if a digit is not certain, omit the price.
- Keep the menu's own section order and item order.
- Dish names in Title Case even if printed ALL CAPS.
- If a price is per-protein or sized (e.g. Chicken 14 / Beef 16, or S/M/L 3/5/8), put shared pricing in the section note and the per-item price only when the item has its own.
- Skip anything illegible rather than guessing. Skip decorative text, addresses, phone numbers.
- No em or en dashes anywhere.`;

  try {
    const out: any = await runJSON('menus', prompt, { images, maxTokens: 8192, temperature: 0 });
    const sections = normalizeSections(out?.sections);
    if (!sections.length) return NextResponse.json({ error: 'The AI could not read a menu out of those photos' }, { status: 502 });
    const menu: MenuData = {
      sections,
      extracted: new Date().toISOString().slice(0, 10),
      photoIds: ph.rows.map((p) => p.id as number),
      ...(spot.rows[0].menu?.note ? { note: spot.rows[0].menu.note } : {}),
    };
    await pool.query('update restaurants set menu = $2::jsonb, updated_at = now() where slug = $1', [slug, JSON.stringify(menu)]);
    return NextResponse.json({ menu, photoCount: images.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
