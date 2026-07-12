# johnjng.com — Personal Website

## Purpose

John Ng's personal site. Intro + portfolio, revamped (2026) from a single-page
CRA SPA into a professional/minimal, multi-page site with dedicated space for
project write-ups and a couple of subtle hobby-inspired interactive details
(tetris, minesweeper, butterfly-knife-flip toggle, capybara mascot).

**Status:** initial rewrite implemented (16 tasks, PR #1), then a visual
refinement pass implemented on top (15 more tasks: spacing scale, tag-accent
colors, chrome-reduced cards, Tetris autoplay heuristic, collapsible sidebar
nav). This file describes the site as actually built, not just as planned.
The visual refinement pass's full Playwright/axe e2e suite has not yet been
executed against a real browser environment — the sandbox it was built in
had no root access and was missing Playwright's native dependencies. Run
`npm run test:e2e` before merging/deploying this branch.

Full design rationale (original rewrite):
`docs/superpowers/specs/2026-07-11-website-revamp-design.md`. Full design
rationale (visual refinement):
`docs/superpowers/specs/2026-07-11-website-visual-refinement-design.md`.
Implementation plans (task-by-task, with exact deviations disclosed):
`docs/superpowers/plans/2026-07-11-website-revamp.md` and
`docs/superpowers/plans/2026-07-11-website-visual-refinement.md`. Read each
spec for the "why" behind anything below; read each plan for the "how" and
for bugs found and fixed during implementation. Original rewrite: a
dependency version pin, an unwinnable Tetris ambient-demo script, Astro
CSS-scoping gaps, flaky/infinite-looping test fixtures, a CSS-cascade bug,
two ARIA violations caught by axe-core. Visual refinement: the capybara
mascot's `color` token was inert because its SVG is painted via
`background-image` (an isolated rendering context where `currentColor`
can't resolve to the host element) — fixed by switching to `mask-image` +
`background-color`, which does respect it.

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

## Navigation

Desktop (`min-width: 769px`): `Nav.astro` renders a fixed-left icon rail
(`#nav-rail`), collapsed by default (`width: var(--space-8)`, icons only),
expandable via `#rail-toggle` to `14rem` with labels. State persists to
`localStorage['nav-rail']` (`src/lib/nav.ts`: `getInitialRailState` /
`toggleRailState` / `persistRailState`) and is mirrored onto
`document.documentElement.dataset.rail`, read by `global.css` to push
`#main-content`'s `margin-left` over when expanded. `BaseLayout.astro`'s
inline `<script is:inline>` FOUC-prevention script sets the initial
`data-rail` synchronously (duplicating `nav.ts`'s default logic, since
`is:inline` can't use ES module imports) so there's no flash of the wrong
layout width before hydration; `Nav.astro`'s own script re-derives and
re-applies the same value on hydration, which is intentional and idempotent.

Mobile (`max-width: 768px`): `Nav.astro`'s rail is `display: none`;
`MobileNav.astro` (a separate, always-mounted component) renders a top bar
with a hamburger toggle (`#mobile-nav-toggle`) opening a link drawer
(`#mobile-drawer`), including its own `ThemeToggle` instance since the
desktop rail's toggle is unreachable at this width.

Both icon-only toggle buttons (rail collapse/expand, mobile hamburger) get
their accessible name from a `.sr-only` span (clip/absolute-positioned, not
`display:none`, so it stays in the accessibility tree) rather than
`aria-label` — a deliberate, repeated pattern, not an oversight.

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
| Accent (cobalt) | `#3454D1` (Tetris J-piece blue) | same |
| Accent (maroon) | `#B06B5F` | same |
| Accent (clay) | `#C08552` | same |
| Accent (moss) | `#7A9B76` | same |
| Text secondary | `#4A5468` (slate) | `#9AA7B8` |
| `--line` (hairline dividers) | `color-mix(in srgb, var(--color-text) 12%, var(--color-bg))` | recomputes per-theme |

Spacing scale (`src/styles/tokens.css`): `--space-1` (0.25rem) through
`--space-9` (6rem), doubling roughly at each step. Used sitewide in place of
hardcoded rem/px values; not redefined per-theme since spacing doesn't
change between light/dark.

Tag/project accent colors are assigned deterministically, not manually:
`accentForTag(tag: string): 'cobalt' | 'maroon' | 'clay' | 'moss'`
(`src/lib/tags.ts`) hashes the tag string so the same tag always renders the
same color everywhere it appears (project cards, article meta line), without
a maintained tag→color lookup table. Rendered via global `.tag`/`.tag-*`
classes in `global.css` (not component-scoped, so both `ProjectCard.astro`
and `ArticleLayout.astro` share the same rules).

Typography: **Syne** (headlines) · **Source Serif 4** (article prose body
text only) · **Inter** (UI/interface copy — nav, buttons, forms) · **IBM Plex
Mono** (small labels: nav wordmark, eyebrows, article meta line).

## Hobby details — priority order

**Primary (most polish):** Tetris (ambient hero-corner animation, hidden
click-to-play overlay, hidden below mobile breakpoint) and the capybara
mascot (article reading-progress indicator, speed scales with scroll,
collapses to resting pose at 100%). The ambient loop
(`src/lib/tetris/ambientDemo.ts`) no longer runs a fixed O-piece-only
script — it draws real pieces from the 7-bag randomizer
(`src/lib/tetris/bag.ts`) and picks each placement via a genuine (if
simple) heuristic AI (`src/lib/tetris/autoplay.ts`: `chooseBestPlacement`,
scoring candidate placements by holes/bumpiness/aggregate-height/lines-
cleared), so the corner animation shows real piece variety instead of a
repeating script. Piece type is preserved through to rendering
(`TetrisHero.astro`'s `renderBoard` sets `data-piece` per cell) and each of
the 7 types gets its own muted color — I/O/T/J via dedicated hex values,
S/Z/L reusing the site's moss/maroon/clay accent tokens directly. The
ambient board is positioned absolutely in the hero's top-right corner
(not flex-adjacent to the H1) and rendered with a slight blur+dim; the
real click-to-play board stays crisp.

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

`tests/e2e/nav.spec.ts` covers the collapsible sidebar rail (collapsed by
default, `aria-expanded` toggles and persists across reload, links keep
accessible names while collapsed) and the mobile drawer (rail hidden below
769px, hamburger opens the drawer, links reachable). **Caveat:** this suite
and the accessibility sweep above have not been executed against the
visual-refinement branch's changes in a real browser — see Status at the
top of this file.

## Repo history

Old CRA site's commit history is preserved — useful for content reference
(bio copy, past repo list) even after the rewrite.
