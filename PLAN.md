# The Leander Local Guide — Product Architecture & Build Plan

*Lead product architect synthesis. Inputs: 4 competitive teardowns, data-sourcing/legal analysis, five subsystem specs (data model, content pipeline, ratings, architecture, feature set), and a ruthless gap review (legal, privacy, sustainability, accessibility).*

---

## 1) Vision & Scope

**The wedge.** Every teardown converges on one finding: Google/Yelp/TripAdvisor/Beli own *comprehensiveness and freshness via scale*; they are structurally incapable of *editorial voice, transparency, and a clean, ad-free, login-free read*. National guides (Eater/Infatuation/Michelin) ignore suburbs like Leander entirely. **That gap is the entire business: be the opinionated, transparent, comprehensive authority on Leander food that no platform bothers to be.**

**Brand spine:** "Skip the chains. Find the spots that actually make Leander worth staying in." Anti-chain, pro-local, blunt, honest about its own scoring.

**Scope (v1):** **City-limits-strict Leander** as the default geofence (~120–180 establishments; ~90–130 worth a full detail page), with a clearly-labeled "Greater Leander / Worth the Drive" tier for adjacent Cedar Park/Jonestown/Liberty Hill spots (handled by `inServiceArea: false` → derived `Nearby` badge). Define the geofence as a PostGIS polygon, not a ZIP set (78641/78645 bleed into other towns).

**Bilingual from the start.** Central TX / Leander has a large Spanish-speaking base, and the brand explicitly romanticizes immigrant kitchens — so Spanish is not a "later" item, it is part of the identity, the addressable audience, and an SEO surface. v1 ships a Spanish UI track plus Spanish content for the "Essential Leander" canon and all key pages, with `hreflang` pairing (see §6).

**Three product promises** that define every feature: (1) **Comprehensive** — every operating food/drink spot, including the food-truck/ghost-kitchen long tail the incumbents undercount; (2) **Always-fresh** — open/closed/verified-on-date is a first-class visible field, **with the freshness mechanism engineered to actually hold (live status + crowd reports, not a quarterly permit pull — see §3)**; (3) **Opinionated & transparent** — a disclosed house voice plus a published, decomposable scoring formula.

**Sustainability is in scope, not assumed.** "No ads, no pay-to-play" is a brand promise, but the guide still has real recurring costs (LLM drafting, Google Places calls, photography, editorial + moderation labor). v1 therefore ships with an explicit, *non-corrupting* economic model OR a documented owner-funded runway with a hard cost ceiling — decided up front (see §10, decision 11), never bolted on later. Permitted non-corrupting levers: clearly-labeled affiliate order/deep-links, premium owner tools that **cannot touch ranking**, and walled/disclosed sponsorship. Ranking and editorial scoring are never for sale, stated loudly.

**Out of scope (deliberately):** reservations/booking inventory, ad networks/paid placement, general social feed, real-name profiles, multi-city expansion (the architecture stays repeatable for it, but Leander ships first).

---

## 2) Restaurant Data Model + Full Taxonomy/Badges

**The one load-bearing decision: kill `tags: string[]`.** Today it overloads five unrelated concerns (real badges, locality, governance flags, editorial vibes, an icon switch). Replace with four separated axes plus a **derived** badge projection.

**Core entity `Restaurant`** (replaces `Listing`), with every field tagged by source. Required-to-publish **[R]**, enriched **[E]**, derived **[D]**:

