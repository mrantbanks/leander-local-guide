// Starter perks for the Local Passport, geared to the kind of place the owner actually runs.
//
// An owner staring at a blank box hesitates, not because they are stingy, but because they do not
// know what is normal or safe to offer. A generic list barely helps: "free chips and queso" is
// useless to a bakery. So we suggest from their own cuisine first, then their venue type, then a
// couple of house standbys.
//
// Voice rules (see the Passport brand ban list): a perk is insider access, not a coupon. No
// "% off", no "discount", no "deal", no "unlock". Concrete and generous beats clever: the thing an
// owner can hand across a counter without doing arithmetic.
//
// Deliberately never a free alcoholic drink: giving away liquor has real rules in Texas, and it is
// not our place to talk an owner into a TABC problem. Bars get food and upgrades instead.

export type Perk = { title: string; details?: string; recurring?: boolean; days?: number[] };

const MON = [0]; // days are 0=Mon..6=Sun, matching specials.days_of_week

// Most concrete, so it goes first. Keyed off `cuisines`.
const BY_CUISINE: Record<string, Perk[]> = {
  Mexican: [
    { title: 'Free churro with any plate', details: 'One per person.' },
    { title: 'Chips and queso on the house', details: 'Dine-in, one per table.' },
    { title: 'An extra taco, on the house', details: 'One per person.' },
  ],
  Indian: [
    { title: 'Free naan with any curry', details: 'One per person.' },
    { title: 'Chai on the house with your meal', details: 'Dine-in.' },
  ],
  Italian: [{ title: 'Garlic bread on the house', details: 'Dine-in, one per table.' }],
  Pizza: [
    { title: 'Free garlic knots with any large pie', details: 'One order per pie.' },
    { title: 'An extra topping, on us', details: 'Any pizza, your pick.' },
  ],
  BBQ: [
    { title: 'An extra side on the house', details: 'Your pick, one per plate.' },
    { title: 'Free slice of white bread and pickles', details: 'The way it should come.' },
  ],
  Burgers: [{ title: 'Upgrade to loaded fries, on us', details: 'With any burger.' }],
  Sandwiches: [{ title: 'Chips and a pickle on the house', details: 'With any sandwich.' }],
  Chinese: [{ title: 'Free spring roll with any entree', details: 'One per person.' }],
  Japanese: [{ title: 'Free miso soup with any roll', details: 'Dine-in.' }],
  Sushi: [{ title: 'Free miso soup with any roll', details: 'Dine-in.' }],
  Thai: [{ title: 'Free spring roll with any entree', details: 'One per person.' }],
  Korean: [{ title: 'An extra banchan, on the house', details: 'Dine-in.' }],
  Greek: [{ title: 'Free pita and dip to start', details: 'Dine-in, one per table.' }],
  Mediterranean: [{ title: 'Free pita and dip to start', details: 'Dine-in, one per table.' }],
  Seafood: [{ title: 'An extra side on the house', details: 'Your pick, one per plate.' }],
  Steakhouse: [{ title: 'Free starter with two entrees', details: 'Dine-in.' }],
  Breakfast: [{ title: 'Coffee is on us with any breakfast plate', details: 'Bottomless, dine-in.' }],
  Brunch: [{ title: 'Coffee is on us with any brunch plate', details: 'Dine-in.' }],
  American: [{ title: 'Free starter with two entrees', details: 'Dine-in.' }],
};

