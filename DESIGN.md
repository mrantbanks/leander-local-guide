# THE LEANDER LOCAL GUIDE — Design System & Redesign Direction

*One confident direction. Light-first newsprint, one molten red, Anthony's voice rendered as design, verdict-first not list-first. Buildable in Next.js + Tailwind today.*

---

## 1. Design concept / North Star

**North Star (one line):** *Not a directory — Anthony's column you can eat from tonight.*

**The 3-second feeling:** "A real person ate here, he has a verdict, and he's about to get me fed." Belief and appetite before utility. You should feel like you opened a great food zine, not a Yelp clone — and within one tap it should also *decide for you*.

This resolves the committee's central tension (Jobs/CD/Awwwards "publication" vs. Elon/Cuban "decision engine") by making them one thing: **the editorial voice IS the decision engine.** The publication has a byline (Anthony); the byline renders verdicts; the verdicts are the UI. Editorial soul on top, ruthless "where do I eat" utility one scroll/one tap underneath.

---

## 2. Art direction

**Mood:** "The field guide of a man who eats." Ink-on-newsprint, gritty-premium. The grit is the personality; the typography and restraint are the premium. It should feel *printed and stapled*, not rendered.

**Reference stack:** Lucky Peach newsprint grit; Saveur/Bon Appétit feature spreads; a Michelin inspector's hand-marked notebook; Texas roadside vernacular — hand-painted taqueria signage, gas-station marquees, gravel lots.

**Photography treatment (make-or-break — DB photos are uneven):**
- **One unifying grade so 176 mixed-quality photos cohere.** Default card/inline treatment: warm high-contrast grade + faint grain (SVG noise overlay ~6–8% on photos). On hover/focus, the grade lifts to true color (`filter` transition).
- **Duotone (ink `#16130F` → paper `#F4EFE6`) reserved** as a fallback for low-quality or missing photos, and for the "not reviewed yet" empty state — turns a weakness into a house style.
- **Full color, full-bleed reserved for hero shots only.** Crop aggressively, off-center, look for steam/char/a hand reaching in.
- A subtle **halftone dot screen** is allowed on section dividers and the masthead photo edge — texture, not decoration.

**Texture system:** paper grain SVG at ~3% over the whole `body`; **1px hairline rules instead of card shadows** (no shadow soup anywhere); one allowed "misregistration" flourish — a 1–2px offset red ghost on the biggest masthead word only.

---

## 3. Color system

**Stance: light-first warm newsprint** (the editorial/appetite/long-read win — Jobs, CD, Awwwards, EP all land here), with a **dedicated "ink" surface** (near-black) used for hero overlays, the footer slab, and the FEED ME panel so Elon's dark-zine energy lives where it earns attention. One brand signal color: **chile red.** Amber is rationed to "live/now."

| Token | Hex | Role |
|---|---|---|
| `paper` | `#F4EFE6` | Primary background (warm newsprint) |
| `paper-raised` | `#FBF7EF` | Cards / raised panels |
| `paper-sunk` | `#EAE0CE` | Sunk panels, spec sheet, input wells |
| `ink` | `#16130F` | Primary text, dark surfaces |
| `ink-soft` | `#4A4239` | Secondary text / metadata (AA on paper) |
| `rule` | `#D8CDB8` | Hairlines, dividers |
| `chile` | `#E03A1E` | **The brand signal** — graphics, large display, rules, focus ring |
| `oxblood` | `#7C1D12` | Deep red — verdict-stamp ink, links & red *text* (AA-safe) |
| `amber` | `#F2A516` | **Live only** — open-now, FEED ME hover, "today" markers |
| `paper-on-ink` | `#F4EFE6` | Text on `ink` surfaces |

**Accessibility commitment (decided now, not after launch):**
- `chile #E03A1E` on `paper` is ~3:1 — **graphics + large display (≥24px bold) only, never small text.**
- For red **text/links** on paper, use `oxblood #7C1D12` (passes AA for body).
- `amber` is graphic-only on light; for text it appears **only on the `ink` surface** (passes there). It never carries meaning by color alone — always paired with a word ("OPEN NOW").

No emerald. No stone gray. No flat white cards. Ever.

---

## 4. Typography

A disciplined **three-voice system + the stamp face** — all real, free, `next/font`-loadable. This single decision does 70% of the personality work.

| Voice | Typeface (Google/open) | Used for |
|---|---|---|
| **The Magazine** | **Fraunces** (variable; `opsz`, `wght`, `SOFT`) | All display heads, the review body. High `opsz`+contrast for heroes; low `opsz` for 19px reading. |
| **The Utility** | **Hanken Grotesk** | Nav, UI, metadata, buttons, spec sheets. Warm grotesk, scannable. |
| **The Man** | **Caveat** | Anthony's signature, margin asides, scrawled rating numerals. Hand, not font. |
| **The Stamp** | **Bebas Neue** | Verdict stamps, badges, section kickers, FEED ME — condensed caps = rubber-stamp authority. |

