import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Two house rules that are enforced by the linter rather than by a comment somebody will scroll
// past. Both encode a mistake that has already happened in this repo once.
const HOUSE_RULES = {
  // 1. Stale data. The ad-hoc revalidatePath calls guarding the two cached routes (/r/[slug] and
  //    /r/[slug]/menu) had drifted: approving a reader's photo refreshed only the moderation
  //    screen, nothing ever refreshed the menu page, and votes refreshed nothing at all. One helper
  //    owns the list of surfaces now, so it can only drift in one place.
  noAdHocSpotRevalidate: [
    {
      selector:
        "CallExpression[callee.name='revalidatePath'] > TemplateLiteral:first-child[quasis.0.value.raw=/^\\u002Fr\\u002F/]",
      message:
        "Use revalidateSpot(slug) from @/lib/revalidate instead of revalidatePath('/r/...'). It busts every cached surface for the spot (detail page AND menu page AND the admin/owner desks); hand-rolled calls have already drifted once and left stale data in front of Google.",
    },
    {
      selector:
        "CallExpression[callee.name='revalidatePath'] > Literal:first-child[value=/^\\u002Fr\\u002F/]",
      message:
        "Use revalidateSpot(slug) from @/lib/revalidate instead of revalidatePath('/r/...').",
    },
  ],
  // 2. Google compliance. Ratings on a local business must come from users: "Ratings must be
  //    sourced directly from users" and "Don't rely on human editors to create, curate, or compile
  //    ratings information for local businesses." Our AI-compiled verdict and Google's own star
  //    average have BOTH been marked up here before, and both were ineligible and a manual-action
  //    risk. readerRatingLd() in lib/seo.ts is the only thing allowed to emit a rating, and it
  //    accepts reader reviews and nothing else.
  noHandWrittenRatings: [
    {
      selector: "Property[key.name='aggregateRating'], Property[key.value='aggregateRating']",
      message:
        "Do not write aggregateRating by hand. Use readerRatingLd(reviews) from @/lib/seo. Google requires local-business ratings to be sourced directly from users, so the editorial verdict (and Google's own star average) may never become a star rating.",
    },
    {
      selector: "Property[key.name='reviewRating'], Property[key.value='reviewRating']",
      message:
        "Do not write reviewRating by hand. Use readerRatingLd(reviews) from @/lib/seo, which only ever rates reader-submitted reviews.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...HOUSE_RULES.noAdHocSpotRevalidate,
        ...HOUSE_RULES.noHandWrittenRatings,
      ],
    },
  },
  {
    // The two files the rules exist to protect are, necessarily, the two that may break them.
    files: ["lib/revalidate.ts", "lib/seo.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
]);

export default eslintConfig;
