# johnjng.com — Hero & Nav Refinement (Round 2) — Design Spec

## Overview

The visual refinement pass (`2026-07-11-website-visual-refinement-design.md`)
shipped and was reviewed live. Four things still needed adjustment: the
collapsible sidebar rail felt gratuitously hidden-by-default rather than a
deliberate choice; the Tetris ambient widget, even relocated to a hero
corner, still read as a small decorative box rather than "the entire
background of the main message" as originally intended; the sitewide Syne
800 display face is hard to read as a full sentence (confirmed against the
hero's actual copy) even though it works well as a short label/wordmark; and
"Featured projects" sits flush against the content edge while the hero copy
above it has a left inset, an inconsistency traced to a missing padding rule.

This spec amends the prior visual-refinement spec's §3 (Tetris Hero) and §5
(Navigation). Everything else from that spec and the original revamp spec
(site map, content model, contact form, accessibility, spacing scale,
accent system, card treatment) stands unchanged.

Design values below (70% board width, 30px cells, mask/blur numbers, rail
width, font choice) were settled interactively against a running mockup, not
picked cold — see the design values as the source of truth over any
approximate wording.

## Scope

Home hero section and the desktop nav rail. Mobile `MobileNav.astro` is
untouched — it was never the collapsible thing. Article layout, project
cards, tag/accent colors, and the spacing scale itself are untouched except
for the one `.featured`/`.project-grid` padding bug in §4.

## 1. Navigation — always-open rail (supersedes prior spec's §5)

**Problem:** collapsible-by-default read as hidden functionality, not a
deliberate minimalist choice, once seen live.

**Decision:** remove the collapse/expand behavior entirely. The rail is
permanently the "expanded" visual — 14rem wide, icon + label always shown,
no toggle.

- `Nav.astro`: delete the `#rail-toggle` button markup, its `<script>`
  block, and the `data-rail` collapsed/expanded CSS branching (the
  `.rail-wordmark`/`.rail-mark`/`.rail-label` show/hide rules keyed off
  `:root[data-rail='expanded']` collapse into their always-shown state).
- `src/lib/nav.ts` (`getInitialRailState`, `toggleRailState`,
  `persistRailState`) and its `localStorage['nav-rail']` key are deleted —
  dead code once there's no toggle to call them. `nav.test.ts` goes with it.
- `BaseLayout.astro`'s inline FOUC-prevention script: remove the `data-rail`
  branch (it currently reads `localStorage.getItem('nav-rail')` before
  hydration) — nothing to prevent flashing between anymore.
- `global.css`: `#main-content`'s margin-left becomes an unconditional
  `14rem` — drop the `:root[data-rail='expanded']` selector and the
  width-transition rule.
- `tests/e2e/nav.spec.ts`: replace the collapse/expand/persistence
  assertions with a single check that the rail renders at 14rem with both
  links reachable and labeled.

## 2. Tetris Hero — full hero-section background (supersedes prior spec's §3)

**Problem:** relocating the ambient board to an actual corner (prior pass)
fixed the "sitting in the middle of the flex row" issue, but a 120px box
still reads as a small decorative token, not a background.

**Decision:**

- The board stops being a fixed 120px corner box
  (`.tetris-hero { position: absolute; top: var(--space-6); right:
  var(--space-6); width: 120px; }`) and becomes the hero section's
  full-height background layer: right-anchored, sized so it occupies
  **~70% of the hero's width**. The remaining left portion is where
  `.hero-copy` sits, in the clear.
- **The auto-player simulation is sized to match the visible area** — the
  ambient instance's column count is derived from that ~70%-width area, not
  the full hero width. No placement/gravity logic runs for a column that's
  permanently hidden; this is a simulation-width change, not a mask
  layered over an oversized board.
- **Square cells, not stretched ones:** cell size is fixed at roughly
  **30px**, and the board's row/column counts are computed by dividing the
  available pixel width/height by that fixed size — so pieces stay true
  squares at any hero width, rather than being stretched to fill a
  container's aspect ratio.
- **Softening:** `filter: blur(1.5px)`, `opacity: 0.85` (up from the prior
  pass's corner-box values of `blur(1px)/0.82` — a larger field of blocks
  needs slightly more blur to keep reading as texture rather than
  gameplay).
- **Left-edge fade, on the board itself:** no separate scrim element.
  Applied directly to the board:
  ```css
  mask-image: linear-gradient(90deg, transparent 0%, transparent 15%, black 65%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 15%, black 65%);
  ```
  The first 15% of the board's own width is fully transparent (no pieces
  visible at all, reads as plain background), ramping gradually to fully
  opaque by 65% of the board's width — a long, soft transition rather than
  a hard edge or a box positioned to guess where the board starts (an
  earlier iteration of this mockup made that exact mistake: a scrim
  positioned at the hero's left edge, while the right-anchored board's own
  left edge sat well to the right of it, so the two never overlapped).