> Inter is permitted **nowhere** in display or voice. Hanken handles utility so we never reach for it.

**Scale (fluid, `clamp`):**
- Masthead / hero verdict: `clamp(2.75rem, 8vw, 7rem)`, Fraunces, tracking `-0.03em`, ragged-right, line-height `0.95`.
- Section heads: `clamp(1.75rem, 4vw, 3rem)`.
- Card name: `clamp(1.35rem, 2.4vw, 1.875rem)` Fraunces.
- Review body: **19px / 1.7, ~66ch measure, Fraunces low-opsz**, with drop cap.
- Kickers / labels / stamps: Bebas, uppercase, tracking `0.08em`.
- Metadata: Hanken 14px, `ink-soft`.

**Voice in type:** the magazine declares (Fraunces, huge), the utility informs (Hanken, quiet), the man interrupts (Caveat, in the margins and on every card). Three distinct hands on every page = it can't be a template.

---

## 5. Layout language

- **Grid:** 12-col, generous outer margins (`5vw` mobile → max-content `1280px` with wide gutters). Editorial = whitespace + hairlines, not boxes.
- **Spacing:** base-4 scale; **section rhythm is large** (96–160px between home sections) — magazine air, not SaaS density.
- **Signature compositions:**
  1. **Name overlaps photo** by ~16px (deliberate print-collage overlap) on cards and hero.
  2. **Pull-quotes break the measure** — Anthony's lines hang into the margin on detail pages.
  3. **Asymmetric editorial bento** on home: one 2×2 "Tonight's Pick" lead tile flanked by unequal-weight category entries (Desi Land, Taco Trucks, BBQ Country) — never a uniform grid.
  4. **Hairline registration marks** at section corners (small Bebas labels + 1px rules) like a print contents page.
  5. **Spec sheet as nutrition facts** — detail-page logistics set in a ruled mono/Hanken block, visually "the boring true facts."

---

## 6. Component redesigns

### The Restaurant CARD *(the contract — perfect once, apply to all 176)*
- Photo-dominant, top, warm-graded with grain; true color on hover.
- **Name in Fraunces, overlapping the photo's bottom edge by 16px**, on a paper sliver.
- **One line of Anthony in Caveat** — the hook ("Best al pastor in a 20-mile radius. Fight me."). Not a description. **No card ships without a take** — if there's no review yet, it gets the duotone "Anthony hasn't eaten here yet" empty treatment.
- **The Verdict Stamp** (rotated `-3deg`, oxblood ink-bleed) overlapping a corner.
- **Badges = rubber-stamp chips** (Bebas caps, 1px oxblood outline, slight rotation), not pills.
- Rating = **a single hand-inked Caveat numeral** ("8.7"), not five gray stars. Price = `$` glyphs. Cuisine + neighborhood = quiet Hanken metadata.
- **Hover (one restrained move):** card lifts 4px, a `chile` rule under the name draws left→right (`scaleX`), photo de-grades to color. Press: `scale(0.985)`. Focus-visible: 2px `chile` ring.

### HOMEPAGE / hero + discovery *(verdict-first, the big synthesis)*
- **Kill the search bar, filter chips, and card grid above the fold.**
- **Masthead:** oversized Fraunces wordmark + a **dateline in Bebas** — `LEANDER, TX · 176 SPOTS · NO CHAINS · {today}` — making it feel like an issue.
- **Tonight's Pick (the hero):** one full-bleed, full-color plate. Over it, Anthony's verdict in massive Fraunces + the Verdict Stamp + a single status line (open-now in `amber`, price, drive time). This is "Tonight's Call" (Cuban) as the default state (Elon) rendered editorially (Jobs).
- **FEED ME button** (Bebas, chile fill, amber on hover) sits on the hero: **re-rolls the pick client-side, sub-100ms**, off the 176-row dataset, **tuned to time-of-day** (filters on hours you already store) + three mood toggles **Cheap / Fancy / Adventure**. No page load. This is the "alive, almost a game" feel — and it's shareable ("the guide told me to eat here").
- **Below the fold:** the **"If you've got…" decision strip** (20 minutes / a date / out-of-town in-laws / $15) and a **horizontal swipe rail of cuisines-as-places** (Desi Land, Taco Trucks, BBQ Country) — not a tag cloud. *Then* search, framed as utility: "Find your spot."