- **Identity/resolution:** `id`/`slug` [R, immutable once published], `aka[]`, `resolution { googlePlaceId, osmId, fsqId, permitId, fingerprint[D] }`. **Google Place ID is the single canonical external anchor** — the join key for live hours, photos, maps link, and rating display. `fingerprint = sha1(normName|zip|street#)` for dedup (catches the existing duplicate Sharks Burger / Rabbit Hole records).
- **Classification:** `primaryCategory` [R] (Restaurant, Food Truck, Cafe, Coffee, Bakery, Bar, Brewery, Distillery, Winery, Dessert — **Food Truck is promoted from tag to category**, drives the card icon switch), `secondaryCategories[]`, `cuisines[]` [R, controlled vocab], `priceTier` 1–4.
- **Geo/locality:** `locality` [R] (factual city) + `inServiceArea` [R] (editorial "counts as Leander"), structured `address` (keep `formatted` for the footer string), `geo {lat,lng}`.
- **Hours:** structured `HoursModel` — `displayHours` string (preserves today's footer render) + `weekly: {day: TimeRange[]}` (multi-window lunch/dinner, overnight-close rule `close<=open ⇒ next day`), `exceptions[]` for holidays, `lastConfirmed`. Upgrade `isOpenNow()` from single-range to `weekly[today].some(withinRange)`.
- **Attributes (typed facts that BACK badges):** `chainStatus`, `serviceModes[]`, `dietary[]`, `patio`, `dogFriendly`, `kidFriendly`, `liveMusic`, `sportsBar`, `adultsOnly`, `servesFood`, `servesBreakfast`, `reservations`, `parking`, `alcohol`, `wifi`, `openedDate`.
- **Content:** structured `menu` (sections/items/highlights + `lastUpdated`) or fallback `links.menuUrl`; `photos[]` (**self-hosted only, with a rights record per photo — never hotlink/persist Google imagery; see §3 and the licensing model below**), `links` [R: `googleMapsUrl`].
- **Ratings:** `ratings { composite[D], compositeMethod, editorial, site, googleLive[transient — never persisted] }` — replaces flat `rating:number`. **`composite` is computed and stored only from rights-clean signal (first-party users, permit data, editorial); any Google-derived number is fetched live and shown beside the composite, never folded into a stored value (see §5).** `compositeMethod` records exactly which pillars contributed.
- **Editorial:** `editorial { persona:'house', byline, voiceProfile, review, pullQuote, sourcesUsed[], generatedBy, reviewedBy, publishedAt, inputSnapshotRef }`.
- **Health/inspection:** `inspection { score, gradeDate, sourceUrl, lastFetched }` — stored, but always rendered with date + source link and a fast correction path (see §4/§6).
- **Governance/provenance:** `status` (draft|needs_verify|published|closed), `verification {lastVerifiedAt, method, confidence}`, `badgesEditorial[]` [R, hand-set only], `badges[]` [D, computed by `deriveBadges()`], per-field `provenance` map (records source + license obligation, so ODbL-bound OSM fields stay flagged — see §3), `createdAt`/`updatedAt`.

**Taxonomy — tiered, curated, NOT icon soup** (Michelin's lesson). Two visual tiers, **and every badge encodes meaning by icon + label, never color alone** (accessibility — see §6):

- **Distinction (scarce, prominent, color-coded *plus* labeled):** Not-a-Chain · Local Favorite · Hidden Gem · Editor's Pick · New (<90d/<6mo) · Institution (10+ yrs) · Worth the Drive · Old Town Leander.
- **Format:** Food Truck · Brick-and-Mortar · Pop-up · Counter-Service · Full-Service · Drive-Thru.
- **Cuisine (multi-select, closed enum — never free-text):** Tex-Mex, BBQ, Tacos, Vietnamese, Indian, Pizza, Burgers, Seafood, Breakfast/Brunch, etc.
- **Price:** $ / $$ / $$$ / $$$$.
- **Dietary:** Vegetarian-Friendly · Vegan Options · Gluten-Free Options · Halal.
- **Amenities (secondary, dense, muted):** Patio · Dog-Friendly · Kid-Friendly · Late-Night · Open Late · Happy Hour · Live Music · Sports Bar · Takeout · Delivery · 21+ · Wi-Fi.
- **Trust (differentiated — no competitor surfaces this):** County **Health Score** · Verified-on-date · Locally-verified review.

**Rule:** facts are stored, badges are derived. A pure build-time `deriveBadges(r)` computes the full badge list; humans only ever touch `badgesEditorial` and the underlying `attributes`. Editorial badges (Hidden Gem, Editor's Pick) are the only hand-set ones; the persona badge auto-sets when a persona review exists.

**User reviews are a separate entity** (mutable, UGC) living in Postgres — not embedded in the static record — rolling up into `ratings.site`. **Owner responses are a sibling entity** keyed to a verified claim (see §6).

---

## 3) Data Collection & Content Pipeline (the automated "newsroom")

A 3-layer sourcing model dictated by the legal reality (**facts are free; expression, *and platform ToS, and database licenses* are not**). The rights posture below is load-bearing — it is what lets us legally ship a *stored* composite and original content.

**Layer 1 — Owned, storable backbone (lives in web1 Postgres/PostGIS):**
- **Williamson County/Cedar Park Health Dept (WCCHD) food permits** = authoritative roster of every operating establishment + **inspection scores**. Free public records, fully reusable — the completeness guarantee and a unique trust badge. A permit dropping off is a *soft* closure signal that lowers confidence; it never auto-closes a listing (see freshness rules below).
- **Foursquare OS Places (Apache-2.0, permissive)** = names, geo, categories, hours, website, dietary tags. Store, dedup, redistribute freely. This is the primary third-party backbone.
- **OSM / Overture (NOT "free" — license-bound):** OSM is **ODbL** (attribution + share-alike on derived databases); Overture carries its own attribution terms. **Decision required before ingest (see §10):** either (a) treat FSQ + permits + first-party as the canonical dataset and use OSM only as a *display-time reference* without co-mingling it into the stored database, or (b) accept ODbL — isolate OSM-sourced fields via the `provenance` map, render the required attribution, and accept share-alike on the derived database. Default recommendation: **(a) — lean on permissive FSQ + first-party, keep OSM out of the stored DB** to avoid encumbering the whole dataset.

**Layer 2 — Live-fetch enrichment edge (display-time, almost zero storage):**
- **Google Places (New)** is a *live* call only, for what it does best and what changes often: open/closed status, the canonical photo, the Maps deep-link. **Per Google ToS we may persist only `place_id` (indefinitely) + `lat/lng` (≤30 days); everything else is rendered live with attribution and is NEVER cached, snapshotted, or folded into any stored field.** Critically, **Google rating numbers do NOT enter the stored composite** (see §1 of the gap fixes and §5) — they may only be displayed live, side-by-side, clearly labeled as Google's.
- **Cost is engineered, not asserted.** Live Google fields are fetched **only on genuine human navigation** — never during ISR prerender, never for bot/crawler hits (bot detection + ISR fallback serves the static shell). A **hard monthly Places budget with alerting** is set in OpenBao-config; on breach the page gracefully degrades to "last known status (as of …)" and a Maps link rather than a live call. The live field set is minimized to the few that actually change.
- **Drop Yelp as a data source** — 24h cache cap + "no benefiting a competitor" clause make a comprehensive directory a liability; at most a deep-link badge.

**Layer 3 — Editorial / house-voice (original expression):** Aggregate only *storable, rights-clean* signal — our own user reviews, FSQ fields, first-party visits, permit narratives. **The sentiment input is first-party only:** we do NOT scrape, store, or run NLP over incumbent (Google/Yelp) review prose — Places returns only ~5 reviews and restricts derived analysis, and we have no licensed corpus. "Sentiment themes" are computed exclusively from our own user reviews + permit narratives, which is why the S pillar is cold at launch (see §5). An LLM drafts; a human edits; output is original opinion-prose. **Never store scraped review prose; never reproduce snippets verbatim; never attribute synthesized sentiment to a named individual.**

**Source-adapter abstraction (resilience).** Google "Places (New)" and FSQ/Overture schemas churn. All ingest and live-fetch goes through a **thin source-adapter interface with contract tests**, so a provider's breaking change is caught by tests and isolated to one adapter rather than rotting the pipeline silently.

**Pipeline stages** (runs on web1 Docker/cron — the private "newsroom," never public):
1. **Discovery** (weekly): permit list + FSQ/Overture delta + a public "Suggest a spot" form (catches trucks/ghost kitchens — the edge over TripAdvisor's undercount).
2. **Normalization & geofence check** (PostGIS polygon).
3. **Dedup / entity resolution:** blocking by normalized-name token + geohash (~150m) + phone; weighted match scoring (Jaro-Winkler name, address, phone, geo, domain); auto-merge high / human-queue mid / distinct low. **Maintain a crosswalk:** internal UUID ↔ google_place_id ↔ fsq_id ↔ osm_id ↔ permit#. Chain detection sets `chainStatus`.
4. **Enrichment:** core facts + **first-party** sentiment themes (topics/counts, never copied text) + rights-clean composite inputs.
5. **Staging & scoring:** completeness score (hours+address+category+≥1 photo+menu link = publishable), per-field confidence, change-detection diff so the human queue stays small.

**Freshness mechanism (the promise, made real).** Because permits are quarterly and one operator cannot hand-confirm 120–180 spots on demand, freshness leans on the live edge + crowd, not the slow backbone:
- Closure/open-status detection rides **live Google open-status + crowd "report closed" reports**, not the permit cycle.
- **No automatic closure ever.** A listing is flagged "closed" only on **N independent reports + a live open-status cross-check + human verify**; reports are rate-limited per account/IP (anti-competitor-weapon — a single malicious report cannot mis-flag a live business).
- A realistic **per-spot confirmation rotation** is scheduled so every spot cycles through human re-verification on a defined cadence; `lastConfirmed`/"as of" dates are shown honestly and **confidence auto-degrades with age** rather than silently presenting stale data as fresh.

**Refresh cadence:** permits quarterly · FSQ/Overture monthly · live status on genuine human view · crowd/closure signals continuous · rotation-based human re-confirmation · full re-enrichment quarterly · review re-draft only on material fact/sentiment change.

**Pipeline dead-man's-switch.** Uptime monitoring (Kuma) does not catch *data* rot. A **per-source freshness/heartbeat monitor alerts the operator if any source's last successful ingest exceeds its cadence**, and an internal staleness dashboard makes silent pipeline breakage visible. Without this, "always-fresh" fails invisibly.

---

## 4) Editorial Voice — the house persona + legal advisory

**Legal advisory (firm):** Do **not** publish under "Anthony Bourdain" or simulate him. He died in 2018 (NY domicile); **New York's 2021 post-mortem right of publicity (ROPA)** gives his estate a descendible right in name/voice/likeness for **40 years (~until 2058)**. A commercial review byline is unauthorized commercial use, exposes a **Lanham Act §43(a) false-endorsement** claim, and is plain consumer deception — squarely against the owner's honesty mandate. ROPA's parody/news/biography exemptions do **not** cover a directory's marketing byline.

**The safe, owned alternative — an original house persona, inspired in register only:**
- **Invent an original, trademarkable byline** (vet that it isn't a real food writer): e.g. "The Leander Local," "Last Honest Plate," or a clearly-fictional named critic like "Hank Travis, roving appetite." Own it as a brand asset.
- **Codify the voice in a style guide, not a person:** first-person, present-tense, sensory, anti-pretension, romanticizes dives and immigrant kitchens, scorns chains. The *register* is unprotected; only the specific real individual is. Never mimic any real critic's catchphrases/biography closely enough to imply it's "them."
- **Disclose site-wide** (footer + every review + About page): *"Reviews are editorial opinion by our house critic — AI-assisted, human-edited, synthesized from our own visits and our readers' reviews. A fictional editorial persona, not affiliated with or endorsed by any real critic."* This neutralizes false-endorsement, misrepresentation, and the "is this real?" question simultaneously. **The persona disclosure is bilingual (EN/ES).**

**Anti-fabrication by construction:** the model is handed a structured facts JSON + first-party sentiment-themes JSON and may assert only what's provided (missing fields flagged "do not assert"); two-pass draft→self-check highlights unsupported spans; every review stored with its input snapshot (`inputSnapshotRef`) + model/prompt version for audit.

**Defamation & health-score safety:** negative commentary must be opinion-framed and backed by *aggregate* first-party sentiment volume, never a single complaint, never a factual accusation (illness/hygiene/legal) unless citing the public inspection record verbatim with a link. **Inspection/health scores are always published with the inspection date + source link + a documented correction SLA** (publishing stale or mis-attributed scores invites defamation/owner action — so these display rules ship *with* the MVP detail page, not as a later decision). A pre-publish lint routes risky assertions to mandatory human review.

**Review structure:** Hook → The take → Order-this (real dishes) → Honest caveat → Verdict + score + badges → facts/disclosure footer. Pairs the gonzo voice with a scannable "The Deal" block (Time Out's "We say / What's good" primitive — good for readers and SEO/AI citation).

---

## 5) Ratings System (composite + user + anti-gaming)

**The LLG Composite Score** — one decomposable 0–10 headline (one decimal), every point explainable in the UI. **Transparency is the anti-gaming armor AND the brand's "we tell you the truth" credibility.** The hard constraint shaping the whole design: **the *stored* composite may only be derived from rights-clean signal.** Google rating numbers are display-only and live; they never enter a persisted score (Google ToS forbids storing/caching Places content beyond `place_id` and forbids using Places data to build a competing aggregated rating). `compositeMethod` records exactly which pillars contributed for each record.

**Pillars (weights are config in `data/rating_weights.ts`, shown on a public `/how-we-rate` page):**
- **U — Our verified users** (auto-scales with volume/trust) — the primary stored pillar.
- **E — Editorial** (house critic's 0–10, **capped**, requires a logged visit).
- **H — Permit/inspection signal** (rights-clean public-record input).
- **S — Sentiment** — runs **only over first-party user reviews + permit narratives** (never incumbent review prose, which we have no license to acquire or process). S therefore starts near-zero and grows with UGC volume; until then its weight is redistributed, not faked.
- **G — Google public aggregate (DISPLAY ONLY, never stored):** the live Google number and count are shown *beside* the composite, clearly labeled as Google's metric — never republished as ours, never snapshotted, never folded in. This is what keeps us on the right side of Google ToS and of the "we don't launder other platforms' stars" promise.

**Mechanics that resist gaming:**
- **Bayesian shrinkage** within category (`m≈8`): thin data regresses to the category mean — 3 reviews can't mint a #1.
- **Recency decay** (half-life ~540 days): self-healing; editorial weight auto-halves if last visit >24 months ("Last tasted: [date]").
- **Cold-start dynamic weighting:** at launch U and S are thin, so weight leans on E + H and grows toward U as the community matures: `w_U = base·n_U/(n_U+15)`. Because Google is display-only, there is no "P pillar absorbs the slack" — the slack is held by editorial + permit signal, not by laundering Google's numbers.
- **Confidence tier** shown beside the number: High / Medium / **Provisional** (thin or anomalous data is grayed and **suppressed from "Top of Leander" rankings** — stops astroturf ambush).
- **Transparency UI:** per-detail-page "Score breakdown" — pillar contributions, confidence tier, "Last updated / Last tasted," plain-English summary. **The breakdown has a full text/ARIA equivalent — the donut visual is never the only encoding** (accessibility, §6).

**User submission + moderation** (web1 Supabase — Postgres + Auth + edge functions, Cloudflare Turnstile in front):
- 1–5 overall stars + optional **sub-ratings (Food/Value/Vibe/Service)**, optional text, affirmable structured tags (vote toward badges at ≥3 independent confirmations), visit month/year, optional **EXIF-stripped** photo (EXIF-stripping is privacy hygiene, *not* rights clearance — see the upload-rights model below).
- **No anonymous reviews** (magic-link/OAuth); per-account **trust score (0–1)** multiplies pillar-U weight; new accounts contribute 0 weight until cleared.
- **Brigade/burst detection:** anomaly detector on each listing's time-series auto-holds 5★ astroturf or 1★ review-bombs, correlates by signup window/IP/ASN/near-duplicate text, quarantines clusters at 0 weight pending human review.
- **Content fraud:** near-dup detection, LLM classifier (fake praise, competitor disparagement, "I own this"), owner self-review blocking (email-domain match).
- **Moderation queue** (pending→approved|rejected|quarantined|shadow-held), trust-gated auto-approve only for clean high-trust accounts, immutable audit log, appeals path.

**Privacy & UGC-rights compliance (Texas TDPSA + DMCA — required before any public write path):**
- The fraud system *requires* retaining IPs/ASN/behavioral signals, and we collect emails, OAuth identity, EXIF, photos. The **Texas Data Privacy & Security Act (in force 2024)** therefore applies: ship a **privacy notice, documented purpose/retention schedule (especially the fraud-signal IP/ASN retention window), DSAR/opt-out workflow, and consent for any tracking** — all linked from About, in EN/ES.
- **Photo/UGC rights:** register a **DMCA agent**; every upload (user *and* claimed-owner) requires a **rights-attestation checkbox + license grant**; add a **repeat-infringer policy** and a UGC content ToS. EXIF-stripping does not clear copyright — this does.

Display **side-by-side, transparent:** `Our take: 8.4` (stored composite) · `Google: 4.3★ (62) ↗` (live, labeled, link-out) — explicitly *our* metric vs. *their* metric, never a republication of Google's stars as our own.

---

## 6) Full Feature Set — prioritized MVP / v1 / Later

**Guiding principles (non-negotiable, from the "avoid" lists):** fully readable anonymously (auth gates contributing only); no pay-to-play, stated loudly; transparency over opacity; tiered badges; disclosed persona; facts stored, restricted expression displayed-live-or-not-at-all; **WCAG 2.2 AA** and **bilingual (EN/ES)** are baseline, not enhancements.

**MVP — The Opinionated Static Directory** (ships on current static export + client-side; the best *read* about Leander food before any account exists):
- **Restaurant Card:** hero photo (self-hosted, AVIF/WebP, responsive, enforced alt text), one-line hook, 1–2 prominent distinction badges (icon + label, never color-only), house score (0–10), scannable facts row (cuisine · price · neighborhood · **Open-now pill**), muted attribute badges. Whole card → detail page.
- **Detail page (one restaurant, one fast page):** hero band → ratings strip (house composite; Google shown live + labeled; Locals slot reserved) → sub-rating bars → **two-part review** ("[Persona] says" + "The Deal") → tiered badges → full-week hours w/ today highlighted → embedded map + "Open in Google Maps" deep-link → photo gallery (popular-dish tagged) → practical facts incl. **health score with inspection date + source link + "report a correction"** → menu (embedded/linked) → **"Suggest an edit / Report closed"** → **JSON-LD scoped correctly (see below)**.
- **Structured-data discipline (Google policy):** mark up *our* content as `Review`/`Article` authored by our org. **Do NOT emit `AggregateRating` on the `Restaurant` entity from third-party-sourced ratings** (self-serving/third-party-review rule → manual-action risk). `AggregateRating` is reserved strictly for *our own first-party user reviews*, clearly scoped, and only once that UGC exists (v1+).
- **Discovery:** faceted filtering (cuisine/price/badges/dietary/Open-now/food-truck — multi-select, URL-encoded/shareable), client-side search, **map view with category pins encoded by icon + label, not color alone, keyboard-navigable, with clustering for performance**, **curated collections/leaderboards** ("Best tacos," "Top 10 Not-a-Chain," "Best patios," "Open late," "Essential Leander" canon — the editorial heart, each a shareable SEO page), sort by score/distance/newest, **"New in Leander / Recently Closed"** freshness surfaces, events tie-in (existing `/events`).
- **Index-bloat guardrails (SEO):** shareable facet combinations and auto-collections can spawn thousands of thin/duplicate pages. Ship **canonical rules, a selectively-indexable facet whitelist, `noindex` on thin/combinatorial pages, and a minimum-content threshold before a collection is indexable** — protecting crawl budget from day one.
- **Bilingual + a11y:** EN/ES UI and canon content with `hreflang`; all interactive components keyboard-operable; score breakdown has a text equivalent; enforced alt text.
- **Engagement-light:** share buttons + great per-card OG images, single inline newsletter field (no pop-up wall).

**v1 — Community, Freshness & Engagement (web1 Supabase tier):**
- User reviews + sub-ratings + **short "tips"** feeding the transparent composite; **verified-local "Leander Local" badge** (verified vs. unverified shown openly); pseudonymous handles by default. **Privacy notice + DSAR + DMCA agent live before this ships (§5).**
- **Owner-response + claim flow (table stakes — every incumbent has it):** after a **verified claim**, owners can post a clearly-labeled response to reviews and to our house take, and use a documented **factual-correction/dispute SLA** for reviews and health scores. **Claim verification is specified, not hand-waved:** business-line callback/SMS, postcard code, email-domain match, or Google Business cross-check — *before* claim is granted (anti-hijack). Claiming **never buys ranking**, stated on the flow itself.
- **"Suggest a spot"** + one-tap **"Report closed / hours changed"** with the abuse-resistant rules from §3 (N independent reports + live cross-check + human verify + rate-limit).
- Composite score live with published formula; save/favorite + personal & **followable/shareable lists**; follow-and-notify for trucks/spots.
- Data pipeline online (permits + FSQ ingest, crosswalk dedup, source adapters, freshness heartbeat).

**Later — Definitive-authority & habit layer:**
- **Beli-style head-to-head comparison ranking** (editors then trusted locals) → precise scores that beat star compression and power honest leaderboards.
- First-party AI review-highlight summaries (storable signal only), owner/crowd "best time to go," **real-time ephemeral truck/specials layer**, light quality-weighted gamification (no streak guilt-loops), video-forward cards + "saves" as intent metric, inspection-score history/alerts, Infatuation-style **"Perfect For" occasion tags**, collaborative invite-to-edit lists + QR-followable lists for local orgs.

---

## 7) Recommended Architecture — the key decision, stated plainly

**Decision: adopt Option C — move the app to the web1 Docker host as a Node-runtime Next.js 16 app (SSR + ISR) backed by its own isolated self-hosted Supabase project (Postgres + PostGIS + Auth + Storage + edge functions), fronted by Cloudflare. Keep the web2 cPanel static export only as a fallback/redirect target during cutover.**

**Why C over the alternatives:**
- The moment you accept **user writes + a composite rating computed from changing data, you need a database and a server-side write path.** That changes the system class away from a pure static artifact.
- **Option A (static + Cloudflare Workers + D1):** cheapest to start but splits the system across two homes, introduces a non-Postgres DB outside the fleet's restic/OpenBao backup story, and the "fresh data must be prerendered for SEO" tension worsens as the catalog grows. Good stepping stone, awkward destination.
- **Option B (cPanel Passenger SSR):** operationally the worst fit — Passenger is fragile for modern Next, forces MySQL (no `tsvector`/PostGIS), and puts a stateful app on the box designated for static/PHP. Avoid.
- **Option C** is the only option where every vision feature lands on infrastructure the fleet **already operates, backs up, and secures**: Postgres + RLS for moderated writes, materialized views / `pg_cron` for the composite, **PostGIS for "near me,"** `tsvector`/`pg_trgm` for search, ISR for fresh-but-prerendered detail pages (best-case SEO with correctly-scoped `LocalBusiness`/`Review`/`Menu` JSON-LD + DB-driven sitemap), Supabase Storage for self-hosted images. **No new technology — web1 already runs this exact stack; only a new isolated instance.** ~$0 incremental compute cost (other recurring costs are covered by the §1 sustainability model).
- **Isolation:** keep it a *separate* Supabase project/Postgres (not shared with babybloom/cpa stacks), its own schema/AppRole/transit key via the `tenant-openbao-setup.sh` pattern — consistent with the fleet's per-tenant custody model and repeatable for sibling town guides later.

**Staging + migration discipline (before cutover).** Because this adds blast radius to a shared box, ship a **separate staging Supabase project, versioned migrations (tooling, not hand-applied SQL), and a written rollback runbook**. No schema change touches the live box without passing staging.

**Performance budgets (engineered, not hoped).** Map-with-all-pins, photo galleries, and live-at-view TTFB threaten Core Web Vitals. Set explicit **CWV/INP budgets**; ship **pin clustering, an AVIF/WebP self-hosted image pipeline with responsive sizes + lazy-load**, and ensure live Google fetches never block initial render (skeleton + hydrate, with the bot/budget rules from §3).

**Cost/abuse controls at the edge.** The Google Places budget cap, bot-vs-human gating, and the pipeline freshness heartbeat (§3) are part of the architecture, not afterthoughts — Cloudflare bot management fronts the live-fetch path so crawlers never burn paid API calls.

**Known fleet gotchas to honor:** use apex `leanderlocalguide.com` + `www` and provision an **explicit Cloudflare cert** for any `api.`/multi-label subdomain (Universal SSL covers only one label); **restart the edge-functions container after deploys** (per-isolate module cache); confirm web1 headroom via the capacity-snapshot playbook (blast radius rises).

---

## 8) Competitive Insights — steal / avoid / missing-that-we-add

**Steal (best UI primitives):**
- Faceted filters + "Open now" (most-used feature everywhere; cheap over static JSON).
- Yelp-grade **rich structured attribute taxonomy** (your data moat).
- TripAdvisor **multi-dimensional sub-ratings** (food/service/value/atmosphere) feeding a transparent composite.
- Infatuation's **single decisive 0–10 house score** + **"Perfect For" occasion tags**.
- Eater's **map/heatmap as a unit** + openings/closings as freshness.
- Time Out's **two-part "We say / What's good"** review + food+events on one surface.
- Michelin's **tiered badge system** (distinction vs. attribute).
- HappyCow's **community-freshness loop** ("report closed") + **color-coded category pins** — *which we ship with icon+label encoding and abuse controls, fixing HappyCow's own accessibility and gaming gaps.*
- **Owner-response + business-claim flow** (Google/Yelp/TripAdvisor all have it) — the single biggest source of owner goodwill; we add labeled responses + a verified claim + a correction SLA.
- BringFido's proof that **deep specific facets** (dog-friendly) anchor a product.
- Foursquare/OpenTable **short tips + sentiment auto-tags** (first-party only, in our case); Beli's **comparison-derived score**; Google Lists' **followable/shareable lists**.
- Street Food Finder's **time-aware food-truck model** ("here today").
- Reddit/Nextdoor **blunt local candor + verified-resident credibility**.

**Avoid (dark patterns):** opaque review filtering (Yelp's #1 sin); pay-to-play ranking / ad injection; review-gating solicitation; app-install / login walls to *read*; naive single-average ratings; fake/incentivized reviews with no provenance; stale facts with no correction path; over-gamification (hollow Swarm-style spam); PII/privacy creep (no contact-syncing, no precise live location — and now backed by a real TDPSA-compliant retention schedule); generic voiceless content; cluttered ad-dense detail pages; booking-hostage UX; manufactured urgency ("booked 47× today"); **and — our own discipline — republishing other platforms' star ratings as ours or marking them up as our `AggregateRating`.**

**Missing-that-we-add (the differentiators no incumbent has):** county **health score + inspection history** as a dated, sourced, correctable badge; the **disclosed house persona**; **open/closed/verified-on-date** as a visible honest field *backed by a freshness mechanism that actually holds*; a proper **food-truck time-aware model**; a **published, decomposable, rights-clean scoring formula**; a **suburb-comprehensive "Essential Leander" canon**; a **verified-local reviewer badge**; **bilingual EN/ES** coverage on an open, accessible, link-out-friendly web.

---

## 9) Phased Roadmap — milestones & rough effort

**Phase 0 — Keep shipping (ongoing, ~0):** leave the static cPanel site live; no downtime pressure.

**Phase 1 — Data model + schema migration + compliance scaffolding (~2 wks):** implement the `Restaurant` type + `deriveBadges()` + composite scaffolding (rights-clean pillars only); migrate the 35 seed records off `tags[]` into typed `attributes`/`locality`/`status`; stand up the **isolated web1 Supabase project + a separate staging project + versioned migrations + rollback runbook** (schema, RLS, OpenBao AppRole/transit key); tables: `restaurants`, taxonomy, `reviews`, `owner_responses`, `submissions`, `score_snapshots`, `moderation_log`; `composite_rating` view; draft the **privacy notice, retention schedule, DMCA-agent registration, and EN/ES content scaffolding** now (they gate Phase 4). **Milestone:** clean structured dataset + DB + compliance skeleton; static site still served from build export.

**Phase 2 — MVP static directory on the new model (~2–3 wks):** upgraded ListingCard/detail page (a11y-AA, icon+label badges, dated/sourced health score), faceted filtering with index-bloat guardrails, map w/ category pins + clustering, curated collections/leaderboards, correctly-scoped `Review`/`Article` JSON-LD + sitemap, house-persona reviews for the seed set, `/how-we-rate` + persona About/disclosure pages (EN/ES), AVIF/WebP image pipeline. **Milestone:** the best *read* about Leander food, fully static, SEO-clean, accessible, bilingual.

**Phase 3 — Containerize Next 16 on web1 (SSR/ISR) + cutover (~1–2 wks):** Cloudflare in front (apex + explicit cert + bot gating for the live-fetch path), OpenBao secrets, Kuma/Grafana monitors **plus the pipeline freshness heartbeat**, restic + fleet-snapshot backups, Ansible drift, CWV budgets enforced. Cut DNS from web2. **Milestone:** dynamic-capable origin live, web2 as fallback.

**Phase 4 — Write paths / community (v1) (~3–4 wks):** user reviews + sub-ratings + tips, Turnstile + trust-scored moderation queue + burst detection, Supabase Storage uploads **gated by rights-attestation + license grant**, **owner-response + verified-claim flow**, abuse-resistant "report closed/suggest a spot," composite recompute (pg_cron/on-approve), transparent breakdown UI with text equivalent. **Gate: privacy notice + DSAR + DMCA agent + retention schedule must be LIVE before public writes.** **Milestone:** living guide with trustworthy UGC and a compliant data-protection layer.

**Phase 5 — Comprehensiveness + content engine (~4–6 wks, then steady-state):** full ingest pipeline (permits + FSQ + crosswalk dedup + source adapters + contract tests), LLM writer + anti-fabrication/defamation lints, editor approval UI, cadence cron + freshness dashboard. **Milestone:** exhaustive, always-fresh roster of all ~120–180 Leander spots.

**Steady-state labor (modeled, not hidden).** Phase 5 does not end the work — ~180 reviews, re-drafts on change, the moderation queue, rotation-based monthly confirmations, and owner disputes are a **perpetual weekly load on one operator**. The roadmap therefore includes defining a **trusted-contributor / volunteer-editor path** (quality-gated) *before* the load becomes unmaintainable, plus an honest weekly-hours estimate so the owner can decide funding/help against the §1 sustainability model.

**Success metrics (so we know it's working).** A small measurement spec tied to the three promises: **coverage %** (listed vs. permit roster) for *comprehensive*; **freshness SLA hit-rate** + median listing age-since-confirmed for *always-fresh*; **UGC trust ratio** (approved vs. quarantined) + organic/AI-citation traffic for *opinionated & transparent*. Reviewed monthly.

**Later (continuous):** Beli comparison ranking, ephemeral truck layer, gamification, video cards, occasion tags, collaborative lists.

---

## 10) Open Decisions for the Owner

1. **Geofence:** city-limits-strict (~120–180) as default with a labeled "Greater Leander" tier — confirm? (Affects roster size, scraping cost, brand promise.)
2. **Persona name + byline:** pick/own/trademark the house critic name; I recommend a clearly-fictional named correspondent over an abstract title. Approve the bilingual site-wide disclosure wording.
3. **AI-assist disclosure posture:** confirm the standing "AI-assisted, human-edited, opinion" banner on every review (recommended — covers both legal and the honesty mandate).
4. **Cutover timing & web1 capacity:** approve moving the app onto web1 (blast radius rises); run the capacity-snapshot first; confirm the staging-project + versioned-migration discipline. Keep web2 as fallback for how long?
5. **Health-score display rules (now, not later):** confirm publishing county inspection scores **with date + source link + correction SLA** as specified — this is a strong differentiator but must ship with its liability guardrails in MVP, not deferred.
6. **Chains:** list-and-badge them (sorted down) or exclude entirely? The anti-chain brand can go either way; listing-but-badging is more comprehensive.
7. **Photos & rights:** budget for first-party photography / owner-submission **license terms + rights-attestation flow + DMCA agent**, since Google imagery can't be persisted. Who shoots the hero images for the canon?
8. **Composite design sign-off:** approve the **rights-clean pillar set** (first-party Users + Editorial + permit/Health + first-party Sentiment; **Google display-only, never stored**), launch weights, and decay half-life (540d) as tunable defaults. This is the call that keeps us on the right side of Google ToS.
9. **OSM/Overture posture:** approve option (a) — **keep OSM out of the stored DB, rely on permissive FSQ + first-party** — vs. (b) accept ODbL share-alike with per-field attribution. Recommendation: (a).
10. **Google Places spend cap:** set the hard monthly ceiling + confirm the bot-gated, human-navigation-only live-fetch design with "last known" graceful degradation.
11. **Sustainability / revenue:** choose the non-corrupting model (labeled affiliate deep-links, ranking-neutral premium owner tools, walled sponsorship) **or** commit an owner-funded runway with a cost ceiling. The guide has no economic engine without this decision.
12. **Privacy & DSAR ownership:** approve the TDPSA privacy notice, retention schedule (incl. fraud IP/ASN window), and DSAR workflow owner — these gate the public write path (Phase 4).
13. **Spanish track scope:** confirm EN/ES for canon + key pages at launch (recommended) vs. a narrower/later rollout.
14. **Committee review:** per your standing preference, do you want the architecture cutover (Phase 3), the legal/persona disclosure + privacy/DMCA layer (Phase 4 publish), and the Google/OSM data-rights posture (decisions 8–10) run past the expert sub-agent "committee" before commit?

---

**Files referenced (absolute):** `/home/projects/leander-local-guide/data/listings.ts` (current `Listing` + 35 seed records), `/home/projects/leander-local-guide/components/ListingCard.tsx` (`isOpenNow`, icon switch, rating/address/hours render), `/home/projects/leander-local-guide/components/Tag.tsx` (badge style map to extend). Proposed new data locations: `data/rating_weights.ts`; web1 Supabase LLG schema (`reviews`, `owner_responses`, `accounts`, `trust_scores`, `moderation_log`, `score_snapshots`, `dsar_requests`) + edge functions (`submit-review`, `recompute-score`, `burst-detector`, `live-places-fetch` [budget-gated], `freshness-heartbeat`) + source-adapter module with contract tests.

---

# Appendix: Adversarial Gap Review (what the critic caught)

# Ruthless Gap Review — Leander Local Guide Plan

## P0 — Legal/existential or will-break-at-launch

1. **Google Places ToS vs. your stored composite.** The plan feeds Google rating *numbers* (P=45%) into a persisted `composite` + `score_snapshots`. Google's terms prohibit storing/caching Places content (other than `place_id`) and prohibit using Places data to build/feed a competing/aggregated rating product. A stored, recomputed composite derived from Google ratings is exactly that. **Fix:** exclude Google-derived ratings from any *stored* value; compute the P pillar at request-time from a live pull and never snapshot it, OR drop Google from the composite entirely and base the stored score on first-party + permit + FSQ signal only. Make `compositeMethod` reflect which.

2. **Sentiment pillar has no legal corpus.** "NLP over aggregated public review text" (S=15%) requires obtaining and processing third-party review prose. Places API returns ~5 reviews and restricts derived analysis; Yelp is dropped; you have no licensed source. You can't generate "sentiment themes" from text you're not allowed to acquire/process. **Fix:** define S as running *only* over first-party user reviews + permit narratives, or cut S until UGC volume exists; remove the implied scraping of incumbent review text.

3. **OSM license is mis-stated.** Plan says FSQ Apache-2.0 + "OSM/Overture … store, dedup, redistribute freely." OSM is **ODbL** (attribution + share-alike on derived databases); Overture has its own attribution terms. "Freely" is wrong and creates a share-alike obligation on your whole dataset if OSM data is co-mingled. **Fix:** isolate OSM-sourced fields, attribute per ODbL, and decide whether share-alike is acceptable — or drop OSM and rely on FSQ (permissive) + first-party.

4. **AggregateRating JSON-LD on businesses you don't own = Google review-snippet violation.** Google's structured-data policy forbids marking up third-party-entity reviews you host/author as the business's `AggregateRating` (self-serving/third-party rule); this risks a manual action. The plan ships `Restaurant` + `AggregateRating` JSON-LD in MVP. **Fix:** mark up your content as `Review`/`Article` authored by your org, not `AggregateRating` on the `Restaurant` entity; reserve `AggregateRating` for your own first-party user reviews only, clearly scoped.

5. **No privacy/data-protection layer — Texas TDPSA now applies.** You collect emails, OAuth identity, IPs, ASN, EXIF, photos, behavioral signals (the fraud system *requires* IP/ASN retention). Texas Data Privacy & Security Act (in force 2024) triggers obligations: privacy notice, purpose/retention limits, DSAR/opt-out path, consent. Plan has none. **Fix:** privacy policy + retention schedule (esp. IP/ASN for fraud), DSAR workflow, consent for any tracking, document in About.

6. **No DMCA agent / photo-rights model for UGC + owner submissions.** User and owner photo uploads carry copyright and §230/DMCA exposure. EXIF-stripping is not rights clearance. **Fix:** register a DMCA agent, add an upload rights-attestation checkbox + license grant, repeat-infringer policy, and a UGC content ToS.

## P1 — Significant gaps

7. **Owner-response feature is missing — every incumbent has it.** "Claim this listing" exists but owners can't reply to a review or your house take. This is the single biggest source of owner goodwill and the standard expectation. **Fix:** add labeled owner-response (post-claim) and a documented factual-correction/dispute SLA for reviews and health scores.

8. **Claim-listing identity verification is unspecified = hijack risk.** "Never buys ranking" is stated, but not *how* you prove ownership. **Fix:** verify via business-line callback/SMS, postcard code, email-domain match, or Google Business cross-check before granting claim.

9. **"Report closed" is a competitor weapon + collides with quarterly permits.** Permits refresh quarterly, so a malicious "closed" report could mis-flag a live business for up to a quarter. **Fix:** never auto-close; require N independent reports + a live open-status cross-check + human verify; rate-limit per account/IP.

10. **Freshness promise vs. cadence math doesn't hold.** "Always-fresh / verified-on-date" is a core promise, but permits are quarterly, liveness monthly, and `lastConfirmed` is a manual act across 120–180 spots with one operator. Closures and menu changes will be stale for weeks. **Fix:** lean closure detection on live Google open-status + crowd reports (not permits); set a realistic per-spot confirmation rotation; show honest "as of" dates and degrade confidence automatically with age.

11. **Google Places "live at view" cost is unbounded and contradicts caching.** ISR pages hit by crawlers/bots + real users will fan out Places calls; "stay in free SKU" is asserted, not engineered. You also *can't* cache the live fields (per ToS), so cost scales with traffic. **Fix:** fetch live fields only on genuine human navigation (not bot/prerender), hard monthly budget + alerting + graceful "last known" fallback, and minimize the live field set.

12. **Accessibility is entirely absent.** Color-coded badges and category pins encode meaning by color alone (color-blind fail), the score donut needs a text equivalent, map needs keyboard nav. No WCAG target. **Fix:** commit to WCAG 2.2 AA; non-color encoding (icon+label) on badges/pins, ARIA + text breakdown for the score donut, keyboard-navigable map, enforced alt text on photos.

13. **No monetization / sustainability model.** "No ads, no pay-to-play" is stated, but there is zero revenue or funding/runway line for ongoing LLM, Places, photography, and editorial labor. The whole thing has no economic engine. **Fix:** define a non-corrupting model (labeled affiliate order/deep-links, premium owner tools that don't touch ranking, sponsorship clearly walled) OR an explicit owner-funded runway decision with a cost ceiling.

14. **Spanish-language track missing.** Central TX / Leander has a large Spanish-speaking base and the brand explicitly romanticizes immigrant kitchens — yet no i18n. This is simultaneously an audience, SEO, and accessibility miss. **Fix:** Spanish content/UI track (at least for canon + key pages), `hreflang`.

15. **Faceted-filter + collection pages = index bloat / thin-content risk.** URL-encoded shareable facet combinations and many auto-collections can spawn thousands of thin/duplicate pages and waste crawl budget. **Fix:** canonical rules, selectively indexable facets, `noindex` on thin/combinatorial pages, minimum-content threshold before a collection is indexable.

16. **Pipeline-staleness has no dead-man's-switch.** If permit/FSQ ingest silently breaks, the "always-fresh" data rots invisibly. Plan monitors uptime (Kuma) but not data freshness. **Fix:** freshness/heartbeat monitor per source (alert if last successful ingest > cadence), and a visible internal staleness dashboard.

## P2 — Should-fix

17. **Bus factor / steady-state labor underestimated.** "Phase 5: ~4–6 wks then steady-state" hides perpetual cost: ~180 reviews, re-drafts on change, moderation queue, monthly confirmations, owner disputes — all one person. **Fix:** model ongoing weekly hours; define a trusted-contributor/editor path before it becomes unmaintainable.

18. **No staging/migration discipline for the new Supabase on web1.** Blast radius is acknowledged but there's no staging env, migration tooling, or rollback plan for schema changes on the shared box. **Fix:** separate staging project + versioned migrations + rollback runbook before cutover.

19. **Performance budgets undefined.** Map-with-all-pins, photo galleries, and live-at-view TTFB threaten LCP/INP. **Fix:** set CWV/INP budgets, pin clustering, AVIF/WebP self-hosted image pipeline with responsive sizes + lazy-load.

20. **Health-score liability/recency rules undecided (open item #5) but shipped in MVP detail page.** Publishing stale or mis-attributed inspection scores invites defamation/owner action. **Fix:** show inspection date + source link, refresh SLA, and a fast correction path *before* it goes live, not as a later decision.

21. **Data-source deprecation/abstraction.** Google "Places (New)" itself signals churning APIs; FSQ/Overture schemas shift. No adapter layer. **Fix:** thin source-adapter interface + contract tests so a provider change doesn't break the pipeline.

22. **No success metrics/KPIs.** Nothing defines whether the guide is working (coverage %, freshness SLA hit-rate, UGC trust ratio, organic traffic). **Fix:** add a small measurement spec tied to the three promises.

**Net:** the architecture and editorial/legal-persona reasoning are strong; the existential risks are concentrated in (a) Google/OSM data-rights handling feeding a stored composite + AggregateRating markup, (b) absent privacy/UGC-copyright compliance, and (c) the missing owner-response/claim-verification and revenue/sustainability layers. Address P0 1–6 before any public publish.