// Venue type. Keyed off `primary_category`.
const BY_CATEGORY: Record<string, Perk[]> = {
  Bakery: [
    { title: 'A pastry on the house with any coffee', details: 'One per person.' },
    { title: 'Baker’s dozen for locals', details: 'Order twelve, take thirteen.' },
  ],
  Cafe: [
    { title: 'Size up your drink, on us', details: 'Any size, any drink.' },
    { title: 'A pastry on the house with any coffee', details: 'One per person.' },
  ],
  'Coffee Shop': [
    { title: 'Size up your drink, on us', details: 'Any size, any drink.' },
    { title: 'An extra shot, on the house', details: 'Any espresso drink.' },
  ],
  'Tea House': [{ title: 'Size up your pot, on us', details: 'Any tea on the list.' }],
  'Donut Shop': [
    { title: 'Thirteenth donut is on us', details: 'Order a dozen, take one more.' },
    { title: 'A donut on the house with any coffee', details: 'One per person.' },
  ],
  Dessert: [{ title: 'An extra scoop, on the house', details: 'One per person.' }],
  'Ice Cream Shop': [
    { title: 'An extra scoop, on the house', details: 'One per person.' },
    { title: 'Toppings on the house', details: 'Your pick, one cup or cone.' },
  ],
  // Nothing cuisine-specific here: a taco perk on an Indian kebab truck is exactly the kind of
  // suggestion that tells an owner we were not paying attention. The cuisine table handles that.
  'Food Truck': [
    { title: 'A free side with any plate', details: 'Your pick, one per order.' },
    { title: 'A drink on the house with any plate', details: 'One per person.' },
  ],
  Bar: [
    // Food and upgrades only. Free alcohol is a TABC question, not a perk we should suggest.
    { title: 'A snack on the house with your first pint', details: 'One per person.' },
    { title: 'Free basket of fries with any pint', details: 'One per person.' },
  ],
  Brewery: [
    { title: 'A snack on the house with your first pour', details: 'One per person.' },
    { title: 'Take home a branded glass with a flight', details: 'While they last.' },
  ],
  'Pizza Restaurant': [{ title: 'Free garlic knots with any large pie', details: 'One order per pie.' }],
  'Pizza Delivery': [{ title: 'Free garlic knots with any large pie', details: 'One order per pie.' }],
  // A plain "Restaurant" with no cuisine tag still deserves something concrete to start from.
  Restaurant: [
    { title: 'A starter on the house', details: 'Dine-in, one per table.' },
    { title: 'Free drink with any plate', details: 'Tea, coffee, or fountain.' },
  ],
};

// House standbys, by what the place actually serves. Offering "kids eat free" to a bar, or "free
// dessert with two plates" to an ice cream shop, is exactly the kind of nonsense that makes an
// owner close the tab.
const COUNTER = new Set(['Bakery', 'Cafe', 'Coffee Shop', 'Tea House', 'Donut Shop', 'Dessert', 'Ice Cream Shop']);
const BOOZE = new Set(['Bar', 'Brewery']);

const HOUSE_MEALS: Perk[] = [
  { title: 'Kids eat free on Mondays', details: 'One kid’s plate per grown-up plate.', recurring: true, days: MON },
  { title: 'Free dessert with two plates', details: 'Dine-in, one per table.' },
];
const HOUSE_COUNTER: Perk[] = [
  { title: 'Size up, on us', details: 'Any size, your pick.' },
  { title: 'Every tenth one is on the house', details: 'For the people who keep coming back.' },
];
// Works anywhere, and it is the honest catch-all: the owner decides what generosity looks like.
const HOUSE_ANY: Perk[] = [
  { title: 'Something extra for the regulars', details: 'Your call what it is, every time.' },
];

function houseFor(category: string): Perk[] {
  if (BOOZE.has(category)) return HOUSE_ANY;
  return [...(COUNTER.has(category) ? HOUSE_COUNTER : HOUSE_MEALS), ...HOUSE_ANY];
}

const MAX = 6; // short lists convert. A wall of options is another blank box.

/**
 * The perks we suggest to this owner, most relevant first.
 *
 * Cuisine beats venue type (a Mexican restaurant should be offered a churro before a generic
 * starter), venue type beats the house standbys, and we stop at six.
 */
export function presetsFor(category?: string | null, cuisines?: string[] | null): Perk[] {
  const out: Perk[] = [];
  const seen = new Set<string>();

  const push = (perks: Perk[] | undefined) => {
    for (const p of perks || []) {
      if (out.length >= MAX || seen.has(p.title)) continue;
      seen.add(p.title);
      out.push(p);
    }
  };

  const cat = category || '';
  // A bakery that somehow carries a "Breakfast" cuisine tag should still be offered bakery perks
  // first: what they sell over the counter beats what a data import decided to call their food.
  if (COUNTER.has(cat) || BOOZE.has(cat)) push(BY_CATEGORY[cat]);

  for (const c of cuisines || []) push(BY_CUISINE[c]);
  push(BY_CATEGORY[cat]);
  push(houseFor(cat));

  return out;
}
