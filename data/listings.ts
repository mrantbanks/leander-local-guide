export type Category = 'Food' | 'Drink' | 'Coffee' | 'Bar' | 'Brewery';

export type Listing = {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  description: string;
  address: string;
  hours: string;
  rating: number;
  happyHour?: string;
  hoursDetail?: {
    sunday?: { open: string; close: string };
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
  };
};
export const listings: Listing[] = [
  {
    id: 'taco-mana',
    name: 'Taco Mana',
    category: 'Food',
    tags: ['Not a Chain', 'Hidden Gem', 'Food Truck', 'Leander'],
    description:
      'Authentic tacos made with bold flavor and fresh ingredients. A local favorite in Leander.',
    address: 'Leander, TX 78641',
    hours: 'Mon–Sat 8am–3pm • Closed Sun',
    rating: 4.8,
    hoursDetail: {
      monday: { open: '08:00', close: '15:00' },
      tuesday: { open: '08:00', close: '15:00' },
      wednesday: { open: '08:00', close: '15:00' },
      thursday: { open: '08:00', close: '15:00' },
      friday: { open: '08:00', close: '15:00' },
      saturday: { open: '08:00', close: '15:00' },
    },
  },
  {
    id: 'obsidian-brewery',
    name: 'Obsidian Brewery',
    category: 'Brewery',
    tags: ['Not a Chain', 'Date Night', 'Leander'],
    description:
      'Craft beer, pizza, and cocktails in a polished local brewery setting.',
    address: '11880 Hero Way W, Suite 208, Leander, TX 78641',
    hours: 'Sun–Thu 11am–9pm • Fri–Sat 11am–11pm',
    rating: 4.7,
    hoursDetail: {
      sunday: { open: '11:00', close: '21:00' },
      monday: { open: '11:00', close: '21:00' },
      tuesday: { open: '11:00', close: '21:00' },
      wednesday: { open: '11:00', close: '21:00' },
      thursday: { open: '11:00', close: '21:00' },
      friday: { open: '11:00', close: '23:00' },
      saturday: { open: '11:00', close: '23:00' },
    },
  },
  {
    id: 'nameless-saloon',
    name: 'Nameless Saloon',
    category: 'Bar',
    tags: ['Family Friendly', 'Live Music', 'Leander'],
    description:
      'Popular hangout with outdoor space, events, and a laid-back local feel.',
    address: 'Leander, TX',
    hours:
      'Wed–Thu 5–10pm • Fri 5–11pm • Sat 12–11pm • Sun 12–10pm • Closed Mon–Tue',
    rating: 4.6,
    happyHour: 'Fri 5–7pm',
    hoursDetail: {
      wednesday: { open: '17:00', close: '22:00' },
      thursday: { open: '17:00', close: '22:00' },
      friday: { open: '17:00', close: '23:00' },
      saturday: { open: '12:00', close: '23:00' },
      sunday: { open: '12:00', close: '22:00' },
    },
  },
  {
    id: 'wildfire-park',
    name: 'Wildfire Park',
    category: 'Coffee',
    tags: ['Local Favorite', 'Leander'],
    description:
      'Relaxed local spot with coffee and a neighborhood feel.',
    address: 'Leander, TX',
    hours: 'Daily 7am–5pm',
    rating: 4.5,
    hoursDetail: {
      sunday: { open: '07:00', close: '17:00' },
      monday: { open: '07:00', close: '17:00' },
      tuesday: { open: '07:00', close: '17:00' },
      wednesday: { open: '07:00', close: '17:00' },
      thursday: { open: '07:00', close: '17:00' },
      friday: { open: '07:00', close: '17:00' },
      saturday: { open: '07:00', close: '17:00' },
    },
  },
  {
    id: 'super-valle',
    name: 'Super Valle Meat Market Kitchen',
    category: 'Food',
    tags: ['Hidden Gem', 'Not a Chain', 'Leander'],
    description:
      'Inside a local market, this spot serves some of the most authentic Mexican food in town.',
    address: 'Leander, TX',
    hours: 'Daily 9am–7pm',
    rating: 4.7,
    hoursDetail: {
      sunday: { open: '09:00', close: '19:00' },
      monday: { open: '09:00', close: '19:00' },
      tuesday: { open: '09:00', close: '19:00' },
      wednesday: { open: '09:00', close: '19:00' },
      thursday: { open: '09:00', close: '19:00' },
      friday: { open: '09:00', close: '19:00' },
      saturday: { open: '09:00', close: '19:00' },
    },
  },
  {
    id: 'stubblefields-bbq',
    name: "Stubblefield’s BBQ",
    category: 'Food',
    tags: ['Not a Chain', 'Hidden Gem', 'Food Truck', 'Leander'],
    description:
      'Family-run BBQ trailer at Wildfire Park serving slow-smoked brisket, ribs, and Southern favorites.',
    address: 'Wildfire Park, Leander, TX',
    hours: 'Wed–Sat 11am–5pm',
    rating: 4.8,
    hoursDetail: {
      wednesday: { open: '11:00', close: '17:00' },
      thursday: { open: '11:00', close: '17:00' },
      friday: { open: '11:00', close: '17:00' },
      saturday: { open: '11:00', close: '17:00' },
    },
  },
  {
    id: 'brooklyn-heights-pizzeria',
    name: 'Brooklyn Heights Pizzeria',
    category: 'Food',
    tags: ['Not a Chain', 'Local Favorite', 'Leander', 'Happy Hour'],
    description:
      'Pizza, pasta, and a casual neighborhood-bar feel with a solid weekday happy hour.',
    address: '3550 N Lakeline Blvd, Leander, TX 78641',
    hours: 'Daily 11am–10pm • Open late Saturdays',
    rating: 4.6,
    happyHour: 'Mon–Fri 4–7pm',
    hoursDetail: {
      sunday: { open: '11:00', close: '22:00' },
      monday: { open: '11:00', close: '22:00' },
      tuesday: { open: '11:00', close: '22:00' },
      wednesday: { open: '11:00', close: '22:00' },
      thursday: { open: '11:00', close: '22:00' },
      friday: { open: '11:00', close: '22:00' },
      saturday: { open: '11:00', close: '23:59' },
    },
  },
  {
    id: 'rabbit-hole-leander',
    name: 'The Rabbit Hole',
    category: 'Bar',
    tags: ['Leander', 'Date Night', 'Live Music'],
    description:
      'Craft cocktails and nightlife spot with a Leander location and later hours on weekends.',
    address: '2082 US Hwy 183, Suite 145, Leander, TX 78641',
    hours: 'Mon–Tue 2–10pm • Wed–Thu 2pm–12am • Fri 2pm–12am • Sat 2pm–1am • Sun 2–10pm',
    rating: 4.5,
    hoursDetail: {
      sunday: { open: '14:00', close: '22:00' },
      monday: { open: '14:00', close: '22:00' },
      tuesday: { open: '14:00', close: '22:00' },
      wednesday: { open: '14:00', close: '24:00' },
      thursday: { open: '14:00', close: '24:00' },
      friday: { open: '14:00', close: '24:00' },
      saturday: { open: '14:00', close: '01:00' },
    },
  },
  {
    id: 'rabbit-hole-cedar-park',
    name: 'The Rabbit Hole Cedar Park',
    category: 'Bar',
    tags: ['Nearby', 'Cedar Park', 'Date Night', 'Live Music'],
    description:
      'Sister location to the Leander Rabbit Hole. Good to keep tagged as nearby, not Leander.',
    address: 'Cedar Park, TX',
    hours: 'Mon–Tue 2–10pm • Wed–Thu 2pm–12am • Fri–Sat 2pm–1am • Sun 2–10pm',
    rating: 4.4,
  },
  {
    id: 'leanderthal-distilling',
    name: 'Leanderthal Distilling',
    category: 'Drink',
    tags: ['Leander', 'Adults Only', 'Date Night'],
    description:
      '21+ distillery lounge known for cocktails, bottle sales, and a quieter night-out vibe.',
    address: 'Leander, TX',
    hours: 'Wed–Fri 4–9pm • Sat 1–9pm • Closed Sun–Tue',
    rating: 4.7,
    hoursDetail: {
      wednesday: { open: '16:00', close: '21:00' },
      thursday: { open: '16:00', close: '21:00' },
      friday: { open: '16:00', close: '21:00' },
      saturday: { open: '13:00', close: '21:00' },
    },
  },
  {
    id: 'nightowl-brewhouse',
    name: 'NightOwl BrewHouse',
    category: 'Bar',
    tags: ['Leander', 'Live Music', 'Nearby Food Trucks'],
    description:
      'Late-night Leander hangout with drinks and regular food truck presence.',
    address: 'Leander, TX',
    hours: 'Sun–Thu 12pm–12am • Fri–Sat 12pm–2am',
    rating: 4.5,
    hoursDetail: {
      sunday: { open: '12:00', close: '24:00' },
      monday: { open: '12:00', close: '24:00' },
      tuesday: { open: '12:00', close: '24:00' },
      wednesday: { open: '12:00', close: '24:00' },
      thursday: { open: '12:00', close: '24:00' },
      friday: { open: '12:00', close: '02:00' },
      saturday: { open: '12:00', close: '02:00' },
    },
  },
  {
    id: 'sky-asian-fusion',
    name: 'Sky Asian Fusion',
    category: 'Food',
    tags: ['Leander', 'Happy Hour', 'Date Night'],
    description:
      'Asian fusion spot with weekday lunch happy hour and recurring specials.',
    address: 'Leander, TX',
    hours: 'See restaurant for daily closing times',
    rating: 4.5,
    happyHour: 'Mon–Fri 11am–2:30pm',
  },
  {
    id: 'fifth-element-brewing',
    name: '5th Element Brewing',
    category: 'Brewery',
    tags: ['Leander', 'Local Favorite'],
    description:
      'Local brewery with a community-forward feel and rotating events.',
    address: 'Leander, TX',
    hours: 'Often posted as open today 2–9:30pm',
    rating: 4.5,
  },
  {
    id: 'leander-beer-market',
    name: 'Leander Beer Market',
    category: 'Bar',
    tags: ['Leander', 'Local Favorite'],
    description:
      'Old-school neighborhood bar in Old Town Leander with food, drinks, and trivia nights.',
    address: '106 W Willis St, Leander, TX 78641',
    hours: 'See live hours online',
    rating: 4.4,
  },
  {
    id: 'game-on-bar',
    name: 'The Game On Bar',
    category: 'Bar',
    tags: ['Leander', 'Sports Bar', 'Live Music'],
    description:
      'New Leander sports bar with later evening hours and a big-game atmosphere.',
    address: '15609 Ronald W Reagan Blvd A-100, Leander, TX 78641',
    hours: 'Closed Mon • Tue–Wed 4–11pm • Thu–Sat 4pm–12am • Sun 4–11pm',
    rating: 4.3,
    hoursDetail: {
      tuesday: { open: '16:00', close: '23:00' },
      wednesday: { open: '16:00', close: '23:00' },
      thursday: { open: '16:00', close: '24:00' },
      friday: { open: '16:00', close: '24:00' },
      saturday: { open: '16:00', close: '24:00' },
      sunday: { open: '16:00', close: '23:00' },
    },
  },
  {
    id: 'post-tavern',
    name: 'The Post Tavern',
    category: 'Bar',
    tags: ['Nearby', 'Cedar Park', 'Dive Bar'],
    description:
      'Well-known divey sports-bar option nearby, but not actually in Leander.',
    address: '601 W Whitestone Blvd, Cedar Park, TX 78613',
    hours: 'Daily 11am–2am',
    rating: 4.2,
  },
  {
    id: 'lone-star-bar',
    name: 'The Lone Star Bar',
    category: 'Bar',
    tags: ['Nearby', 'Jonestown', 'Dive Bar'],
    description:
      'Nearby dive-bar option in Jonestown, not Leander.',
    address: 'Jonestown, TX',
    hours: 'Check venue hours',
    rating: 4.1,
  },
  {
    id: 'the-good-lot',
    name: 'The Good Lot',
    category: 'Bar',
    tags: ['Nearby', 'Cedar Park', 'Family Friendly', 'Food Trucks'],
    description:
      'Beer garden and food truck lot that gets mentioned often with Leander-area hangouts, but it is in Cedar Park.',
    address: '2500 W New Hope Dr, Cedar Park, TX 78613',
    hours: 'Sun 12–9pm • Mon–Thu 11am–9pm • Fri–Sat 11am–10pm',
    rating: 4.4,
  },
  {
    id: 'maggie-maes',
    name: "Maggie Mae's",
    category: 'Bar',
    tags: ['Nearby', 'Austin'],
    description:
      'Popular Austin venue, not Leander.',
    address: 'Austin, TX',
    hours: 'Check venue hours',
    rating: 4.0,
  },
  {
    id: 'spare-birdie',
    name: 'Spare Birdie',
    category: 'Bar',
    tags: ['Nearby', 'Cedar Park'],
    description:
      'Cedar Park entertainment and dining spot, not Leander.',
    address: 'Cedar Park, TX',
    hours: 'Check venue hours',
    rating: 4.1,
  },
  {
    id: 'haute-spot',
    name: 'Haute Spot',
    category: 'Bar',
    tags: ['Nearby', 'Cedar Park', 'Live Music'],
    description:
      'Outdoor music venue in the Cedar Park area that often gets lumped into north suburban recommendations.',
    address: 'Cedar Park, TX',
    hours: 'Event-based',
    rating: 4.2,
  },
  {
    id: 'sharks-burger-hero-way',
    name: 'Sharks Burger',
    category: 'Food',
    tags: ['Leander', 'Local Favorite'],
    description:
      'Made-to-order burger staple with a Hero Way location inside the Shell station.',
    address: '12681 Hero Way W, Leander, TX 78641',
    hours: 'Mon–Fri 6:30am–8pm • Sat 11am–8pm • Sun 11am–7pm',
    rating: 4.5,
    hoursDetail: {
      sunday: { open: '11:00', close: '19:00' },
      monday: { open: '06:30', close: '20:00' },
      tuesday: { open: '06:30', close: '20:00' },
      wednesday: { open: '06:30', close: '20:00' },
      thursday: { open: '06:30', close: '20:00' },
      friday: { open: '06:30', close: '20:00' },
      saturday: { open: '11:00', close: '20:00' },
    },
  },
  {
    id: 'sharks-burger-ronald-reagan',
    name: 'Sharks Burger Ronald Reagan',
    category: 'Food',
    tags: ['Leander', 'Local Favorite'],
    description:
      'Second Leander Sharks Burger location with indoor seating and patio.',
    address: '15609 Ronald Reagan Blvd C100, Leander, TX 78641',
    hours: 'Mon–Thu 11am–8pm • Fri–Sat 11am–9pm • Sun 11am–7pm',
    rating: 4.5,
    hoursDetail: {
      sunday: { open: '11:00', close: '19:00' },
      monday: { open: '11:00', close: '20:00' },
      tuesday: { open: '11:00', close: '20:00' },
      wednesday: { open: '11:00', close: '20:00' },
      thursday: { open: '11:00', close: '20:00' },
      friday: { open: '11:00', close: '21:00' },
      saturday: { open: '11:00', close: '21:00' },
    },
  },
  {
    id: 'saccones-pizza',
    name: "Saccone's Pizza & Subs",
    category: 'Food',
    tags: ['Leander', 'Local Favorite'],
    description:
      'New Jersey-style pizza and subs with a Leander location on Hero Way.',
    address: '11880 Hero Way W, Suite 205, Leander, TX 78641',
    hours: 'Sun–Thu 11am–8:30pm • Fri–Sat 11am–10pm',
    rating: 4.4,
    hoursDetail: {
      sunday: { open: '11:00', close: '20:30' },
      monday: { open: '11:00', close: '20:30' },
      tuesday: { open: '11:00', close: '20:30' },
      wednesday: { open: '11:00', close: '20:30' },
      thursday: { open: '11:00', close: '20:30' },
      friday: { open: '11:00', close: '22:00' },
      saturday: { open: '11:00', close: '22:00' },
    },
  },
  {
    id: 'casa-costa-bake-shop',
    name: 'Casa Costa Bake Shop',
    category: 'Coffee',
    tags: ['Leander', 'Local Favorite', 'Coffee & Sweets'],
    description:
      'Old Town Leander bake shop and café with pastries, cakes, coffee, and a cozy house setting.',
    address: '201 Bagdad St, Leander, TX 78641',
    hours: 'Tue–Sat 7am–5pm',
    rating: 4.7,
    hoursDetail: {
      tuesday: { open: '07:00', close: '17:00' },
      wednesday: { open: '07:00', close: '17:00' },
      thursday: { open: '07:00', close: '17:00' },
      friday: { open: '07:00', close: '17:00' },
      saturday: { open: '07:00', close: '17:00' },
    },
  },
  {
    id: 'ziggys-kielbasa',
    name: "Ziggy's Kielbasa",
    category: 'Food',
    tags: ['Needs Verify', 'Leander Area'],
    description:
      'Frequently recommended local favorite; exact current service location should be verified before featuring.',
    address: 'Verify current Leander-area location',
    hours: 'Verify hours',
    rating: 4.2,
  },
  {
    id: 'lali-son',
    name: 'Lali Son',
    category: 'Food',
    tags: ['Needs Verify', 'Leander Area'],
    description:
      'Mentioned in local recommendations; verify current address before labeling as Leander.',
    address: 'Verify current location',
    hours: 'Verify hours',
    rating: 4.1,
  },
  {
    id: 'guaco-taco',
    name: 'Guaco Taco',
    category: 'Food',
    tags: ['Needs Verify', 'Leander Area'],
    description:
      'Mentioned in local recommendation threads; verify current address before featuring.',
    address: 'Verify current location',
    hours: 'Verify hours',
    rating: 4.1,
  },
  {
    id: 'downtown-taco-speakeasy',
    name: 'Downtown Taco Speakeasy',
    category: 'Food',
    tags: ['Hidden Gem', 'Needs Verify', 'Leander Area'],
    description:
      'The alleyway taco “speakeasy” is great editorial content, but you should verify exact name and address before publishing.',
    address: 'Verify exact downtown Leander location',
    hours: 'Verify hours',
    rating: 4.3,
  },
  {
    id: 'leander-grocery',
    name: 'Leander Grocery Kitchen',
    category: 'Food',
    tags: ['Hidden Gem', 'Needs Verify', 'Leander Area'],
    description:
      'A local grocery-store kitchen repeatedly mentioned as a hidden gem for tacos and burritos.',
    address: 'Verify exact Leander location',
    hours: 'Verify hours',
    rating: 4.3,
  },
  {
    id: 'hanks-snack-wagon',
    name: "Hank's Snack Wagon",
    category: 'Food',
    tags: ['Food Truck', 'Nameless Saloon', 'Leander Area', 'Needs Verify'],
    description:
      'One of the food trucks associated with Nameless Saloon; verify current schedule before featuring live hours.',
    address: 'Nameless Saloon area, Leander, TX',
    hours: 'Verify current schedule',
    rating: 4.1,
  },
  {
    id: 'tasty-bites',
    name: 'Tasty Bites',
    category: 'Food',
    tags: ['Food Truck', 'Nameless Saloon', 'Leander Area', 'Needs Verify'],
    description:
      'Food truck associated with Nameless Saloon; verify current schedule before featuring live hours.',
    address: 'Nameless Saloon area, Leander, TX',
    hours: 'Verify current schedule',
    rating: 4.1,
  },
];