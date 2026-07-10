// Pure, client-safe: a little ASCII picture for a Passport stamp, in place of a
// barcode. Chosen from what kind of place it is (inferred from the name + perk title).
const ART: Record<string, string[]> = {
  taco: [' __________', '/  o  o  o \\', '|~~~~~~~~~~|', ' \\________/'],
  coffee: ['   ( (', '  .____.', '  |    |]', '  |____|'],
  bakery: ['  (~~~~)', ' /~~~~~~\\', ' |======|', ' |______|'],
  pizza: ['   /\\', '  /o \\', ' / o  \\', '/__o___\\'],
  burger: [' .------.', '( ~~~~~~ )', '|o o o o|', ' \'======\''],
  bar: [' .----.', ' |o  o|__', ' |o  o|  |', ' |____|__|'],
  icecream: ['  _o_', ' (___)', '  \\ /', '   V'],
  default: [' .------.', ' | *  * |', ' |  LLG |', ' \'------\''],
};

export function pickStampArt(name: string, title = ''): string {
  const s = `${name} ${title}`.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => s.includes(w));
  let key = 'default';
  if (has('taco', 'taquer', 'burrito', 'cantina', 'mexican', 'tex-mex')) key = 'taco';
  else if (has('coffee', 'café', 'cafe', 'espresso', 'roast', 'brew house', 'tea ', 'latte')) key = 'coffee';
  else if (has('bakery', 'bake', 'pastr', 'donut', 'doughnut', 'cupcake', 'bread', 'dulce', 'pan ')) key = 'bakery';
  else if (has('pizza', 'pizzeria')) key = 'pizza';
  else if (has('ice cream', 'creamery', 'gelato', 'frozen', 'scoop')) key = 'icecream';
  else if (has('burger', 'smash', 'diner', 'grill')) key = 'burger';
  else if (has('bar', 'pub', 'tavern', 'beer', 'brew', 'taproom', 'wine', 'saloon', 'lounge')) key = 'bar';
  return ART[key].join('\n');
}
