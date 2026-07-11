# johnjng.com — Personal Website

## Purpose

John Ng's personal site. Intro + portfolio, revamped (2026) from a single-page
CRA SPA into a professional/minimal, multi-page site with dedicated space for
project write-ups and a couple of subtle hobby-inspired interactive details
(tetris, minesweeper, butterfly-knife-flip toggle, capybara mascot).

**Status:** rewrite implemented (all 16 plan tasks complete, reviewed, and
merged into `worktree-website-revamp` / PR #1). This file describes the site
as actually built, not just as planned.

Full design rationale: `docs/superpowers/specs/2026-07-11-website-revamp-design.md`.
Implementation plan (task-by-task, with exact deviations disclosed):
`docs/superpowers/plans/2026-07-11-website-revamp.md`. Read the spec for the
"why" behind anything below; read the plan for the "how" and for a handful of
example-code bugs that were found and fixed during implementation (dependency
version pin, an unwinnable Tetris ambient-demo script, Astro CSS-scoping
gaps, flaky/infinite-looping test fixtures, a CSS-cascade bug, and two ARIA
violations caught by the axe-core suite).

## Stack

- **Astro** — static-first site generator. Zero JS by default; only hydrate
  islands that need interactivity (Tetris widget, light/dark toggle, capybara
  mascot, Minesweeper board).
- **MDX content collections** — each project article is one `.mdx` file under
  `src/content/projects/`. Astro derives the route slug from the filename.
  Adding a new project = add one file, no code changes.
- Deployed on Netlify (same domain as before). Contact form uses Netlify's
  built-in static form handling — no backend/serverless functions anywhere in
  this stack.
- Previous stack was Create React App (deprecated upstream) — fully replaced,
  not incrementally patched. Old repo history kept for content reference only.
- **TypeScript strict**, **Vitest** (+ happy-dom for DOM-touching unit tests)
  for pure `src/lib/` logic, **`@playwright/test`** + **`@axe-core/playwright`**
  for e2e/accessibility. `npm test` (unit), `npm run build`, `npm run test:e2e`,
  or `npm run test:all` (all three in sequence — the real CI gate).

## Architecture pattern

Every interactive widget splits into two layers:
- **Pure logic** in `src/lib/` (`theme.ts`, `projects.ts`, `contactForm.ts`,
  `capybara.ts`, `tetris/engine.ts` + `tetris/bag.ts` + `tetris/ambientDemo.ts`,
  `minesweeper/engine.ts`) — no DOM, no I/O, fully unit-tested with Vitest.
- **DOM wiring** in the matching `.astro` component's `<script>` block —
  imports the pure module, renders/re-renders the DOM, handles events.
  Covered by Playwright e2e, not unit tests.

Astro scopes `<style>` blocks by rewriting selectors with a
`data-astro-cid-*` attribute added to elements at build/render time. Any
element created at runtime via `document.createElement` (all four widgets'
grids) never receives that attribute, so scoped rules targeting those
elements must be wrapped in `:global()` (see `TetrisHero.astro` and
`MinesweeperBoard.astro`) — forgetting this silently renders an unstyled
grid, not an error.

## Site map

`/` (home, hero + featured-projects preview) · `/projects` (index) ·
`/projects/[slug]` (article) · `/contact` (Netlify Forms) · `/404`
(Minesweeper board).

## Content collection schema

```ts
// src/content/config.ts
const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});
```

Home's featured-projects preview shows `featured: true` entries; if none are
flagged, falls back to latest N by date. `draft: true` hides an entry from
`/projects` and Home without deleting it — that's how `_template.mdx` stays
in the repo as a non-live "copy this file" starting point.

## Visual design tokens

| Role | Light | Dark |
|---|---|---|
| Background | `#FAF7F0` (ivory) | `#0F1E3D` (navy) |
| Text primary | `#0F1E3D` (navy) | `#FAF7F0` (ivory) |
| Accent | `#3454D1` (cobalt — Tetris J-piece blue) | same |
| Text secondary | `#4A5468` (slate) | `#9AA7B8` |

Typography: **Syne** (headlines) · **Source Serif 4** (article prose body
text only) · **Inter** (UI/interface copy — nav, buttons, forms) · **IBM Plex
Mono** (small labels: nav wordmark, eyebrows, article meta line).

## Hobby details — priority order

**Primary (most polish):** Tetris (ambient hero-corner animation, hidden
click-to-play overlay, hidden below mobile breakpoint) and the capybara
mascot (article reading-progress indicator, speed scales with scroll,
collapses to resting pose at 100%). The ambient loop's scripted sequence
(`src/lib/tetris/ambientDemo.ts`) uses five O-pieces rather than a mixed
piece set — the original mixed-piece script could never actually clear a
line (3 of 10 columns were mathematically unreachable by its move set), so
it was replaced with a script that reaches every column; this trades a bit
of visual variety for the loop actually working.

**Lower priority (simpler first pass is fine):** Minesweeper (the `/404`
page, needs its context line — see spec) and the butterfly-knife-flip
light/dark toggle.

All four use standard smooth CSS easing — a "stepped/frame-based" motion
language was tried and explicitly rejected as janky.

## Hard constraints (don't reintroduce these)

- No resume download link anywhere.
- No email/phone displayed as text anywhere — contact goes through `/contact`
  only. LinkedIn/GitHub links stay visible (public profile links, not private
  contact info).
- No dedicated About page — bio lives on Home.
- No Pokémon or other copyrighted character likeness for the mascot —
  raised and ruled out during design (IP risk). Capybara is original.
- Contact form must show an inline success message via JS `fetch` submit —
  do not let it fall through to Netlify's default unstyled success-page
  redirect. It must also show inline feedback on failure (non-2xx response
  or a thrown/rejected `fetch`) rather than failing silently — `#contact-error`
  (`role="alert"`) in `ContactForm.astro`, form stays visible so the visitor
  can retry. Error copy stays within the "no email/phone as text" constraint
  (points to LinkedIn/GitHub, not a static address).

## Accessibility (see spec for full list)

`prefers-reduced-motion` fallbacks for all four hobby details, full keyboard
operability for both games, visible focus states sitewide, skip-to-content
link, and `aria-hidden` on the two purely-decorative details (Tetris ambient
animation, capybara mascot — the capybara is a supplement to reading
progress, never the only way it's conveyed).

Both game boards use proper ARIA containment (`role="grid"` →
`role="row"` → `role="gridcell"`, with `display: contents` on the row
wrapper so the wrapper doesn't disturb the CSS Grid visual layout) rather
than flat `role="grid"` → `<button>` children, which axe-core flags as
`aria-required-children`. Minesweeper cells convey state via `aria-label`
only (not `aria-pressed`, which isn't a permitted attribute on `gridcell`).
The Tetris play overlay (`role="dialog" aria-modal="true"`) moves focus to
its close button on open and traps Tab/Shift+Tab within the panel while
open; closing restores focus to the trigger button.

Verified sitewide by `tests/e2e/accessibility.spec.ts`: an
`@axe-core/playwright` sweep (no serious/critical violations) and a
skip-link-is-first-tab-stop check on all 5 routes, plus two targeted
reduced-motion checks (Tetris ambient loop freezes on a static frame;
capybara has no run-cycle animation) — this is the suite that actually
caught the ARIA containment bugs above during implementation.

## Repo history

Old CRA site's commit history is preserved — useful for content reference
(bio copy, past repo list) even after the rewrite.
