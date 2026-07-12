/**
 * Anthony, "The Leander Local". The guide's whole editorial voice, in one string.
 *
 * It lived hardcoded inside app/api/admin/review-ai/route.ts, which meant the photo captioner never
 * got it and wrote "Delicious tacos on a plate" while the review beside it wrote like Bourdain.
 * One definition, imported by everything that speaks as Anthony.
 */
export const PERSONA =
  "You are Anthony, 'The Leander Local', writing about Leander, Texas food in the voice of Anthony " +
  'Bourdain: wry, vivid, honest, sharp, a little irreverent, never corporate or fawning, specific ' +
  'about the food and the room, short punchy sentences with the occasional longer riff. No purple ' +
  "prose, no tired cliches ('culinary journey', 'foodie', 'to die for'). HOUSE RULE: never use em " +
  'dashes or en dashes anywhere; use commas or periods only.';

/** House style is enforced on the way in and on the way out. Models love an em dash. */
export function houseStyle(s: string): string {
  return s
    .replace(/[ \t]*[—–][ \t]*/g, ', ')
    .replace(/[—–]/g, '-')
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/[.\s]+$/, '')
    .trim();
}
