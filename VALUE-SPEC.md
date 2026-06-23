# The Leander Local Guide — Interactive / Community / Value Layer Spec

*Lead product architect synthesis of the 6-panel review. One plan, conflicts resolved, build-ready against Next (server) + Postgres/PostGIS (llg-db) + self-hosted Supabase (Auth/Storage) on web1 + Cloudflare Turnstile + mailcow.*

---

## 1. The value thesis

The site feels worthless because **it repackages the worst 80% of Google Maps and advertises the gap with empty review slots.** Category, hours, price, rating, photos, Maps link — a local gets all of that from Google in one tap, with more reviews and live traffic. You rebuilt the commodity layer and left the one thing Google *can't* do — **local truth and a named local voice** — blank. The fix is not "add a reviews feature." It is to ship, simultaneously, the two things a single-town guide can do that a national directory structurally cannot: (a) a **content nucleus you own** — Anthony's blunt real take on the top ~30 spots, plus local-only structured facts (patio / late / kid-friendly / cash-only / best dish) Google buries — and (b) **owned, zero-friction social proof** — a one-tap, anonymous, on-brand "verdict" and "been here" signal that makes every card visibly alive, plus a dated "what's new" feed so the page has a heartbeat. Accounts, photos, and long-form user reviews come *after* there's content and traffic worth contributing to — building them first just manufactures moderation, DMCA, and cold-start cost on an empty room.

**The contribution ladder (the spine of every decision below):** each rung costs more and earns more identity. Tap (anonymous) → Tip (light auth) → Save/List (account) → Photo (account + rights) → Full review (graduated). Never block rung 1. Convert with momentum, never a wall.

---

## 2. The interactive feature set

Notation: **S** ≈ 1–2 days, **M** ≈ 3–5 days, **L** ≈ 1–2 weeks. All write actions are Turnstile-gated. All UGC obeys the **five-before-launch rule** (§5): ToS license grant, report button, soft-delete, audit row, rate limit.

### 2.1 Verdict + "Been here / Want to go" taps — *the unlock, anonymous*
**What it does:** Kills the dead 5-star widget. One tap = social proof. Two mechanics share one table:
- **Verdict stamp:** `WORTH IT / IT'S FINE / SKIP IT` — three rubber-stamp buttons. Aggregate renders as a smudged stamp: "47 LOCALS SAY WORTH IT." This is the lightweight rating; full stars are deferred (§2.7) because empty star widgets are exactly what makes the site feel dead, and everyone clusters at 4 anyway.
- **Been here / Want to go:** two counters per place ("142 locals been here · 38 want to go").

**MVP:** All four actions work **without an account**, deduped by an anonymous cookie ID + Turnstile token; reconciled to `user_id` on later sign-in. After 3 taps, soft prompt: "Want your taps saved? Sign in."

**Data model:**
```sql
place_signals (
  id          bigserial pk,
  place_id    int  references places(id),
  signal_type text check (signal_type in ('verdict','been_here','want_to_go')),
  verdict     text check (verdict in ('worth_it','its_fine','skip_it')), -- null unless type=verdict
  anon_id     uuid,            -- cookie device id, null once claimed
  user_id     uuid references auth.users(id), -- null while anonymous
  ip_hash     text,            -- forensics / loose dedup
  created_at  timestamptz default now(),
  unique (place_id, signal_type, coalesce(user_id::text, anon_id::text))
);
-- denormalized counters on places for fast card render:
ALTER TABLE places ADD COLUMN worth_it_ct int default 0, its_fine_ct int default 0,
  skip_it_ct int default 0, been_here_ct int default 0, want_to_go_ct int default 0;
```
Update counters in the same server action (transactional) so cards never N+1.

**UX (newsprint):** Thumb-reachable stamp bar pinned under each card on mobile. Stamp "thunks" on at ~180ms with slight rotation + ink-bleed, optimistic, rolls back silently on failure. Counts shown everywhere — visible numbers are the single biggest driver of more contribution.

**Auth/mod/rights:** Anonymous OK (lowest blast radius). Turnstile required. No moderation queue needed (no free text). Brigade guard: hold/discount signals from `ip_hash` clusters or accounts <7 days when a place spikes. **Effort: S–M.**

### 2.2 Quick Tips ("what to order") — *the killer middle rung, fills the exact "no info" gap*
**What it does:** One text box — "What should someone order here?" 200 chars. NOT a star form. This is the highest value-per-effort UGC because it's literally the missing info the owner named.

**MVP:** Light auth (Supabase magic-link) + Turnstile. Renders as a stacked column of typewriter "classified ad" blurbs with a hand-set byline ("— Marcos R., regular"), placed **above** any empty review slot so the page is never barren.

**Data model:**
```sql
tips (
  id           bigserial pk,
  place_id     int references places(id),
  user_id      uuid references auth.users(id),
  body         text check (char_length(body) <= 200),
  status       text default 'pending' check (status in ('pending','approved','hidden','removed')),
  helpful_ct   int default 0,
  ip_hash      text, user_agent text,
  created_at   timestamptz default now(),
  updated_at   timestamptz
);
```
**Auth/mod/rights:** Logged-in + Turnstile + email-verified. `status='pending'` for first-time posters; **auto-approve after N (=3) approved tips** (trust tier). Link/URL filter: block URLs from accounts <7 days (kills ~90% of spam). Report button feeds `moderation_queue`. **Effort: M (the moderation is the work).**

