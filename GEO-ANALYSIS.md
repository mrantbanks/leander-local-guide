# GEO / AI-Search Analysis — leanderlocalguide.com

_Audited 2026-06-24. Framing per Google: GEO is SEO fundamentals applied to AI-search surfaces, not a separate discipline._

## GEO Readiness Score: 71 / 100

| Dimension | Weight | Score | Notes |
|---|---|---|---|
| Technical accessibility | 20% | 19 | SSR, AI crawlers welcomed, robots + sitemap + llms.txt all live |
| Structural readability | 20% | 15 | Clean H1→H2→H3, short paragraphs; few question-headings / tables |
| Citability | 25% | 17 | Quotable, specific, named-dish prose, front-loaded hook; opinion not fact-definition style |
| Authority & brand | 20% | 9 | Byline + Person schema + dates ✓; **zero off-site brand mentions, new domain** |
| Multi-modal | 15% | 11 | Photos + map embeds ✓; no video/charts |

**Verdict:** technically excellent, content well-structured. The gap is entirely **off-site authority** — expected for a domain this young. The fixes below are mostly off-page now.

## Platform Breakdown (readiness, not current visibility)

| Platform | Score | Why |
|---|---|---|
| Google AI Overviews | 72 | Strongly ranking-correlated. Schema + SSR are ready; needs indexation + age to rank. |
| Google AI Mode (Gemini 3.5) | 66 | Broader pool, rewards freshness + entity authority + citable passages beyond pos 5 — our new date signals + local uniqueness help. |
| ChatGPT | 45 | Cites Wikipedia (48%) + Reddit (11%). We have neither yet. |
| Perplexity | 45 | Reddit-dominant (47%). Needs community validation. |

> Google's two engines agree ~86% of the time but cite the same URL only 13.7% of the time — treat AIO (ranking-fed) and AI Mode (freshness/entity-fed) as separate targets.

## AI Crawler Access — ALL ALLOWED ✓

Confirmed by live fetch (HTTP 200) **and** our new `/robots.txt`:

| Crawler | Status |
|---|---|
| GPTBot, OAI-SearchBot, ChatGPT-User (OpenAI) | ✅ allowed |
| ClaudeBot, Claude-Web (Anthropic) | ✅ allowed |
| PerplexityBot | ✅ allowed |
| Googlebot, Google-Extended | ✅ allowed |
| Applebot-Extended | ✅ allowed |

Disallowed (correctly): `/admin`, `/contribute/`, `/api/`, `/uploads/`. Cloudflare Bot Fight Mode is **not** blocking these (tested per-UA). Content is in **server-rendered HTML** — crawlers that don't run JS still get the full reviews.

_Optional: block `CCBot` / `anthropic-ai` / `Bytespider` if you want to allow AI **search** but deny AI **training**. Currently training crawlers are allowed via `*`._

## llms.txt — NOW PRESENT ✓

`/llms.txt` live with site description, key pages, and the Leander-only scope. (Per Google/Mueller this is not currently a proven citation lever — included as cheap, harmless, forward-looking; assign it no ranking weight.)

## Server-Side Rendering — PASS ✓

Next.js App Router, `force-dynamic`. Reviews, ratings, schema all present in initial HTML. No JS dependency for content. This is the single most important technical GEO requirement and it's met.

## Schema — STRONG, with room

Live on detail pages: `Restaurant` + nested `Review` + `Person` (author) + `Organization` (publisher) + `PostalAddress`, now with `datePublished`/`dateModified`. Per-page unique title + description.

**Add next:**
1. `WebSite` + `Organization` schema on home with `sameAs` (social profiles) and `SearchAction` (sitelinks search box).
2. `ItemList` on `/best/*` leaderboards — ranked lists are highly extractable by AI.
3. `BreadcrumbList` site-wide.

## Passage-Level Citability

`/r/[slug]` front-loads the hook (good — 44% of AI citations come from the first 30% of a page). Detail pages are well under the 134–167-word citable-block sweet spot per section. The `/best/*` boards are the most citable assets ("the best tacos in Leander are…") — lean into them.

## Brand-Mention Analysis (the 3× lever)

Brand mentions correlate ~3× more with AI citation than backlinks. Current presence:

| Surface | Status |
|---|---|
| Wikipedia / Wikidata | none |
| Reddit (r/Leander, r/Austin) | none |
| YouTube | none |
| LinkedIn | Anthony's personal profile only |

This is the #1 growth area and it's **off-site**.

## Top 5 Highest-Impact Changes

1. **Get indexed (slow-rolled)** — by owner decision the sitemap exposes only `/` + `/about` through ~2026-08-24 to drip-feed indexation on a new domain, then expands (statics → boards → spots). Submit this small sitemap to Google Search Console + Bing now; widen it over the next 2 months.
2. **Seed brand mentions** — post the `/best/*` rankings into r/Leander, local Facebook/Nextdoor groups, and a simple "Leander Eats" YouTube/Short. Highest GEO lever, entirely off-site.
3. **Question-pattern headings + a citable answer line** on `/best/*` and category pages ("What are the best tacos in Leander, TX? …") to match AI query phrasing.
4. **Recency program** — reviews now show "Updated {month}". Keep a refresh cadence; content <3 months old is ~3× more citable.
5. **Entity building** — `Organization`/`sameAs` schema + consistent NAP + a Google Business presence so AI systems resolve "The Leander Local Guide" as an entity.

## Content Reformatting Suggestions

- **Home:** add one citable intro line — "The Leander Local Guide covers ~180 local food and drink spots in Leander, Texas (ZIP 78641/78645)…".
- **/best boards:** open each with a 1-sentence extractable answer naming the top 3.
- **Detail spec sheet:** already factual; expose cuisine + price + signature dish as a tight, quotable block.
