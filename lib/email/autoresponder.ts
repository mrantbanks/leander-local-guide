// The evergreen 6-month welcome drip. Every confirmed subscriber walks these steps.
// day = offset in days from confirmation. Sender fires a step when ar_next_due <= now.
import { wrap, btn, p, BASE } from './templates';

type Step = { day: number; subject: string; body: string };

const lead = (t: string) => `<p style="font-size:19px;line-height:1.5;margin:0 0 12px;font-weight:bold;">${t}</p>`;

export const STEPS: Step[] = [
  { day: 0, subject: "You made it to Leander. Now let's get you fed.",
    body: lead("Welcome in.") + p("I'm Anthony, and I'm working my way through every restaurant in the fastest-growing city in America so you don't waste a meal. Here's the deal: I read what real diners say, I tell you the honest version, and once I've actually been somewhere, I post my own first-hand take with the date I went.") + p("Start here, the one taco spot I'd send anybody to on their first night in town.") + btn(`${BASE}/best/tacos`, "Show me the tacos") },
  { day: 2, subject: "The shortlist I wish someone handed me on day one",
    body: lead("You don't need 200 restaurants. You need the five that never miss.") + p("These are the leaderboards, ranked from honest summaries of what Leander folks actually say. No paid placements, no whoever-bought-an-ad. Start at the top of each list and you cannot have a bad week.") + btn(`${BASE}/best`, "See the best of Leander") },
  { day: 5, subject: "Why you can trust a guy who hasn't eaten everywhere yet",
    body: lead("Here's how this works, and it's the whole point.") + p("Until I've personally been somewhere, every page is an honest summary of what real reviewers say, clearly marked, not me pretending I ate there. When I do go, I post my own verdict with the date. No restaurant pays to rank. If a place is coasting on hype, the reviews will say so, and so will I.") + btn(`${BASE}/about`, "The whole story") },
  { day: 9, subject: "New to Leander? Read this before you order wrong.",
    body: lead("Leander grew so fast the map can't keep up.") + p("So here's your food map: where to take the in-laws, where to eat in gym clothes on a Tuesday, what's actually worth the drive. Save this one.") + btn(`${BASE}/hidden-gems`, "Where the locals go") },
  { day: 14, subject: "The strip-mall door you've driven past 40 times",
    body: lead("The best meal in this town is almost never the one with the big sign.") + p("It's behind a beige door between a nail salon and a vape shop, run by one family that's quietly perfect. Here's where the gems are hiding.") + btn(`${BASE}/hidden-gems`, "Open the gems") },
  { day: 21, subject: "Brisket doesn't lie. Here's who's telling the truth.",
    body: lead("This is Texas, so let's talk smoke.") + p("The BBQ, ranked honest, which around here is a contact sport. Bark, moisture, the snap on the sausage. Number one earned it.") + btn(`${BASE}/best/bbq`, "Rank the smoke") },
  { day: 30, subject: "Your turn. Where do YOU sneak off to eat?",
    body: lead("One month in. You've eaten on my word. Now I want yours.") + p("Hit reply and tell me the one spot you'd defend to a stranger, the order, the reason. I read every single one, and the best tips become features. This is how the guide stays honest.") + btn(`${BASE}/food`, "Browse every spot") },
  { day: 44, subject: "Something new just opened. Here's the word on it.",
    body: lead("New restaurants pop up here faster than rooftops.") + p("Most opening lists are just press releases. Not mine. The Wire tracks what's opening, closing, and worth your attention, with the honest read on each.") + btn(`${BASE}/new`, "What's new in Leander") },
  { day: 60, subject: "Where Leander actually gets its coffee",
    body: lead("You can't run a boomtown on gas-station coffee, though we try.") + p("Here's where the real coffee is, the patios worth the detour, the breakfast that justifies the alarm clock. Morning Leander has a whole secret personality.") + btn(`${BASE}/best`, "Find the good coffee") },
  { day: 81, subject: "Go past Old Town. Trust me on this.",
    body: lead("By now you know the hits. Time for the deep cuts.") + p("The spots even some lifers haven't found, tucked in the parts of town the new builds haven't swallowed yet. This is the stuff that makes you feel like you've actually lived here.") + btn(`${BASE}/hidden-gems`, "Go deeper") },
  { day: 105, subject: "There's always something happening. You're just not hearing about it.",
    body: lead("Food trucks, patio nights, trivia, the brewery doing a thing again.") + p("This town eats out loud and most of it never hits your radar. That's what What's On is for. Here's what's happening this week.") + btn(`${BASE}/whats-on`, "See what's on") },
  { day: 130, subject: "Best breakfast taco in Leander. Fighting words. Go.",
    body: lead("The breakfast taco is sacred and ranking them is how you lose friends.") + p("So naturally I did it anyway. Bacon-egg-and-cheese loyalists, barbacoa diehards, migas people, you're all about to be furious. Number one is non-negotiable.") + btn(`${BASE}/best`, "Settle the debate") },
  { day: 156, subject: "What working through a whole town's worth of reviews taught me",
    body: lead("The mission was always to try every spot in town.") + p("I'm a long way in with a long way to go, because this city keeps building faster than I can eat. What it's taught me: the sign size means nothing, the family-run place almost always wins, and Leander is quietly one of the best food towns nobody's talking about yet. You're early.") + btn(`${BASE}/best`, "The proof") },
  { day: 182, subject: "You're not new anymore. Welcome to the locals.",
    body: lead("Six months ago you might've eaten wherever the GPS dumped you.") + p("Look at you now: opinions, a hidden gem or two, a hill you'd die on about brisket. From here, bookmark these three and check back any time. I'll keep eating. You just decide where to sit.") + btn(`${BASE}/best`, "Best of") + " &nbsp; " + btn(`${BASE}/whats-on`, "What's on") },
];

export const STEP_DAYS = STEPS.map((s) => s.day);

export function stepEmail(i: number, unsubToken: string): { subject: string; html: string } {
  const s = STEPS[i];
  return { subject: s.subject, html: wrap(s.body, unsubToken) };
}
