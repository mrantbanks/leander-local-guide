/**
 * Cut a new block for the Leander Type Case.
 *
 *   node scripts/icons.mjs                  # gates + rebuild lib/icons.ts from scripts/icon-blocks/
 *   node scripts/icons.mjs cut <name>       # generate a NEW block, trace it, gate it
 *
 * Needs `potrace` and ImageMagick on the box, and GEMINI_API_KEY (it lives in the site .env on web1,
 * not on the conductor, so a cut runs inside the llg-web container).
 *
 * WHY THIS SCRIPT EXISTS AT ALL: the icons are generated, and a generated thing you cannot regenerate
 * is a liability. The prompt below IS the design system. If you want a new icon, add a line to
 * SUBJECTS and run it. Do not hand-draw one, it will not match.
 *
 * THE THREE THINGS THAT WILL BITE YOU, all of which cost real time to find:
 *
 *  1. potrace emits a flipped Y axis and coordinates in the thousands. We do not rewrite the path
 *     arithmetic (that way lies madness), we keep potrace's own transform and wrap it in a second one
 *     that letterboxes the result into a shared 24x24 box. Look at normalise().
 *
 *  2. THE WHITE GAPS CLOSE. This is the only failure mode that matters. A burger drawn with thin
 *     seams between the bun and the patty becomes a solid dome at 20px. Four of the first eleven
 *     blocks failed this way. The prompt now leads with the gap law, and GATE 1 measures it.
 *
 *  3. NEVER SAY THE NAME OF THE FOOD if the model has a strong prior for it. "Taco" made it paint a
 *     filled dome five times running, no matter what else the prompt said. Describing the geometry
 *     and never naming the subject fixed it on the first try. Some of the SUBJECTS below therefore
 *     read like a stonemason's instructions. That is deliberate. Do not "clean them up".
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BLOCKS = 'scripts/icon-blocks';
const TMP = '/tmp/typecase';

// The house style, and the reason the set hangs together. Every block is cut with this.
export const PREAMBLE = `A single icon, cut as a relief printing block for a 1950s small-town American newspaper advertisement. PURE BLACK #000000 shape on a PURE WHITE #FFFFFF background, nothing else in the frame.

THE ONE RULE THAT MATTERS: this will be printed the size of a fingernail. Every white gap inside the shape must be ENORMOUS, at least one fifth of the whole image wide, wider than the black forms on either side of it. If a white gap is a line, a slit, a crack or a seam, the block is wrong. Gouge the white out in great blunt slabs. When in doubt, remove more black.

CONSTRUCTION: one heavy filled silhouette. Interior detail exists ONLY as those huge white slabs gouged out of the black mass, or as big angular bites taken out of the outer edge. No more than three separate black shapes. Massive, simple, unmistakable outer silhouette.

REGISTER: crude, blunt, functional. Cut by a working sign painter at 11pm, not drawn by a designer. Slightly trembling contours, one chipped corner. It must still read as this object at the size of a fingernail.

FORBIDDEN, all of it: no grey, no gradient, no shading, no shadow, no 3D, no bevel, no outline style, no line art, no thin lines, no fine detail, no texture, no grain, no speckle, no distress, no halftone, no crosshatching, no "authentic linocut print" look, no rounded corners, no cute style, no mascot, no faces, no human figures, no hands, no smoke, no steam, no sparkles, no motion lines, no splashes, no frame, no border, no background, no text, no letters, no numbers.

SUBJECT: `;

// Keyed by board slug, so <Icon name={board.slug} /> just works.
export const SUBJECTS = {
  'most-loved': 'a solid five-pointed star, fat blunt points, one point chipped off short. Nothing else. Not a flame, not a heart, not a burst.',
  'best-tacos': 'Draw this exact geometry, and never mind what it is. Two shapes only. Shape one: a wide black crescent lying on its back along the bottom of the frame, flat underneath, curving up to two points, hollow in the middle. Shape two: a lumpy black mound sitting over the crescent\'s opening, wider than it, overhanging both ends, three big rounded bumps along its top. Between the two, a huge white gap runs the full width, a fifth of the frame tall. Wide and low.',
  'desi-land': 'a stacked steel tiffin carrier: two heavy stacked cylindrical tins separated by one thick white gap, with a fat arched carrying handle rising over the top. Tall and narrow. Not a bowl, not a pot, not a plate.',
  'best-bbq': 'an offset barrel smoker in strict flat side profile. One wide heavy horizontal barrel, bottom edge dead flat on the baseline. One THICK vertical chimney rising from the LEFT end, reaching the top of the frame. One fat square white gouge in the barrel for the firebox door. One wide mass, one tall tower. No legs, no wheels, no feet. No smoke, no flames. No pig, no cow.',
  'best-pizza': 'a single wedge of pizza on a DIAGONAL pointing down-left, fat convex crust along the top-right edge, three big round white holes gouged out for pepperoni. Blunt tip.',
  'best-burgers': 'a hamburger in strict flat side profile, WIDE and LOW. Exactly THREE separate black shapes stacked with TWO gigantic white gaps between them, each gap as thick as the shapes it separates. Top: a plain black half-dome. Middle: one heavy black bar, bottom edge wavy. Bottom: one flat black slab. The three shapes must never touch. The gaps run edge to edge, so daylight passes clean through the burger twice. No seeds, no lettuce, no cheese.',
  'best-coffee': 'a squat thick-walled diner mug in side profile, straight sides, one fat stub handle to the RIGHT with a thick white hole through it. No saucer, no steam, no lid, no paper cup.',
  'best-bars': 'a beer glass in strict flat side profile, exactly TWO black shapes with one gigantic white gap between them. Bottom: a heavy plain trapezoid, wider at top than bottom. Floating above, not touching: a fat lumpy cloud of foam with three rounded bumps, wider than the glass, overhanging both sides. Between them a huge white gap the full width, a fifth of the frame tall. No handle, no stem, no bubbles.',
  'best-bakeries': 'a croissant on a diagonal, a fat crescent with four deep angular V-notches bitten out of its OUTER curve and two tapering horns at the ends. No flat edge anywhere. No plate, no crumbs.',
  'food-trucks': 'Draw this exact geometry. A food truck in strict flat side profile, LONG and LOW, twice as wide as tall. The body is one heavy black rectangle sitting high. BELOW it, hanging clear, two big solid black circles, one near each end, sticking out below the bottom edge so they read plainly as two round bumps under the box. A huge white rectangle is gouged out of the middle of the body, a third of it, with a thick black awning jutting out horizontally over that hole like a shelf. Three shapes: the box, the wheel, the wheel.',
  'best-patios': 'a patio umbrella: a wide triangular canopy pointing UP, symmetrical, its bottom hem scalloped with four fat rounded bites, one thick vertical post below. The canopy is at least 3/4 of the frame width. No table, no chairs, no plant.',
};

/** Generate one raster block. Runs where GEMINI_API_KEY is (the llg-web container). */
async function cut(name) {
  const subject = SUBJECTS[name];
  if (!subject) throw new Error(`No SUBJECT for "${name}". Add one, do not freestyle.`);
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PREAMBLE + subject }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    },
  );
  const j = await r.json();
  const part = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
  if (!part) throw new Error(`Gemini returned no image for "${name}"`);
  mkdirSync(TMP, { recursive: true });
  writeFileSync(join(TMP, `${name}.png`), Buffer.from(part.inlineData.data, 'base64'));
  return join(TMP, `${name}.png`);
}