### 2.3 "Helpful" upvotes — *cheap engagement multiplier + moderation signal*
**What it does:** Thumb-up on tips (and later reviews/photos). Drives sort order; high-helpful items float, low/negative items surface for review.

**Data model (polymorphic, reused everywhere):**
```sql
helpful_votes (
  target_type text check (target_type in ('tip','review','photo')),
  target_id   bigint,
  user_id     uuid references auth.users(id),
  created_at  timestamptz default now(),
  primary key (target_type, target_id, user_id)
);
```
**Auth/mod:** Logged-in only (no anonymous — brigade machine). Unique constraint = the dedup, in Postgres not app logic. **Effort: S, build alongside Tips.**

### 2.4 Saves / "My Leander" lists — *retention keystone*
**What it does:** A bookmark (clipped-newspaper-corner animation) on every card → personal "clippings" page. Converts browsers into account-holders and gives every later feature a home. Lists ("Date Night," "Best Tacos," "Open Late") are the content engine *and* viral vector — public by default with clean shareable URLs.

**Data model:**
```sql
saves (user_id uuid, place_id int, created_at timestamptz default now(),
       primary key (user_id, place_id));

lists (id bigserial pk, user_id uuid, title text, slug text unique,
       is_public bool default true, created_at timestamptz default now());
list_items (list_id bigint references lists(id), place_id int,
            position int, primary key (list_id, place_id));
```
**MVP split:** plain Saves + "My Spots" page ships in **Next**; named public Lists with OG tags is a **Next/Later** follow-on.
**UX:** Optimistic heart toggle; `/list/[slug]` server-rendered with dynamic OG. **Auth:** logged-in. **Effort:** Saves S, Lists M.

### 2.5 Photo uploads — *real plates beat corporate stock; highest liability, gate hardest*
**What it does:** Locals drop phone shots into a horizontal **photo strip** (torn-edge polaroid frames) above the editorial review. User photos visibly outrank Google-proxy photos — the "real, by-and-for-Leander" feeling.

**MVP flow:** tap camera → client-side downscale → blurhash placeholder → signed upload URL (server action) → Supabase Storage → optimistic "developing…" shimmer. **EXIF/GPS stripped on ingest** (sharp in a Next route — privacy + DMCA). Cap 3/user/place.

**Data model:**
```sql
photos (
  id            bigserial pk,
  place_id      int references places(id),
  user_id       uuid references auth.users(id),
  storage_key   text,           -- supabase object path
  caption       text,
  status        text default 'pending' check (status in ('pending','approved','hidden','removed')),
  rights_ack    bool not null,  -- "I took this / have rights" checkbox
  rights_ack_at timestamptz,
  helpful_ct    int default 0,
  created_at    timestamptz default now()
);
```
**Auth/mod/rights:** Logged-in + Turnstile + **explicit rights checkbox logged with timestamp** (safe-harbor footing). **Pre-publish hold for first ~20 uploads/new user**, then auto-publish with post-hoc review (trust tier). No raw deletes — soft-delete only. Requires the registered DMCA agent (§5). Empty state: dashed frame "No local photos yet — be the first to show the plate." **Effort: M.**

### 2.6 Full star rating + guided review — *graduate action, deliberately NOT first*
**What it does:** The heavy rung. A guided composer (three prompts — *The dish / The vibe / The verdict*) assembles a Bourdain-lite blurb, rendered in a "Letters to the Editor" column beside Anthony's piece (his = masthead serif; theirs = typewriter), clearly demarcated so the editorial voice is protected.