### Per-restaurant DETAIL page *(the magazine feature — the payoff)*
- **Sticky full-height hero** photo; name + dateline + Verdict Stamp overlaid bottom-left on an ink-gradient scrim.
- **The review is the spine:** single ~66ch column, Fraunces 19px, **drop cap**, pull-quotes breaking the margin. His voice unbroken — logistics never interrupt the read.
- **"The Order"** — a called-out Caveat/ruled module: *exactly what to get.* The single most useful, un-Google-able thing a local guide can do. High on the page.
- **Right rail (desktop) / footer slab (mobile) = the spec sheet:** hours (with live open-now in amber), price, map (small, matter-of-fact — logistics, not the star), Google Maps link, badges, menu. Set like nutrition facts.
- Photos **interleave the prose as a film-strip**, big, like a photo essay — never a lightbox grid.
- **Ends with the blunt verdict line + the food-tour CTA** — sell the tour the moment he's made you hungry.

### Badges
Rubber-stamp chips, Bebas caps, 1px outline, rotation `-2deg`, faint ink texture:
- `HIDDEN GEM`, `LOCAL FAVORITE`, `NOT-A-CHAIN` → oxblood ink.
- `FOOD TRUCK` → amber ink (mobile/live energy).
Never colored bubbles. Real text + `aria-label`.

### About / Anthony page
The byline's home. Big Fraunces headline, a real portrait (full-color, full-bleed), his manifesto set as a long-form feature with Caveat marginalia and his **signature** at the end. This is also the **primary, strong home for the food-tour pitch** (per EP: don't sprinkle it everywhere; give it one anchor + the contextual detail-page footer).

### Food-tour CTA
**Torn-coupon module** (perforated dashed edge, slight rotation, amber accent). Two placements only: (1) bottom of every detail review, written **contextually** ("Anthony takes people here on the Desi Land tour →"), and (2) the About page anchor. It's the revenue — treat it like it, but don't dilute it into every surface.

---

## 7. Motion & micro-interactions

Framer Motion. **Transforms + opacity only. One shared easing token** (`cubic-bezier(0.22, 1, 0.36, 1)`). `prefers-reduced-motion` disables everything.