/** Raster -> 1-bit -> vector -> one shared 24x24 box. */
function trace(name, png) {
  mkdirSync(TMP, { recursive: true });
  const pbm = join(TMP, `${name}.pbm`);
  const raw = join(TMP, `${name}.raw.svg`);
  execSync(`convert ${png} -colorspace Gray -threshold 62% -trim +repage -bordercolor white -border 8 ${pbm}`);
  // turdsize kills speckle; alphamax 0.6 keeps corners sharp, because a cut block HAS corners.
  execSync(`potrace ${pbm} -s -o ${raw} --turdsize 12 --alphamax 0.6 --opttolerance 0.28 -W 24pt -H 24pt`);
  const svg = normalise(readFileSync(raw, 'utf8'), name);
  writeFileSync(join(BLOCKS, `${name}.svg`), svg);
  return svg;
}

/** See gotcha #1. Keep potrace's transform, letterbox it into a shared 24x24. */
function normalise(raw, name) {
  const vb = raw.match(/viewBox="([^"]+)"/)?.[1];
  const g = raw.match(/<g[^>]*transform="([^"]+)"[^>]*>([\s\S]*?)<\/g>/);
  if (!vb || !g) throw new Error(`potrace gave us something unparseable for "${name}"`);
  const [w, h] = vb.split(' ').slice(2).map(Number);
  const s = 24 / Math.max(w, h);
  const dx = (24 - w * s) / 2;
  const dy = (24 - h * s) / 2;
  const paths = g[2].trim().replace(/\s*(fill|stroke)="[^"]*"/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><g transform="translate(${dx.toFixed(2)},${dy.toFixed(2)}) scale(${s.toFixed(4)})"><g transform="${g[1]}">${paths}</g></g></svg>`;
}