**Data model:**
```sql
reviews (
  id         bigserial pk,
  place_id   int references places(id),
  user_id    uuid references auth.users(id),
  stars      int check (stars between 1 and 5),
  body       text,
  status     text default 'pending' check (status in ('pending','approved','hidden','removed')),
  helpful_ct int default 0,
  created_at timestamptz default now(),
  unique (place_id, user_id)   -- one per user per place, editable
);
```
**Display rule:** show the **community average distinct from the display-only Google rating**, clearly labeled; suppress the numeric community average until **≥5 ratings from accounts >7 days old** (velocity weighting — one fake 5-star can't define a spot). Prompt only users who've already left tips/photos. **Owner-conflict guard:** a `claimed_by_owner` account is barred from rating/reviewing its own place. **Effort: M, Later.**

### 2.7 Beli-style head-to-head ranking + leaderboards — *return-visit dopamine, Later v2*
"Which is better, A or B?" pairwise prompt → Elo-ish town leaderboard ("Leander's Best Tacos — voted by locals," refreshed weekly by cron). Inherently shareable and argument-starting. `head_to_head (user_id, place_a, place_b, winner, created_at)` + a materialized ranking. **Effort: M, Later** — only after taps/tips flow.

### 2.8 Follow-a-spot + email notify — *re-engagement trigger, Later*
Reuse `saves` semantics as follows; daily/weekly digest cron over mailcow: "your tip got 10 helpfuls," "a place you follow changed hours / got reviewed / closed." No push infra. **Effort: S–M on top of saves, Later.**

### 2.9 Owner-claim / response — *trust + future revenue, Later*
Per existing PLAN.md. High trust value; build after tips. Sets the `claimed_by_owner` flag that powers the owner-conflict guard (§2.6).

---

## 3. Richness fixes — so no page feels empty

The place page is re-architected top-to-bottom so the data you *already have* + Anthony + community fills every fold:

1. **Masthead block (existing data, reframed):** name, category, cuisines, price, hours with a live **"OPEN NOW"** computed badge (free utility off existing hours data — a daily return reason), chain-vs-local flag as a "LOCAL" stamp, Google rating clearly labeled *"Google: 4.3"* (display-only) sitting next to the owned community verdict so they're never confused.
2. **Anthony's review (the trust nucleus):** verdict + "what to order" + "skip this" + a pull-quote, rendered server-side from the editorial table (§6). For unwritten places, an honest host prompt: *"Anthony hasn't been here yet — tell us what's good,"* which doubles as the tip CTA. This turns the empty state into a contribution funnel instead of a void.
3. **Local-only structured fields + filters (owned value Google buries):** patio · takes reservations · kid-friendly · actually-open-late · cash-only · best dish · good for (date night / work lunch / solo / groups). Schema + filter UI; SEO gold ("best patio in Leander"). 
```sql
ALTER TABLE places ADD COLUMN patio bool, reservations bool, kid_friendly bool,
  open_late bool, cash_only bool, best_dish text, good_for text[];
```
4. **"Locals Say…" tips column** above any review slot — page is never barren even before Anthony writes.
5. **Photo strip** — real local shots above the proxy photos.
6. **Verdict / been-here counts** rendered prominently — proof others are here.
7. **No more empty slots:** delete the literal empty review placeholders. Replace with the tip composer + Anthony-prompt so absence reads as *invitation*, not *neglect*.

---

## 4. The "MVP of value" — smallest set that stops it feeling worthless

The resolved conflict between the community/designer panel ("anonymous taps + tips first") and the skeptic/domain panel ("Anthony content + structured data first") is: **ship both halves together in NOW**, because each cures a different failure — the skeptic is right that empty UGC looks as dead as empty review slots (need a content nucleus), and the designer is right that one-tap social proof is what makes cards feel alive this weekend (need owned signal). Neither alone fixes "worthless." Critically, **everything in NOW requires no accounts and no heavy moderation**, so it ships fast and safe.

### NOW (the "stop feeling worthless" release) — ~1.5–2 weeks
1. **Anthony admin + real reviews on top 30** — the actual product/trust layer (§6). *M*
2. **Verdict stamp + been-here/want-to-go taps** — anonymous, Turnstile, optimistic, counts everywhere (§2.1). *S–M*
3. **Local-only structured fields + filters + OPEN NOW** (§3.3, §3.1). *S–M*
4. **"What's New in Leander / FRESH INK" feed** — dated homepage rail (openings, closings, menu changes, Anthony's latest, latest verdicts). Changes the mental model from *reference* to *publication*. *S*
   ```sql
   feed_events (id bigserial pk, place_id int, event_type text
     check (event_type in ('opened','closed','menu_changed','reviewed','new_tips')),
     summary text, occurs_at timestamptz default now());
   ```
   (Add `opened_at` / `closed_at` / `status` columns to places to drive openings/closings.)

### NEXT — ~2 weeks
5. **Magic-link auth + Saves/"My Spots"** — keystone that turns visitors into accounts (§2.4). *S–M*
6. **Quick Tips + helpful votes + the moderation queue spine** (§2.2, §2.3, §5). *M*
7. **Dynamic OG images** on every place & list via Next `ImageResponse`/Satori, newsprint-styled — near-free viral distribution into Leander Facebook/Nextdoor groups (§ growth). *S*
8. **Public Lists** with shareable URLs (§2.4). *M*

### LATER — gated on traffic + content existing
9. **Photo uploads** (Supabase Storage, EXIF strip, rights checkbox, pre-publish hold, registered DMCA agent) (§2.5). *M*
10. **Full guided reviews + community average** with velocity weighting (§2.6). *M*
11. **Head-to-head ranking / leaderboards** (§2.7). *M*
12. **Follow + email digests** (§2.8). *S–M*
13. **Owner-claim / response portal** (§2.9). *M*

**Don't-bother-yet (explicit):** user photos, threaded comments, full user star ratings, profiles, owner portal — all premature until NOW + NEXT have shipped and there's an audience. UGC without a content nucleus is an empty room with a microphone.

---

## 5. Auth & moderation foundation (minimum-safe for a solo operator)

**Auth — friction calibrated to blast radius:**
- **Supabase Auth, magic-link / OAuth, no passwords.** Already on web1.
- **Anonymous-first, account-later:** taps (verdict/been-here) need NO account — cookie `anon_id` + Turnstile, reconciled on sign-in. Everything that writes free text or files (tips, photos, reviews, lists) requires login + email-verified + Turnstile.
- **Turnstile on every write**, including anonymous taps.
- Store `ip_hash`, `user_agent`, `created_at` on text/photo UGC for forensics.

**The moderation queue — one table, one page, one human:**
```sql
moderation_queue (
  id          bigserial pk,
  target_type text,   -- 'tip','photo','review','signal'
  target_id   bigint,
  reason      text,   -- 'reported','brigade_flag','new_user_hold','link_filter'
  reporter_id uuid,   -- null for system flags
  status      text default 'open' check (status in ('open','approved','removed','dismissed')),
  created_at  timestamptz default now(),
  resolved_at timestamptz, resolved_by uuid
);
audit_log (id bigserial pk, actor uuid, action text, target_type text,
           target_id bigint, meta jsonb, created_at timestamptz default now());
```
- **`/admin/queue`** behind Anthony's login. Actions: approve / remove (soft-delete → `status='removed'`) / ban-user. Every report button, every held photo, every brigade flag lands here.
- **Report button on every UGC item** feeds it.
- **Minimum-safe anti-abuse:** Postgres rate limits (N actions/user/hour, N/place/day); brigade detection (≥X ratings in a window from accounts <7d or shared `ip_hash` → auto-hold); link/URL filter blocking URLs from new accounts; trust tiers (auto-approve after N approved contributions); owner-conflict guard.
- **Five-before-launch rule, enforced per feature:** ToS UGC license grant + report button + soft-delete + audit row + rate limit. No UGC feature ships without all five.
- **Photo-specific legal (the cheap thing solo operators skip):** register a DMCA designated agent with the Copyright Office (~$6, one-time — without it there is *no* safe harbor), stand up `dmca@` (mailcow), rights checkbox logged with timestamp, takedown flips `status='removed'` + audit row, counter-notice email-manual for now. **Do this before photos go live, not before launch.**

---

## 6. Admin area (what Anthony needs)

A single role (`admin = Anthony`), Supabase-Auth gated, three pages:

1. **`/admin/reviews` — editorial CRUD (the priority; ship in NOW).** Stop hand-editing. Markdown/rich editor writing to:
   ```sql
   editorial_reviews (
     id bigserial pk, place_id int unique references places(id),
     verdict text,            -- WORTH IT / IT'S FINE / SKIP IT
     what_to_order text, skip_this text, pull_quote text, body text,
     status text default 'draft' check (status in ('draft','published')),
     visited bool default false, -- AI-placeholder vs human-visited flag
     published_at timestamptz, updated_at timestamptz default now()
   );
   ```
   Includes the **AI-assisted-placeholder vs human-edited/visited** flag from the brief (transparency: don't claim Anthony ate somewhere he hasn't). Publishing emits a `feed_events('reviewed')` row.
2. **`/admin/queue` — moderation** (§5): the single table/page above; approve/remove/ban; soft-delete + audit on every action.
3. **`/admin/places` — data steward:** edit structured local fields (patio/late/best dish), `status` (open/closed), `opened_at`/`closed_at`, menu links — the owned data that is the moat, plus the source of the "what's new" feed.

Optional NEXT add: a lightweight **`/admin` dashboard** — today's new tips/photos awaiting review, contribution counts, places with zero verdicts (Anthony's "go write these next" worklist).

---

### One-line resolution of the panel's disagreements
- **Rating mechanic:** 3-verdict stamp (anonymous, on-brand) is the *primary* signal NOW; 5-star full reviews are the *graduated* heavy rung LATER — the empty 5-star widget is part of what makes the site feel dead today.
- **Accounts first vs. anonymous first:** anonymous for taps (no audience-killing wall), accounts required only at the tip rung and above — and the content nucleus (Anthony + structured data) ships in the *same* NOW release so contribution boxes never open onto a void.
- **UGC now vs. later:** light/zero-liability interactivity (taps, feed, filters) is NOW; moderation-and-legal-heavy UGC (tips→NEXT, photos/reviews→LATER) is sequenced behind the moderation-queue spine and the DMCA agent, exactly as the T&S and skeptic panels demand.

---

# Appendix — panel (raw)

### a Community / UGC Product Lead
# Community / UGC Layer — Leander Local Guide

The owner is right: facts without people is a phone book. The fix isn't "add reviews" — it's a **contribution ladder** where the first rung costs one tap and each rung earns a little more identity. Tied to this stack (Next server actions + Postgres, Supabase Auth/Storage, Turnstile), here's the loop.

**1. "Been here / Want to go" tap (SHIP FIRST).** The lowest-friction signal possible. One tap on a card, no account required for the first action — write to a `place_signals` table keyed by an anonymous cookie ID + Turnstile token, reconcile to a `user_id` on later sign-in. MV: two counters per place ("142 locals been here"). Data: `place_id, signal_type, anon_id|user_id, created_at`. This instantly makes every card feel alive and gives you a warm-start prompt: after 3 taps, "Want your taps saved? Sign in." Effort: ~1.5 days.

**2. Quick Tips (the killer middle rung).** Not a star-rating form — a single text box: "What should someone order here?" 200 chars, optional one photo. This is the highest-value-per-effort UGC because it's the info the owner says is *missing*. Requires auth (Supabase) + Turnstile + a `tips` table (`place_id, user_id, body, status, helpful_count`). Moderation = `status` enum (pending/approved/hidden) per existing PLAN.md; auto-approve trusted users after N approved tips. Surface tips ABOVE the empty review slots so the page never looks barren. Effort: ~3 days incl. moderation queue.

**3. Photo uploads.** Real local photos beat Google proxy photos for trust. Supabase Storage bucket, signed upload URL from a server action, EXIF/GPS stripped on ingest (privacy + DMCA per PLAN.md), `place_photos` table with `status` for moderation. Gate behind auth. MV: a simple grid under each place, "shot by @name." Effort: ~2.5 days (the strip + moderation is the work).

**4. Star rating + full review.** This is the heaviest rung and, counterintuitively, NOT first — empty 5-star widgets are exactly what makes the site feel dead today. Build it as the "graduate" action: prompt only users who've already left tips/photos. `ratings (place_id, user_id, stars, body)`, one per user per place, editable. Show *community* average distinct from the display-only Google rating so they aren't confused. Effort: ~3 days.

**5. "Helpful" upvotes on tips/reviews.** The cheap engagement multiplier and your moderation signal. `helpful_votes (target_type, target_id, user_id)`, unique constraint, drives sort order. Effort: ~1 day, do it alongside Tips.

**Making it feel rewarding (the part that's usually skipped):**
- **Anonymous-first, account-later.** Never block the first tap. Convert with momentum, not a wall.
- **Contributor identity.** Display name + a "Leander Local" badge after 5 approved contributions. People contribute to be *seen* in their town.
- **Anthony as the host.** When a tip is posted, show "Anthony hasn't been here yet — tell us what's good." Position the community as co-authoring the zine with the persona. That's the emotional hook a generic directory can't copy.
- **Visible counts everywhere.** Numbers prove others are here; this is the single biggest driver of more contribution.

**What we're missing beyond UGC:** saved lists ("My Leander"), a "new this week" / "recently reviewed" feed for return visits, and owner-claim/response (already in PLAN.md — high trust value, build after tips). And email/notify on "your tip got 10 helpfuls" to pull people back.

---

**TOP 3 MUST-BUILD-NOW**
1. **"Been here / Want to go" taps** — anonymous, one-tap, instant proof-of-life on every card. The unlock.
2. **Quick Tips ("what to order")** — auth + Turnstile + moderation; fills the exact "no info" gap the owner named.
3. **Photo uploads** — Supabase Storage, EXIF-stripped, moderated; real local images that out-trust Google's.

====================

### a Growth & Retention strategist
# Growth & Retention Strategy — The Leander Local Guide

**The core problem isn't features, it's reasons.** Right now there's zero reason to return because the site has no *state* about you and no *change* over time. Every visit shows the same 176 static cards. Retention comes from two things: (1) the site remembers you, and (2) the site is alive. Build both.

## The Habit Loop (why a local opens it twice a week)

**Trigger → Action → Reward → Investment.** The trigger is "where do we eat?" — a recurring, high-frequency Leander question. The reward must be *fresh + personal*. The investment (saves, votes, lists) is what makes them come back, because abandoning it has a cost.

**1. Saves / Favorites (the keystone — build first).**
A heart on every card. Logged-in users get a "My Spots" page. This is the single highest-leverage feature: it converts anonymous browsers into account-holders and gives every future feature a home. MVP: Supabase Auth (magic link, no passwords), one `saves(user_id, place_id, created_at)` table, optimistic heart toggle. **~2-3 days.**

**2. "New & Recently Closed" + "What's Changed" feed.**
The antidote to "same cards forever." A dated homepage rail: new openings, closures, new menus, Anthony's latest review. This makes the site feel *current* — the #1 thing a directory lacks. MVP: add `opened_at`/`closed_at`/`status` columns (you likely have data), a server-rendered feed sorted by date. **~1-2 days.** This alone changes the "worthless" verdict.

**3. Personal & shareable Lists.**
"Leander Date Night," "Best Tacos," "Open Late." User-curated, public-by-default, each with a clean URL (`/list/[slug]`). Lists are the *content engine* AND the viral vector — people share their own list to friends/Facebook groups. MVP: `lists` + `list_items` tables, a public list page with OG tags. **~3-4 days.**

**4. Follow-a-Spot + notifications.**
Follow a place → get notified when it changes hours, posts a menu, gets reviewed, or closes. Email only at MVP (you run mailcow; no push infra needed). This is the explicit *re-engagement trigger* that pulls people back without them deciding to. MVP: reuse the saves table as follows, a daily digest cron. **~2 days on top of saves.**

## The Viral Loop (how new users arrive)

**5. OG / share mechanics (do this for EVERYTHING).**
Every place, list, and review needs a beautiful dynamic OG image — newsprint-styled, with the rating, a photo, and "The Leander Local." Use Next's `opengraph-image` (Satori/`ImageResponse`) so a pasted link in a Leander Facebook group renders as a gorgeous card, not a gray box. **This is the cheapest growth you'll ever buy.** **~2 days, compounding forever.**

**6. Power Rankings / Leaderboards.**
"Leander's Top 10 Tacos — voted by locals," updated weekly. Rankings are inherently shareable and argument-starting (engagement gold) and give a *weekly* return reason. MVP: a materialized ranking from the votes table, refreshed by cron. **~2 days** (after voting ships from the ratings committee).

**Stack fit:** all of this is Postgres tables + Supabase Auth + Next server components + one cron + mailcow. Gate all writes behind Turnstile. No new infra.

## TOP 3 MUST-BUILD-NOW

1. **Saves/Favorites + magic-link auth** — the keystone that turns visitors into accounts and unlocks every other feature.
2. **"New & Recently Closed / What's Changed" feed** — kills the "static card dump" problem instantly and makes the site feel alive.
3. **Dynamic OG images on every place & list** — near-free viral distribution through the Leander Facebook/Nextdoor groups where your audience already lives.

====================

### a local-food-guide domain expert
# The Leander Local Guide — Community/Value Layer: What's Missing & What to Build

The owner's gut is correct. Right now this is a **read-only fact sheet wearing a magazine costume.** Every value-add platform in this space earns its return visits on two things the site has zero of: (1) **trust signals generated by real locals**, and (2) **a reason to come back this week.** A static directory of 176 cards has neither. Facts (hours, price, rating) are commodities — Google already owns them. Your moat is *local opinion + local context the big players flatten.*

**What the benchmarks have that you don't:**
- **Yelp / Google Maps** — user reviews, star ratings, photo uploads, "helpful" votes, owner responses, Q&A.
- **Beli** — the killer mechanic: **ranked lists, not 5-star averages.** "Rank these two tacos" beats "rate 1-5" because everyone clusters at 4 stars. Friend-graph + personalized scores.
- **The Infatuation** — *editorial trust* + "perfect for" tagging (date night, kids, late night, solo lunch). You already have Anthony — lean into it hard.
- **Nextdoor** — hyper-local *recency*: "what's new/closed/changed near me." This is what a single-town guide does that nationals do badly — they're stale on Leander.

**Where the big players are weak (your opening):** they're generic, gamed by fake reviews, and oblivious to local truth — which spot has the slow drive-thru, who's actually open during the I-183 construction, the new place that opened last week. A 60,000-person town can have *real human-verified* signal that scales to a city of millions can't.

**The 5 highest-leverage features (tied to Next + Postgres + Supabase Auth/Storage):**

1. **Local accounts + lightweight identity.** Supabase Auth (magic-link/email, no passwords), Turnstile on signup. *MVP:* auth + a `users` table, display name + "Leander resident since." *Effort: S.* This is the unlock — everything below needs it.

2. **Ratings + written reviews + photo upload.** Postgres `reviews` table (user, place, rating, body, created_at); photos to Supabase Storage with a proxy/resize. Show user avg *alongside* Google's, clearly labeled. Moderation queue (status enum) per the existing PLAN.md. *MVP:* submit + display + admin approve. *Effort: M.*

3. **"Helpful" voting + Beli-style head-to-head ranking.** Skip generic stars-only; add **upvotes on reviews** and a simple **"which is better, A or B?"** prompt that builds a town-wide ranked leaderboard ("Leander's Best Tacos"). `votes` table, Elo-ish score job. This is the dopamine + return-visit engine. *MVP:* helpful votes first, head-to-head v2. *Effort: M.*

4. **"Perfect for" tags + saves/lists.** Community-taggable contexts (kid-friendly, patio, late-night, work-lunch, first-date) + personal saved lists ("My Leander Spots"). Filterable. Turns browsing into utility. *MVP:* curated tag set + save button. *Effort: S–M.*

5. **A living "What's New in Leander" feed + comments.** New openings, closings, menu changes, Anthony's latest review — a dated feed on the homepage + threaded comments per place. This is the Nextdoor-killer and the *only* thing that makes the site feel alive weekly. *MVP:* feed table + comments (reuse moderation). *Effort: M.*

Also missing and cheap: an **admin area for Anthony** to publish/edit reviews (stop hand-editing) and **owner-claim/response** (a future revenue + engagement hook).

**TOP 3 MUST-BUILD-NOW:**
1. **Accounts (Supabase Auth + Turnstile)** — nothing else exists without it.
2. **Ratings + reviews + photo upload, with moderation** — the core contribution loop that creates the value the owner says is absent.
3. **A "What's New in Leander" feed + comments** — the recurring reason locals return, and the thing nationals can never do for one town.

====================

### a Trust & Safety / Moderation lead
# Trust & Safety / Moderation: The Interactive Layer for Leander Local Guide

The core T&S decision is **friction calibrated to blast radius**. A vote can be near-frictionless; a public photo with a person's face cannot. Tie auth strength to how much damage a bad actor does with that action.

## Auth model (per action)
- **Votes / "been here" / save-to-list:** logged-in only, but make login painless — Supabase Auth magic-link or Google OAuth. No anonymous votes ever; anonymous voting is a brigade machine. One vote per user per place, enforced by a unique constraint `(user_id, place_id)` in Postgres, not app logic.
- **Comments & ratings:** logged-in + **Turnstile** on submit + account age/email-verified gate. Store `created_at`, `ip_hash`, `user_agent` for forensics.
- **Photo uploads:** logged-in + Turnstile + explicit rights checkbox ("I took this / I have the right to post it") logged with a timestamp. This is your DMCA safe-harbor footing.

## Anti-abuse defenses (minimum viable)
1. **Rate limits in Postgres:** max N actions/user/hour, max N/place/day. A bursting account is your #1 signal.
2. **Brigade detection:** flag places that get >X ratings in a short window from accounts <7 days old or sharing an `ip_hash`. Auto-hold those ratings for review instead of letting them move the average.
3. **Velocity-weighted ratings:** don't show a numeric average until a place has ≥5 ratings from established accounts. Prevents 1 fake 5-star from defining a spot.
4. **Word-list + link filter** on comments (block URLs from new accounts outright — kills 90% of spam cheaply).
5. **Owner-conflict guard:** restaurant owners self-reviewing is the dominant fraud here. A "claimed by owner" flag (from your existing owner-response plan) should *bar* that account from rating/reviewing its own place.

## Photos: the real liability
Photos carry copyright, privacy (faces, kids, license plates), and CSAM/illegal-content risk. Minimum safe version:
- **Pre-publish hold by default** for the first ~20 uploads from any new user (trust tier), then auto-publish with post-hoc review once trusted.
- **Strip EXIF/GPS on ingest** (Supabase Storage + a sharp/Next route) — protects uploaders and you.
- **DMCA pipeline that actually exists:** a `dmca@` address, a designated-agent registration with the Copyright Office (~$6, one-time — without it you have no safe harbor), and a takedown that flips `status='removed'` with an audit row. Counter-notice flow can be email-manual for now.
- **No raw deletes** — soft-delete everything so removals are auditable and reversible.

## The moderation queue (solo-operator reality)
You do **not** need a fancy console. Build one Postgres `moderation_queue` table (polymorphic: `target_type`, `target_id`, `reason`, `reporter_id`, `status`) and a single `/admin/queue` page behind Anthony's login. Every report, every held photo, every brigade flag lands here. Actions: approve / remove / ban-user. A "report" button on every UGC item feeds it. That's the whole system — one table, one page, one human.

**Must-exist-before-launch checklist per feature:** Terms + UGC license grant in your ToS, a report button, soft-delete, audit log, rate limit. No feature ships without all five.

## TOP 3 MUST-BUILD-NOW
1. **Login-gated votes + ratings with Postgres unique-constraint + velocity weighting** — the lowest-abuse, highest-value interaction; ship this first and the site stops feeling like a card dump.
2. **One moderation_queue table + `/admin/queue` page + universal report button** — the spine everything else hangs off; nothing UGC goes live without it.
3. **Photo uploads with rights-checkbox, EXIF strip, pre-publish hold, and a registered DMCA agent** — highest liability, so gate it hardest; the registered agent is the cheap legal must-have most solo operators skip.

====================

### the best web/interaction designer in the world (Awwwards-caliber)
# The Community Layer — making the zine talk back

The fix isn't "add reviews." It's: make every card feel like a living page of a newspaper that readers scribble in the margins of. Lean HARD into the newsprint metaphor — contributions should look like ink, stamps, and letters to the editor, never like Google Forms.

**1. The "Verdict Stamp" rating (MVP: weekend build).** Kill the 5-star widget. Locals tap one of three rubber-stamp verdicts — **WORTH IT / IT'S FINE / SKIP IT** — that thunk onto the card at a slight rotation with a quick ink-bleed transition. Aggregate shows as a smudged stamp: "47 LOCALS SAY WORTH IT." Optimistic UI: stamp lands instantly, rolls back silently on failure. Postgres: `votes(place_id, user_id, verdict, created_at)`, unique on (place_id,user_id). Turnstile-gated for anon, dedup by cookie+IP until they sign in. This alone fixes "I add no value" — it's social proof, on-brand, one tap.

**2. "Locals Say…" tips (MVP: ~3 days).** A short inline composer styled as a classified ad: "Add a tip — 200 chars, no essays." Renders as a stacked column of typewriter blurbs with a hand-set byline ("— Marcos R., regular"). This is the highest-value/lowest-friction content: *"get the al pastor, skip the salsa," "lunch line is brutal after 12."* Tips beat long reviews because people actually write them. `tips(place_id, body, user_id, status)` with a `status` default `pending` for first-time posters, auto-approved after a trust threshold.

**3. "Add a Photo" strip (MVP: ~4 days w/ Supabase Storage).** Right now you serve Google photos via proxy — sterile. Let locals drop real phone shots into a horizontal **photo strip** above the editorial review, each with a torn-edge polaroid frame and an optional caption. Flow: tap camera → pick → instant blurhash placeholder → uploads to Supabase Storage → appears optimistically with a faint "developing…" shimmer. Strip EXIF, downscale client-side, cap 3/user/place. Empty state: a dashed frame reading *"No local photos yet — be the first to show the plate."* User photos visibly outrank Google's = the "real, not corporate" feeling Leander wants.

**4. The Review Composer (MVP: ~5 days).** Don't ask normal people to out-write Anthony. Give a guided composer: three prompts — *The dish / The vibe / The verdict* — that assemble into a Bourdain-lite blurb. Renders in a "Letters to the Editor" column beside Anthony's piece, clearly demarcated (his = masthead serif; theirs = typewriter). This protects the editorial voice while still crowdsourcing.

**5. Saves / "My Leander" lists (MVP: ~2 days, needs auth).** A bookmark that animates as a clipped newspaper corner. Saved spots collect into a personal "clippings" page — the #1 return-visit driver. `saves(user_id, place_id)`.

**What you're missing (the real gap):** *recency and presence.* A directory is dead; a paper has a dateline. Add a homepage **"FRESH INK"** rail — latest tips/photos/verdicts fleet-wide — so the site visibly moves every day. And **"OPEN NOW"** filtering off your existing hours data: utility people return for daily.

**Cross-cutting craft:** every contribution control shares one motion language (ink-thunk, ~180ms, slight rotation, haptic on mobile). Mobile-first: thumb-reachable stamp bar pinned under each card. Auth is progressive — let people vote/tip anonymously via Turnstile, then prompt "claim your contributions" with a magic link (Supabase Auth) only once they're invested. Moderation: `status` enum + a lightweight Anthony admin queue (build on the existing PLAN.md moderation model), shadow-ban by trust score, report link on every item.

**TOP 3 MUST-BUILD-NOW**
1. **Verdict Stamp voting** — one-tap, anonymous-friendly, instant social proof; turns dead cards alive this weekend.
2. **"Locals Say…" tips** — highest value-per-effort content; the margin-scribble that makes it feel local.
3. **Local photo strips (Supabase Storage)** — real plates over corporate stock; the visceral proof the guide is by-and-for Leander.

Ship these three behind progressive auth + Turnstile; the composer, saves, and FRESH INK rail follow once contribution is flowing.

====================

### a ruthless skeptic / gaps auditor
# Gaps Audit: The Leander Local Guide

## Why it feels worthless (the honest diagnosis)

The owner's instinct is correct, and the reason is specific: **the site currently repackages Google.** Category, rating, hours, photos, Maps link — a user can get all of that *from Google Maps in one tap*, with more reviews and live traffic. You've rebuilt the worst 80% of Google and added zero reasons to choose you. The "empty review slots" make it worse than empty — they advertise the missing value. A directory that mirrors a stronger directory isn't a product; it's a redundant copy.

The single thing you have that Google can't replicate is **Anthony's voice** (blunt, sensory, local, opinionated) and **local-only knowledge** (what's actually good, what's a tourist trap, the off-menu thing, the line at 6pm). Everything you build should ladder up to that. Right now the differentiator (the reviews) is the one thing that's empty.

## What's actually missing, ranked by impact

**1. Editorial depth — the reason to TRUST it (build first).** The reviews are the product. Empty slots = no product. You don't need 176; you need Anthony's real take on the **top ~30** with a verdict, a "what to order," a "skip this," and a pull-quote. Minimum viable: an **admin area** (Supabase Auth, single role = Anthony) to write/edit reviews stored in Postgres, rendered server-side. Effort: ~3–4 days. This is non-negotiable — without it nothing else has a foundation to sit on.

**2. A reason to RETURN.** A directory is a one-time visit. You need freshness: a **"What's New / Recently Reviewed"** feed and **"New in Leander"** (openings/closings). Even just surfacing the newest 5 reviews on the homepage changes the mental model from reference to publication. Effort: ~1 day on top of #1.

**3. Lightweight interactivity that doesn't need accounts.** The owner wants votes/comments/photos — but **gating everything behind signup will kill a town-of-leander-sized audience.** Start anonymous-but-protected with **Cloudflare Turnstile**: an **upvote/agree** on a place ("locals agree: 142") and a **"been here / want to go"** tap. Store device-hashed votes in Postgres, dedupe loosely. Effort: ~2 days. This gives social proof *you own* (not Google's stars) with near-zero friction.

**4. THEN accounts + UGC (comments, photo uploads, user ratings).** This is where most plans waste time first. Comments and photo uploads bring moderation, DMCA, spam, EXIF/PII stripping, storage cost, and a cold-start problem (empty comment boxes look as dead as empty review slots). Do it *after* you have content and traffic worth contributing to. Supabase Auth + Storage + a moderation queue (per the existing PLAN.md). Effort: ~1–2 weeks done safely.

**5. The cheap "value" wins everyone forgets:** real local metadata Google buries — **patio? takes reservations? kid-friendly? actually-open-late? cash-only? best dish?** Structured Postgres fields + filters. This is genuinely useful, fully yours, and SEO gold ("best patio in Leander"). Effort: ~2 days for schema + filter UI; ongoing to populate.

## Brutal "don't bother yet" list
User photo uploads, threaded comments, user star ratings, saved lists/profiles, owner-response portal — **all premature.** They're plan-able but they manufacture moderation/legal/cold-start cost before you have an audience or content. UGC without a content nucleus is an empty room with a microphone.

## TOP 3 MUST-BUILD-NOW
1. **Anthony admin + real reviews on the top 30** (the trust layer — the actual product).
2. **Turnstile-gated upvotes + "what's new" feed** (return reason + owned social proof, no-signup friction).
3. **Local-only structured fields + filters** (patio/late/kid-friendly/best-dish — the data Google won't give them).

Ship those three and it stops being a card dump. Everything heavier waits until people have a reason to show up.