- **The Verdict Stamp "ink-on-paper" animation (the signature motion):** on enter/scroll, scale `1.15 → 1` + slight rotate settle + a quick smudge-opacity flash — *thud, like a stamp hitting paper.* ~220ms. Earns its keep; it's the one piece of motion everyone remembers.
- **Headline reveals:** 12px `clip-path` mask-wipe (not fade) on hero/section heads.
- **Card hover:** 4px lift + `scaleX` red rule draw + photo color-up (~150ms). No flips, no in-card parallax.
- **Hero image:** parallax scrub at 0.92.
- **FEED ME:** quick shuffle/cross-dissolve of the pick (no spinner — it's instant, client-side).
- Page transitions: shared-element on the card photo → detail hero where feasible.

---

## 8. Signature moments (what people remember)

1. **The Verdict Stamp** — Anthony's hand-set judgment (`WORTH THE GRAVEL` / `WORTH IT` / `SOLID` / `SKIP IT`), rotated, ink-bled, oxblood. Appears on cards, detail heroes, OG/share images, **and works as a filter** ("show me only WORTH THE GRAVEL"). It's his signature, literally. No competitor can copy it — they don't have him. **This is the brand. Build it first** (it forces type, color, and voice decisions for everything else).
2. **FEED ME** — the verdict-first home as a decision roulette. Turns indecision into a game, is shareable, runs client-side off data you already have.
3. **The masthead-as-issue** — dated, byline, ink-on-newsprint cover line. You feel you opened a publication, not a database.

*(Retention layer, shipped later: **The Leander Local Power Rankings** — a living numbered leaderboard with movement arrows (↑3, NEW, FELL OFF) + a monthly email. The come-back-weekly engine and the list you sell tours to.)*

---

## 9. Build notes (Tailwind + Next + ship order)

**Fonts (`app/fonts.ts`, `next/font/google`):** Fraunces (variable, axes `opsz,wght,SOFT`), Hanken_Grotesk, Caveat, Bebas_Neue → expose as CSS vars `--font-display`, `--font-ui`, `--font-hand`, `--font-stamp`. Self-hosted, `display: swap`, subset latin.

**`tailwind.config.ts` tokens:**
```ts
theme: {
  extend: {
    colors: {
      paper: '#F4EFE6', 'paper-raised': '#FBF7EF', 'paper-sunk': '#EAE0CE',
      ink: '#16130F', 'ink-soft': '#4A4239', rule: '#D8CDB8',
      chile: '#E03A1E', oxblood: '#7C1D12', amber: '#F2A516',
    },
    fontFamily: {
      display: ['var(--font-display)', 'Georgia', 'serif'],
      ui:      ['var(--font-ui)', 'system-ui', 'sans-serif'],
      hand:    ['var(--font-hand)', 'cursive'],
      stamp:   ['var(--font-stamp)', 'Impact', 'sans-serif'],
    },
    fontSize: {
      'masthead': ['clamp(2.75rem,8vw,7rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
      'feature':  ['clamp(1.75rem,4vw,3rem)',  { lineHeight: '1.0',  letterSpacing: '-0.02em' }],
      'read':     ['1.1875rem', { lineHeight: '1.7' }], // 19px review body
    },
    transitionTimingFunction: { editorial: 'cubic-bezier(0.22,1,0.36,1)' },
    backgroundImage: { grain: "url('/textures/paper-grain.svg')" },
  }
}
```

**Key utility classes / patterns:**
- `body`: `bg-paper text-ink font-ui bg-grain bg-repeat` (grain ~3% via the SVG's own opacity).
- Card photo grade: `grayscale-[0.15] contrast-125 sepia-[0.08] transition-[filter] duration-150 ease-editorial group-hover:grayscale-0 group-hover:sepia-0`.
- Stamp chip: `font-stamp uppercase tracking-[0.08em] text-oxblood ring-1 ring-oxblood/70 px-2 py-0.5 -rotate-2`.
- Verdict stamp: `font-stamp text-oxblood/90 rotate-[-3deg]` + an SVG ink-bleed mask; real text inside for a11y.
- Hairlines: `border-t border-rule` everywhere a card shadow would have been. **Zero `shadow-*`.**
- Focus: global `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chile`.

**Accessibility (WCAG AA, enforced):**
- Red **text** → `oxblood` only; `chile` for graphics/large display/rules. `amber` text only on `ink` surfaces; always word-paired (never color-alone meaning).
- Stamps/badges are real text with `aria-label`; rotation is visual only.
- All motion gated behind `motion-reduce:` / `prefers-reduced-motion`.
- 66ch measure, 19px review body, AA contrast on `ink-soft` metadata — long-read accessible.
- FEED ME button is a real `<button>`; the roulette announces the new pick via `aria-live="polite"`.

**Ship order:**
- **Phase 1 (the spine):** tokens + fonts + paper/grain + **the Verdict Stamp component** + the **Card** (perfected, applied to all 176, incl. designed empty/duotone state) + the **Detail page** (review-first, spec sheet, The Order, tour coupon). This alone kills "plain and lame."
- **Phase 2 (the hook):** verdict-first **Homepage** — masthead + Tonight's Pick + **FEED ME** (client-side, time-of-day + Cheap/Fancy/Adventure) + decision strip + cuisine rails + utility search below.
- **Phase 3 (retention/revenue):** **Power Rankings** + monthly email, About/Anthony feature, OG-image generation stamped with the Verdict, tour-booking funnel.

*Defer (don't over-engineer v1):* weather/mood ML, animated theatrics beyond the stamp + mask-reveal + card hover. Fake "mood" with the three buttons and ship.

---

# Appendix — Committee voices (raw)

### Steve Jobs
THE ONE FEELING (first 3 seconds): "A real person ate here, and he's about to tell me the truth." Not "browse 176 listings." Trust, appetite, and a point of view — before you've scrolled an inch.

THE BIG IDEA
Stop building a directory. Build Anthony's column. The current site is a database wearing a Tailwind costume. Kill that. This is a publication with a byline. Every pixel should feel like it came from one man with strong opinions and a full stomach — not a CMS. The competitor isn't Yelp. It's a great food magazine you actually finish reading. Editorial soul, utility underneath.

THE HOMEPAGE/HERO
Remove the search bar from the top. Remove the filter chips. Remove the grid of cards above the fold. All of it. The hero is ONE thing: a single, enormous, full-bleed photo of a real Leander plate — grease, steam, a gravel lot in the background — and over it, Anthony's verdict in massive editorial serif type. "Skip the chains. Eat where Leander actually eats." Set it in a real display face (Canela, GT Sezanne, or Tiempos Headline — not Inter, never Inter). Date it like an issue. One scroll-cue. That's the whole hero. The search lives one scroll down, where intent kicks in. We earn the utility by first earning belief.

THE RESTAURANT CARD
The current flat card is the disease. Cards should feel torn from a zine, not stamped from a template. Big photo, top. The name in that serif. But the signature move: a one-line Anthony pull-quote on every card — "best al pastor in a 20-mile radius, fight me." That single sentence is worth more than four metadata pills. Demote the rating to a small mark. The badges (Hidden Gem, Not-a-Chain, Food Truck) become a small letterpress-style stamp, not a colored bubble. One accent color only — a hot, cheap, beautiful diner red or chile orange against warm off-white paper and near-black ink. No emerald. No stone gray. No shadow soup.

THE DETAIL PAGE
This is the magazine feature. Full-bleed hero photo, the name huge, then Anthony's review set as REAL editorial body type — generous measure, drop cap, 19px+, the kind of typography you trust. His voice is the star; everything else (hours, map, menu, price) gets organized into a quiet right rail or a clean footer slab so it never interrupts the read. Photos run inline, big, like a photo essay. The map is small and matter-of-fact. End every review with his blunt verdict line and the food-tour CTA — because if you just made someone hungry, that's the moment to sell the tour.

THE ONE SIGNATURE ELEMENT
"The Verdict" stamp. Anthony renders a single hand-set judgment on every spot — WORTH IT / CHAIN-FREE / DRIVE FOR THIS / SKIP — rendered as a rubber-stamp graphic, slightly rotated, slightly imperfect, in that one red ink. It appears on cards, detail heroes, and as a filter ("show me only DRIVE FOR THIS"). It's his signature literally. No other Leander site can copy it because no other site has him. That stamp is the brand.

TOP 3 NON-NEGOTIABLES
1. A real editorial serif display face and big type — if it ships in Inter, we failed.
2. Anthony's voice is on every surface — a pull-quote on every card, his Verdict stamp everywhere. No anonymous metadata-only cards.
3. The hero is one photo, one sentence, one feeling — no search bar, no filters, no card grid above the fold.

====================

### Elon Musk
This is a design committee task — I'm playing Elon Musk giving redesign direction. No tools needed; this is a written deliverable.

---

# Elon's Redesign Direction — The Leander Local Guide

Let's start from physics. A food guide exists to answer one question with the lowest possible latency: **"Where do I eat tonight?"** The 2010 directory layout — search box, filter sidebar, grid of identical cards — optimizes for *browsing*, which is what you do when you have infinite time. Nobody has infinite time when they're hungry in a truck in a Leander gravel lot. So we throw out the directory metaphor entirely. The site shouldn't feel like a database with a skin. It should feel like Anthony grabbing your wrist and saying "no, not there — *here.*"

**The big idea: a decision engine, not a directory.** The default state isn't a grid — it's a verdict. One spot, full-bleed, Anthony's call, *right now*, tuned to time-of-day (it's 9pm Friday → it shows you the taco truck that's actually open, not the brunch place). A giant **"FEED ME"** button reshuffles the verdict instantly — sub-100ms, client-side, no page load. Discovery becomes a slot machine of good decisions. That's the "alive, almost a game" feeling: every tap is a new bet that pays off in food.

**Homepage / hero.** Kill the stone/emerald SaaS palette. Go editorial-zine: near-black paper, one molten accent (chile-oil orange or neon-sign cyan), a brutal display face (Druk / Tungsten condensed caps) against a warm serif for Anthony's prose (Freight Text / Caslon). Hero = one hero spot, edge-to-edge greasy photo, a 14-word Anthony pull-quote in huge type ("This trailer makes the best al pastor in Williamson County. Fight me."), price/badges/open-now as a single status line, and FEED ME. No carousel. No "Browse Categories." The category run lives below the fold as a horizontal swipe rail of *cuisines as a place* — "Desi Land," "Taco Trucks," "BBQ Country" — not a tag cloud.

**The restaurant card.** Cards today are flat boxes with tiny type — lame. Make the card a *zine clipping*: photo dominant, the badge (Hidden Gem / Not-a-Chain / Food Truck) as a die-cut sticker overlapping the corner at a slight rotation, the rating as Anthony's hand-scrawled number not five gray stars, and one savage sentence of his copy. On hover/tap it tilts and the photo pushes in. Scannable in 200ms, but it has a pulse.

**The detail page.** This is the payoff — treat it like a magazine feature, not a Yelp listing. Full-bleed hero, then Anthony's review in real reading typography with drop-cap and pull-quotes, the way you'd read a long-form piece. Sticky utility bar (Directions / Hours / Open-Now / Call) that follows you so the *useful* stuff is always one thumb away while the *soul* stuff scrolls. Photos as a film-strip, not a lightbox grid. Map is small and quiet — it's logistics, not the star.

**The one signature element only I'd push for: the "FEED ME" verdict roulette.** A single physical button that spins you a Leander spot tuned to time/weather/mood, with Anthony's one-liner, openable to the full review or instantly re-rolled. It's the homepage, it's shareable ("the guide told me to eat here"), and it turns indecision into a game. Ship it client-side off the 176-row dataset — trivially fast, works offline, zero backend risk.

**Sanity check:** the roulette is one component over data you already have — buildable in a sprint. The time-of-day tuning is just filtering on hours you already store. Don't over-engineer weather/mood on v1; fake mood with three buttons (Cheap / Fancy / Adventure) and ship.

**Top 3 non-negotiables:**
1. **FEED ME verdict-first homepage** — the default state is a decision, not a grid.
2. **Editorial typography + dark zine palette** — real display + serif fonts, one molten accent; if it could be any restaurant directory, we failed.
3. **Anthony's voice rendered as design** — his copy in big type, scrawled ratings, sticker badges; the personality must live in the *layout*, not just the words.

====================

### Mark Cuban
MARK CUBAN — REDESIGN DIRECTION

Let me be blunt: nobody needs another restaurant directory. Google already won that. Yelp already won that. If this site is a list of 176 places with cards and ratings, it's dead on arrival because you're competing with infinite, free, and faster. The ONLY reason this thing exists is Anthony. He's the moat. The product isn't the database — it's a guy with taste who will tell you the truth and get you fed tonight. Sell that, monetize that, everything else is plumbing.

THE BIG IDEA: Stop being a directory, become a verdict engine. Google tells you a place exists. Anthony tells you whether to go. The whole site should answer one question a hungry Leander local has at 6:45pm on a Tuesday: "where do I eat tonight?" Lead with opinion, not inventory.

THE HOMEPAGE/HERO: Kill the search-bar-in-a-stone-box SaaS hero. The hero is Anthony's face or his handwriting and ONE punchy line, then immediately "TONIGHT'S CALL" — a single, big, editorial pick of the day/week with his one-sentence gut-punch take and a "Take me there" button to Maps. Below that, a tight "If you've got 20 minutes / a date / out-of-town in-laws / $15" decision strip. People don't browse, they decide. Make the homepage decide WITH them.

THE RESTAURANT CARD: Right now they're flat and small and say nothing. Every card needs Anthony's verdict, not just a star rating — a 4-6 word pull-quote ("Best tacos in a gravel lot, period."). Badges (Not-a-Chain, Hidden Gem, Food Truck) should be loud and worn-like-a-medal because that's the editorial POV. One real photo, big. Price as $ glyphs. The card should feel like a baseball card you'd collect, not a spreadsheet row. If a card doesn't have a take, it doesn't ship.

THE DETAIL PAGE: This is where you build trust and where the money is. Hero photo, then ANTHONY'S REVIEW up top in big readable editorial type — the sensory, first-person stuff is the differentiation, don't bury it under hours and a map. "The Order" — tell me exactly what to get, that's the single most useful thing a local guide can do and Google can't. Then logistics (hours, map, photos). And on EVERY detail page, the food-tour CTA woven in contextually: "Anthony takes people here on the Desi Land tour →." That's your revenue hook, and it converts best when the reader is already nodding along to his review.

THE SIGNATURE ELEMENT ONLY I'D PUSH FOR: "The Leander Local Power Rankings" — a living, numbered, opinionated leaderboard Anthony updates, with movement arrows (↑3, NEW, FELL OFF). Rankings are inherently shareable, argument-starting, and habit-forming — people come back weekly to see who moved and to rage that their spot dropped. That's your retention engine AND your free marketing. Tie a monthly email ("This month's #1 will surprise you") to it and you've got a list you can sell tours to forever.

MY TOP 3 NON-NEGOTIABLES:
1. Lead with the verdict, not the database — every card and page carries Anthony's take and "The Order," or it doesn't exist.
2. The food tour CTA is contextual and everywhere a reader is already sold — that's the revenue, treat it like it.
3. Ship the weekly Power Rankings + email — that's the only thing that makes them come back without Google sending them.

====================

### a veteran Creative Director (art direction)
THE LEANDER LOCAL GUIDE — Creative Direction (Art)

THE BIG IDEA: "The Field Guide of a Man Who Eats." Not a directory — a personal dispatch. The reference stack is specific: the ink-and-newsprint grit of Lucky Peach (RIP), the confident editorial spine of Saveur/Bon Appétit feature spreads, the hand-marked authority of a Michelin inspector's notebook, and the Texas roadside vernacular of hand-painted taqueria signage and gas-station marquees. The site should feel printed, not rendered — like Anthony tore pages out of a zine, stapled in Polaroids, and scrawled in the margins. Gritty-premium: the grit is the personality, the premium is the typography and restraint keeping it from looking like a Geocities mess.

TYPOGRAPHY (the loudest voice): A condensed, high-contrast display serif for headlines — think a Times-Ten/Canela energy, set HUGE and tight, the way a magazine cover screams a cover line. Body in a warm, readable workhorse (a humanist sans like Söhne or a clean grotesque) so reviews stay scannable. Anthony's voice gets a third typeface: a real handwritten/marker script for his asides, pull quotes, and verdicts — like he annotated the page. Three-voice system: the magazine, the reader, the man.

COLOR MOOD: Kill the stone/emerald. Go warm-dark and appetite-driven: aged newsprint cream (#F4EBDD), oxblood/dried-chile red as the hero accent, charcoal-black ink, with a single electric signature — a hot diner-neon amber/orange that only appears on live moments (badges, the tour CTA, hover states). Texture everywhere: subtle paper grain, halftone dot screens on photos, a faint registration-misprint offset on big type.

PHOTOGRAPHY: Treat every photo like documentary food journalism, not stock. Default to a duotone/high-contrast warm treatment with grain so a mediocre phone photo of a gravel-lot taco truck looks intentional and cinematic. Reserve full-color, full-bleed for hero shots only. Crop aggressively and off-center.

HOMEPAGE/HERO: A magazine cover. One enormous full-bleed photo (steam, char, a hand reaching in), a gigantic condensed-serif cover line ("SKIP THE CHAINS."), and a deck in Anthony's hand. Below it, a "This Week in Leander" editorial strip, not a card grid — featured spots written up like a contents page. The utility (search/filter) lives one scroll down, framed as "Find your spot."

RESTAURANT CARD: Postcard-meets-trading-card. Duotone photo, the name in condensed serif, cuisine as a typed label, and badges as LETTERPRESS/rubber-stamp marks ("HIDDEN GEM" stamped diagonal in red ink) — not pill buttons. Anthony's one-line verdict in his script font is the hook, not the address. Price as $ glyphs, rating as a hand-inked mark.

DETAIL PAGE: The feature article. Full-bleed hero, headline, a byline ("Reviewed by The Leander Local"), then his review set in a real measure with drop-cap and pull quotes. Hours/map/menu live in a sidebar "service" rail like a magazine's info box. Photos run as a film-strip gallery.

SIGNATURE ELEMENT: "The Verdict Stamp." Every spot Anthony blesses gets a hand-stamped seal — "ANTHONY APPROVED" or "WORTH THE DRIVE" — that animates on scroll like ink hitting paper (a quick rotate-and-thud with a faint smudge). It's his signature, his authority, and the one piece of motion that earns its keep.

TOP 3 NON-NEGOTIABLES:
1. Three-voice type system (condensed display serif + workhorse body + handwritten Anthony) — this is the soul; without it we're a directory again.
2. Newsprint-cream + oxblood + diner-neon palette with real paper/halftone texture. No flat white cards, no emerald.
3. The hand-stamped Verdict Stamp as the brand's recurring signature moment.

====================

### an experienced Executive Producer
This is a writing/strategy task — I'm asked to give redesign direction as the Executive Producer on a committee. No code or files to explore; the deliverable is the written direction itself. Let me write it.

---

# Redesign Direction — The Leander Local Guide
### From the Executive Producer: coherence, scope, and what ships first

**The big idea: "The Leander Local" is a byline, not a brand.**
Stop building a directory with a mascot bolted on. Build Anthony's column that happens to be searchable. The through-line is *editorial authorship* — every surface reads like it came from one opinionated person at one desk. Concretely, that means three things repeated everywhere: (1) a fixed voice device — Anthony's verdict always rendered as a pull-quote in a serif display face, signed; (2) a consistent "stamp" system — the badges (Hidden Gem, Not-a-Chain, Food Truck) treated like rubber-stamped press marks, not pill tags; (3) one warm, high-contrast palette that reads as print, not SaaS. The test for any new element: *would it look at home in a printed zine?* If not, cut it.

**Palette & type (the spine that enforces coherence):** ditch stone/emerald. Go ink-on-newsprint — warm off-white paper, near-black ink, ONE hot accent (chile red or a sodium-vapor amber, pick one and commit). Type pairing: a loud condensed display serif for headlines/verdicts (think editorial masthead), a clean grotesk for UI/utility. That single pairing, used with discipline, does 70% of the personality work and costs nothing in performance.

**Homepage/hero:** kill the search-bar-on-gradient. Open with a masthead — the title set huge, a dated standfirst in Anthony's voice ("Skip the chains..."), and his current pick as a full-bleed editorial lead, photo-forward with the verdict overlaid. Below it, *not* an undifferentiated grid: a curated front page — "This Week," "Desi Land," "Gravel-Lot Trucks" — each a labeled run. Search exists but lives as a utility, secondary to the edit. The home page should feel chosen.

**The restaurant card:** the card is the atom — get it right once. Photo-led, generous; name in the display face; ONE line of Anthony in his voice (not a description); the stamp(s); rating, price, neighborhood as quiet metadata. Motion budget: a single restrained hover (image lift/scale, ~150ms). No flips, no parallax inside cards. Consistency across all 176 here is what reads as premium.

**The detail page:** the payoff. Full-bleed hero, then the review as the spine — long-form, generous measure, drop cap, his voice unbroken. Utility (hours, map, price, Maps link, photos, menu) rails alongside, never interrupting the read. This is where author + utility must marry: you came to read, you leave knowing it's open and where to park.

**My signature push: the "Anthony's Take" verdict block — a recurring, signed, hand-lettered-feel rubber stamp** that appears identically on card, collection, and detail. It's the molecule of the whole identity: one component, three placements, instantly recognizable. Build it first; it forces the type, color, and voice decisions for everything else.

**Scope traps to name now:** (1) 176 spots, uneven data — design the *empty state* as a feature ("Anthony hasn't eaten here yet — but he will"), don't hide gaps. (2) Photos are the make-or-break; budget art direction/treatment (consistent duotone or warm grade) so DB photos of varying quality cohere. (3) The food-tour CTA is a real product — give it one strong home (About + detail footer), don't sprinkle it. (4) Motion: one shared easing token, hover + page-transition only. Resist scroll theatrics.

### Top 3 non-negotiables
1. **One verdict component, three placements** — ship the signed "Anthony's Take" stamp before anything else; it locks type, color, and voice.
2. **The card is the contract** — perfect one card spec and apply it to all 176 identically; consistency over cleverness.
3. **Photo treatment + designed empty states** — a unifying image grade and an in-voice "not reviewed yet" slot, decided before launch, not after.

====================

### the best website designer in the world — an Awwwards / FWA "Site of the Year"-caliber digital design master, at the craft level of Apple.com, Stripe, Linear, and the top interactive studios
# The Leander Local Guide — Redesign Direction

**The big idea: "The Zine, not the Directory."** Stop treating this like Yelp and start treating it like a printed food magazine that happens to be fast software. The organizing metaphor is *ink on newsprint* — a tactile, opinionated broadsheet where Anthony's voice is the product and the data is the muscle underneath. Everything keys off one decision: **editorial restraint + one loud accent.** A warm off-white paper base (`#F4EFE6`), near-black ink (`#16130F`), and a single hot signal color — a chile/taillight red (`#E03A1E`) used like a censor's marker, never decoratively. Texture: a subtle SVG paper grain at ~3% opacity and a hairline 1px rule system instead of card shadows. No flat emerald SaaS cards anywhere.

**Typography is the whole personality.** Pair a high-contrast display serif (Canela, GT Sectra, or free: Fraunces with `opsz`/`SOFT` axes cranked) for headlines against a workhorse grotesk (Söhne / Inter Tight) for utility, plus a typewriter mono (JetBrains Mono) for Anthony's *byline, datelines, and verdict stamps*. Fluid scale: `clamp(2.75rem, 8vw, 7rem)` for hero heads, ragged-right, tight `-0.03em` tracking. Big type IS the design.

**Homepage / hero.** Kill the search-bar-on-gradient. Open on a full-bleed masthead: oversized Fraunces wordmark, a dateline ("LEANDER, TX · 176 SPOTS · NO CHAINS"), and a rotating *pull-quote* from a current review set in display serif — the first thing you read is Anthony's mouth, not a filter. Below, an **editorial bento**: one large "Tonight's Pick" feature tile (2x2), flanked by asymmetric category entries (Desi Land, Taco Trucks, BBQ) at unequal weights. Scroll choreography via Framer Motion: headlines do a 12px mask-reveal (`clip-path` wipe, not fade), images parallax at 0.92 scrub. Motion budget: transforms/opacity only, `prefers-reduced-motion` kills it all.

**The restaurant card.** This is the hero component. Treat it like a **trading card / matchbook**: full-bleed duotone-treated photo (red/ink multiply on hover → reveals true color), name in display serif overlapping the image edge by ~16px (deliberate overlap = print collage). Badges become **rubber-stamp chips** (mono, uppercase, 1px outline, slight rotation `-2deg`) — "HIDDEN GEM," "NOT-A-CHAIN" read like ink stamps, not pills. Rating as a hand-set numeral, not five stars. Hover: card lifts 4px, the red rule under the name draws left-to-right (`scaleX`), price/cuisine slide in. Press state: scale `0.985`. Focus-visible: 2px red ring, AA-contrast guaranteed.

**The detail page.** Magazine feature spread. Sticky full-height hero photo, headline + dateline + verdict overlaid bottom-left. As you scroll, the **review sets in a true measure (~66ch) single column with a drop cap** and pull-quotes breaking the margin — Anthony's prose finally has room to breathe. Right rail (desktop) becomes a sticky "spec sheet": hours, price, map, badges, set in mono like nutrition facts. Photos interleave the prose, not dumped in a grid. Tour CTA appears as a torn-coupon module.

**The signature element I'd push for: "The Verdict Stamp."** Every spot gets one Anthony-authored 2–4 word verdict ("WORTH THE GRAVEL," "SKIP IT") rendered as a rotated, ink-bleed rubber stamp that animates on — a quick scale-down + slight settle. It threads cards → detail → share/OG images, and becomes the brand's recognizable visual signature. Pure CSS, accessible (real text, `aria` intact), zero perf cost.

**Top 3 non-negotiables:**
1. **Editorial serif + paper/ink palette + one red** — no SaaS stone/emerald, ever.
2. **Anthony's voice is above the fold** — a real pull-quote leads, not a search box.
3. **The Verdict Stamp ships** — it's the soul that makes this un-template-able.