/**
 * GATE 1 — printability. Render at 20px, erode by a disk, see what is left. A block whose limbs are
 * too thin loses most of its ink. A block that is a featureless BLOB passes this trivially with a
 * near-perfect score, so read it together with `ink`: ink above ~0.85 means the gouges have closed
 * and you are shipping a stone. Look at the thing. The eye is the last gate and it is not optional.
 *
 * GATE 2 — discrimination. Two icons that read the same at 20px are worse than no icons, because the
 * user learns they cannot trust the shape. Anything over ~0.90 alike gets recut.
 */
function gate(names) {
  mkdirSync(TMP, { recursive: true }); // gates run without a cut, so nobody else has made this
  const px = (n) => {
    const f = join(TMP, `${n}.gate.png`);
    const s = join(TMP, `${n}.gate.svg`);
    writeFileSync(s, readFileSync(join(BLOCKS, `${n}.svg`), 'utf8').replace(/currentColor/g, '#000000'));
    // ImageMagick's renderer does not know currentColor and will happily rasterise NOTHING.
    execSync(`convert -background white ${s} -flatten -resize 20x20 -colorspace Gray -threshold 55% ${f}`);
    return f;
  };
  const files = Object.fromEntries(names.map((n) => [n, px(n)]));
  const mean = (f, extra = '') =>
    Number(execSync(`convert ${f} -negate ${extra} -format "%[fx:mean]" info:`).toString());

  let bad = 0;
  console.log('\nGATE 1 — printability');
  for (const n of names) {
    const ink = mean(files[n]);
    const left = mean(files[n], '-morphology Erode Disk:1') / ink;
    const flag = ink > 0.85 ? ' <- BLOB, the gouges closed' : left < 0.5 ? ' <- FRAGILE, limbs too thin' : '';
    if (flag) bad++;
    console.log(`  ${n.padEnd(14)} ink ${ink.toFixed(2)}  survives ${(left * 100).toFixed(0)}%${flag}`);
  }

  console.log('\nGATE 2 — discrimination at 20px');
  const pairs = [];
  for (const a of names)
    for (const b of names)
      if (a < b)
        pairs.push([
          Number(execSync(`compare -metric NCC ${files[a]} ${files[b]} null: 2>&1 || true`).toString().replace(/[()]/g, '')),
          a,
          b,
        ]);
  for (const [d, a, b] of pairs.sort((x, y) => y[0] - x[0]).slice(0, 3)) {
    const flag = d > 0.9 ? ' <- TOO ALIKE, recut one' : '';
    if (flag) bad++;
    console.log(`  ${(d * 100).toFixed(0)}% alike: ${a} / ${b}${flag}`);
  }
  return bad;
}

/** scripts/icon-blocks/*.svg -> lib/icons.ts. The .ts file is generated; edit the blocks, not it. */
function build() {
  const names = readdirSync(BLOCKS).filter((f) => f.endsWith('.svg')).map((f) => f.replace('.svg', '')).sort();
  const entries = names
    .map((n) => {
      const inner = readFileSync(join(BLOCKS, `${n}.svg`), 'utf8')
        .replace(/^[\s\S]*?<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        .trim();
      return `  ${JSON.stringify(n)}:\n    ${JSON.stringify(inner)},`;
    })
    .join('\n');
  const src = readFileSync('lib/icons.ts', 'utf8');
  const head = src.slice(0, src.indexOf('export const ICONS'));
  writeFileSync('lib/icons.ts', `${head}export const ICONS: Record<string, string> = {\n${entries}\n};\n${src.slice(src.indexOf('\nexport const hasIcon'))}`);
  console.log(`\nlib/icons.ts <- ${names.length} blocks`);
  return names;
}

const [cmd, name] = process.argv.slice(2);
if (cmd === 'cut') {
  const png = await cut(name);
  trace(name, png);
  console.log(`cut ${name}`);
}
const names = build();
const bad = gate(names);
console.log(bad ? `\n${bad} problem(s). Look at the icons before you ship them.` : '\nBoth gates clean.');