- Piece coloring (muted 7-color map), the 7-bag randomizer, and the
  holes/bumpiness/height heuristic auto-player are unchanged from the prior
  pass — this section changes placement, sizing, and masking only, not the
  underlying game logic (`src/lib/tetris/autoplay.ts`, `bag.ts`).
- The real click-to-play overlay (`#tetris-board`) is unaffected — same
  small, crisp modal board as before, no background/masking treatment
  applied to it.

## 3. Hero quote typography — Bricolage Grotesque

**Problem:** Syne 800 (the sitewide `h1, h2, h3` face) works well as a short
display label (nav wordmark, "Featured projects", article titles) but is
hard to read set as a full sentence — confirmed against the hero's actual
copy, not a hypothetical.

**Decision:**

- Add **Bricolage Grotesque** (weight 600, using its `opsz` optical-size
  axis) to the Google Fonts `<link>` in `BaseLayout.astro`, alongside the
  existing Syne / Source Serif 4 / Inter / IBM Plex Mono.
- **Scoped swap, not a global font change:** only the home hero's `<h1>`
  (`.hero-copy h1` in `index.astro`) switches to Bricolage Grotesque 600.
  Every other heading — nav wordmark, "Featured projects" h2, article
  titles, project card titles — keeps Syne 800 exactly as today. The
  sitewide `h1, h2, h3 { font-family: 'Syne' }` rule in `global.css` is
  unchanged; this is a single additional selector overriding it for one
  element.
- Rejected alternatives (for context, not to revisit): a first round of
  options (Space Grotesk, Manrope, Sora, Inter semibold) read as generic
  tech-portfolio grotesks; a second round paired Bricolage
  Grotesque/Familjen Grotesk (quirky/expressive sans) against
  Fraunces/Instrument Serif (editorial serifs echoing the site's existing
  Source Serif 4 body face). Bricolage Grotesque was picked as the one with
  enough of Syne's energy to not feel like a downgrade, without Syne's
  sentence-length weight problem.

## 4. Spacing — "Featured projects" alignment (bug fix)

**Root cause:** `.featured` (the section wrapping the home page's
featured-projects list in `index.astro`) has no horizontal padding at all,
while `.hero` has `padding: var(--space-9) var(--space-5)`. Only its child
`.project-grid` has padding (`0 1.5rem 4rem` — itself a hardcoded literal
that was never migrated to a token during the original spacing-scale pass),
so the h2 sits flush against the content edge while the hero copy above it
sits `--space-5` in from the same edge.

**Fix:** give `.featured` `padding: 0 var(--space-5)` (top/bottom rhythm
already comes from surrounding margins — see open item below on avoiding
double-spacing), and replace `.project-grid`'s hardcoded `1.5rem` with
`var(--space-5)`. Both sections now share the same left inset from the nav
rail's dividing line.

## Open items for the implementation plan

- Exact vertical padding split between `.hero`, `.featured`, and
  `.project-grid` once `.featured` gains horizontal padding — verify
  top/bottom spacing doesn't double up against existing margins.
- Confirm the Tetris background's mask/blur values read correctly against
  the dark theme's navy background — the mask itself is color-agnostic (it
  reveals/hides the board rather than painting a fixed color), so it should
  work unmodified, but worth a visual check during implementation.
- The ambient board's ~30px cell size is independent of the real
  click-to-play board's cell size — confirm during implementation that this
  divergence (background texture vs. crisp small modal) is intentional and
  doesn't need to match.
- Before deleting `nav.ts`/`nav.test.ts` and the `nav-rail` localStorage
  key, grep for any other reference to it (analytics, other tests) so
  nothing dangles.
