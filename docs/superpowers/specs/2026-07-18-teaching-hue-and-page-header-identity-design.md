# Teaching stat recolor + per-route page-header identity

**Date:** 2026-07-18
**Status:** design approved (via mock iteration), ready to plan/build

## Problem

Two findings from a full-site design run-through, both about a page (or
section) not being memorable/distinct enough:

1. **Teaching section (`index.astro`)** — its three impact numbers are each a
   different accent (cobalt / clay / moss). That reads as busy, and it breaks
   the site's "one identity colour per surface" convention. It's also Home's
   most template-flavoured block ("big number / small label" KPI strip).
2. **Page-header sameness** — `/projects`, `/contact`, `/404` all open with the
   same `wash-band → mono eyebrow → title → lede` block, and `/contact` +
   `/404` share the *same* cobalt wash (`--wash-hero`). Three "memorable" pages
   read as one template.

## Constraints (from the design dialogue)

- **No new Tetris motion.** The site already leans heavily on Tetris effects;
  these fixes lean on the existing **hue + type** system only — the same
  restraint as the just-shipped rail edge-tick.
- Teaching numbers unify to **monochrome** (primary text colour), not teal and
  not cobalt — teal read as random, and monochrome can never read as random.
- 404 heading is literally **`404`** (no emoticon — reads badly in the bold
  display face).
- Eyebrows stay `--color-text-secondary`. The per-route hue rides the **wash
  tint + a header edge-tick**, never small coloured eyebrow text — clay-orange
  mono text on an orange wash is a contrast-audit risk, and tick-carries-hue
  matches how the rail already works.

## Design

### 1. Teaching numbers → monochrome (`src/pages/index.astro`)

- All three `.stat-n` numbers: drop the per-child accent
  (`:nth-child` cobalt/clay/moss rules) → `color: var(--color-text)`.
- Replace `.impact`'s full-width `border-top` with a short **per-number tick**:
  `.stat::before`, `1.6rem × 3px`, `border-radius: 1px`, colour
  `color-mix(in srgb, var(--color-text) 45%, var(--color-bg))` (muted, not an
  accent). Tick sits directly above each number.
- **Unchanged:** the entry count-up, `tabular-nums`, mono `.stat-l` labels, the
  grid layout and its `max-width: 520px` two-column reflow, the detail line.

### 2. Per-route header identity (`projects/index.astro`, `contact.astro`, `404.astro`)

Each route owns a hue matching **its rail tick** (`Nav.astro`), carried by the
wash tint + a left edge-tick on the intro copy:

| Route | Hue | Wash today | Change |
|---|---|---|---|
| `/projects` | `--piece-l` (orange) | `--wash-featured` (orange) — already correct | add left edge-tick in hue |
| `/contact` | `--color-accent-maroon` | `--wash-hero` (cobalt) — **clashes with 404** | wash → `color-mix(bg, maroon 18%)`; add edge-tick |
| `/404` | `--color-accent` (cobalt) | `--wash-hero` (cobalt) — keep | copy change (below); centred, so **no left tick** |

- **Edge-tick** (`/projects`, `/contact` only — both left-aligned intros): a
  `~4px`-wide vertical hue bar hanging at the left of the eyebrow+title block.
  Give the copy column `position: relative` + a little left padding and put the
  bar on a `::before`. Static (no hover/grow — a header is a "you're here"
  marker, not an interactive rail link). This is the rail's edge-tick language
  brought into the header, so page and nav marker visibly share identity.
- **`/404` copy:** eyebrow `Error 404 — Page not found` → `Page not found`;
  add a `404` display heading above the existing context line. Layout stays
  centred; cobalt wash stays; no left tick (doesn't suit a centred column).
  The Minesweeper board, home-link, and seam are untouched.
- Reuse the existing `--wash-mix: 18%` for the maroon mix so contact's wash
  depth matches the other bands.

## Out of scope / unchanged

- Featured-projects section and bio (the "what I've built" story) — untouched.
- `Nav.astro` / `ThemeToggle.astro` — shipped last commit; not reopened.
- No new tokens strictly required; contact's maroon wash can be an inline
  `color-mix` (contact isn't a Home section, so it needs no `--wash-*` token) —
  or a `--wash-contact` token if that reads cleaner during build.

## Verification

- `npm run typecheck` + `npm run build` green.
- `npm run test:e2e` — **accessibility** spec is the one that matters: axe must
  stay clean on all 5 routes (the maroon/orange washes + monochrome numbers +
  new 404 heading are all contrast-sensitive), and nav/skip-link checks must
  still pass. Existing `tetris-hero`, `wordmark`, `nav` specs unaffected.
- No new unit tests — pure presentational CSS/markup, no `src/lib/` logic.

## Files

- `src/pages/index.astro` — teaching stat colours + tick
- `src/pages/projects/index.astro` — header edge-tick
- `src/pages/contact.astro` — maroon wash + header edge-tick
- `src/pages/404.astro` — cobalt identity + `404` heading / eyebrow copy
- `CLAUDE.md` — note the per-route header hue + monochrome teaching in the
  relevant sections (Visual design tokens / Site map), keeping it a reference
  not a changelog.
