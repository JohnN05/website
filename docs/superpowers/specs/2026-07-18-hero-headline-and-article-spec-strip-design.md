# Home hero headline + article spec strip

**Date:** 2026-07-18
**Status:** design approved (mock-iterated), ready to build

## Problem

From the design run-through, two portfolio-substance gaps (distinct from the
earlier hue/identity pass):

1. **Home hero headline** is abstract — "Coding practical solutions for people.
   That's always been the point." States a value, not an identity, and never
   connects to the Tetris system the page is built on.
2. **Article write-ups carry no structured metadata.** They open with
   date/tags/title/dek, then prose. A visitor can't scan a project's role,
   timeline, stack, or outcome — the four things that actually qualify the
   work.

## Design

### 1. Hero headline (`src/pages/index.astro`)

Replace the `<h1>` text only:

> Building your peace of mind, **one piece at a time.**

- Identity unchanged: eyebrow stays `Software Engineer`. No "now" line, no
  education framing (deliberately rejected — focus is software).
- `peace ↔ piece` is an intentional homophone: "piece" is the correct Tetris
  term and puns on "peace of mind". This is the only line on the site that
  names the Tetris metaphor in words — every other reference is visual, so it
  retroactively justifies the ambient board behind it.
- "one piece at a time" wears the cobalt accent (`--color-accent`), the same
  emphasis colour used elsewhere. Wrap it in a `<span>`; no new JS.
- The reveal/parallax/`data-reveal` wiring on the hero copy is untouched — this
  is a text swap inside the existing `<h1 data-reveal>`.

### 2. Article spec strip (`ArticleLayout.astro` + schema + content)

A four-field metadata strip between the article header (dek) and the article
body: **Role · Timeline · Stack · Outcome**, mono labels over values,
hairline-ruled top and bottom, four columns collapsing to 2×2 on narrow
screens. The **Outcome** value wears the article's accent so the result reads
first. This is the one place labelled metadata is genuinely meaningful — real,
per-project attributes, not decoration.

**Schema (`src/content/config.ts`)** — four new **optional** fields:

```ts
role: z.string().optional(),
timeline: z.string().optional(),
stack: z.array(z.string()).optional(),
outcome: z.string().optional(),
```

**Render (`ArticleLayout.astro`)** — build a list of the present fields
(`stack` joined with ` · `) and render the strip only for fields that exist. A
project that sets none renders exactly today's header (graceful degradation,
the same contract `cover` already has). Grid column count = number of present
fields so a partial strip still looks intentional.

**Content** — populate the four fields on the existing projects with values
drawn from each write-up's own prose (below). These are drafts for John to
correct, not invented facts:

| slug | role | timeline | stack | outcome |
|---|---|---|---|---|
| `terp-rater` | Solo build | 2024 | JavaScript · Chrome Extension | Live on the Chrome Web Store · 4★+ |
| `movement-map` | SWE Intern — full-stack | Summer 2025 | PostgreSQL · Python ETL · Vue + Cesium | 270M → 3.2M rows, shipped |
| `echtralex-lexicography` | Team of 5 (CMSC435) | Spring 2026 | LaBSE · Python scoring | ~100% speedup · ~98% accuracy |
| `portfolio-site-rewrite` | Solo build | 2026 | Astro · MDX · TypeScript | Zero JS by default |

`_template.mdx` gets the fields as commented/empty examples so new projects
know they exist.

## Out of scope / unchanged

- No changes to the generated cover, tetromino fallback, tags, or prose.
- No new JS anywhere (hero is a text/span swap; strip is server-rendered).
- Bio, teaching, featured, and the other-pages hue work — untouched.

## Verification

- `npm run typecheck` (schema types regenerate via `astro sync`) + `build`.
- `npm run test:e2e` — **accessibility** axe sweep must stay clean on the
  article route (`/projects/portfolio-site-rewrite` is the one in the suite),
  incl. the outcome-in-accent contrast; wordmark reveal on the article is
  unaffected. Add no new unit tests (presentational; no `src/lib/` logic).
- Confirm graceful degradation: temporarily a project with no strip fields
  still renders (the `_template`/any un-migrated file proves it at build).

## Files

- `src/pages/index.astro` — hero `<h1>` text + accent span
- `src/content/config.ts` — four optional schema fields
- `src/layouts/ArticleLayout.astro` — strip render + styles
- `src/content/projects/*.mdx` — populate the four fields (4 live + template)
- `CLAUDE.md` — note the hero line + spec strip in the relevant sections
