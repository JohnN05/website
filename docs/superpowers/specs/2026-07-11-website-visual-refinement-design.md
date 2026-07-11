# johnjng.com Visual Refinement — Design Spec

## Overview

First-draft implementation of the original revamp
(`2026-07-11-website-revamp-design.md`) shipped, but four things read wrong
in practice: spacing feels cramped everywhere, the site as a whole feels
generic rather than minimal-and-considered, the Tetris hero detail reads as
a literal loud game board instead of a subtle ambient texture, and the color
palette is functionally monochrome (5 tokens, one accent, no variation).

This spec amends the original design's Visual Design and Interactive Details
sections. Everything else in the original spec (site map, content model,
contact form behavior, accessibility requirements, non-goals) stands
unchanged and still applies.

Implementation lives in the `website-revamp` worktree
(`.claude/worktrees/website-revamp/`), not the stale CRA code at the repo
root.

## Scope

Whole site. The new spacing scale and accent tokens are global design tokens,
so every page picks them up: Home/hero, `/projects` index and cards, article
layout, nav, footer, contact form. The chrome-reduction treatment (see
below) is applied to content cards specifically; nav and footer keep their
existing simple static hairlines since they're persistent structural chrome,
not content containers, and don't need a hover-reveal treatment.

Out of scope for this pass: Minesweeper, the butterfly-knife light/dark
toggle, and the capybara mascot's core mechanic (reading-progress tracking)
are unchanged. The capybara's fill color is touched only incidentally (see
Accent System below); its animation/behavior is untouched.

## 1. Spacing Scale

**Problem:** No spacing tokens exist today (`src/styles/tokens.css` holds
only color). Every padding/margin/gap is a hardcoded rem literal per
component, and the values in practice cluster tightly (`0.25rem` through a
`4rem` ceiling), with the same `1.5rem` gutter and `4rem`/`2rem` vertical
rhythm repeating nearly verbatim across Nav, Hero, ArticleLayout,
ProjectCard, and Footer. That narrow, undifferentiated range is the root
cause of the cramped feel.

**Decision:** Add a spacing token scale to `tokens.css`:

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.5rem;   /* 24px */
--space-6: 2rem;     /* 32px */
--space-7: 3rem;     /* 48px */
--space-8: 4rem;     /* 64px */
--space-9: 6rem;     /* 96px */
```

Every component with a hardcoded padding/margin/gap value is rewritten to
reference a token, not just have its existing value bumped. Overall vertical
rhythm moves up — the current ceiling (`4rem`, `--space-8`) becomes a
mid-scale value rather than the largest available, so hero/section-level
spacing has room to breathe above it (using `--space-9` where a section
needs to feel like a clear break, e.g. between Home's hero and the
featured-projects preview).

## 2. Card / Chrome Reduction

**Problem:** "Not simplistic enough" traced to visual chrome, not layout
density — specifically, container decoration (border, background fill,
shadow) on things like `ProjectCard` (`padding: 1.25rem`, border, card
background) that makes the page feel like boxes-within-boxes rather than
content floating in space.

**Decision:** Add one new neutral token to `tokens.css`, derived from the
existing text/bg tokens rather than a new hardcoded hex — this way it's
automatically hue-biased and automatically correct in both themes with no
separate light/dark value to maintain:

```css
--line: color-mix(in srgb, var(--color-text) 12%, var(--color-bg));
```

`ProjectCard` drops border, background fill, and shadow at rest — cards sit
directly in the page background, separated by the new spacing scale alone.
On hover/focus-within, a hairline top border (`var(--line)`) and a faint
background tint (`color-mix(in srgb, var(--color-text) 4%, var(--color-bg))`)
fade in, alongside a slight padding increase, over a ~150–200ms ease
transition. Structure appears only as an interaction cue.

This same "quiet at rest, structure on interaction" principle should guide
other content-card-like elements introduced later, but the concrete change
in scope right now is `ProjectCard`. Nav and footer are unaffected (see
Scope above).

## 3. Tetris Hero — Ambient Rework

**Problem, three parts, all confirmed against the current implementation
(`src/components/TetrisHero.astro`):**

1. No softening at all — opaque 120px board, solid `var(--color-text-secondary)`
   gridlines, zero opacity/blur/filter — reads as a literal, loud mini game
   board rather than a texture.
2. Every filled cell (ambient and real gameplay) renders as a single solid
   `var(--color-accent)` — no per-piece color variation.
3. The block sits flush inside the hero's flex row, directly beside the H1
   — not tucked into an actual corner, contrary to the original spec's own
   "hero corner" framing.

**Decision:**

- **Softening:** `filter: blur(1px)`, `opacity: 0.82` on the ambient grid
  container. (Landed on after comparing `blur(0.4px)/90%`,
  `blur(2.5px)/70%`, and this middle value directly.)
- **Position:** move out of the hero flex row into an actual corner of the
  hero section (e.g. absolutely positioned within the hero container, or a
  dedicated grid area), so it no longer sits adjacent to and competing with
  the headline.
- **Piece colors — muted 7:** replace the single solid-accent fill with a
  per-tetromino-type color map, desaturated/darkened from the standard
  tetris hues so they stay quiet next to the site's minimal palette:

  ```
  I  #6B9AA8   O  #C9A75C   T  #8B6B9E   S  #7A9B76
  Z  #B06B5F   J  #5C7FA6   L  #C08552
  ```

- **Real piece-type variety in the ambient loop:** the current ambient demo
  (`src/lib/tetris/ambientDemo.ts`) is a fixed, always-identical 5-step
  script that only ever spawns the O-piece (chosen because an earlier
  mixed-piece script could reach an unwinnable state) — this is also why it
  currently reads as mechanically uniform, independent of the color problem.
  Replace it with a lightweight heuristic auto-player: draw pieces from the
  existing 7-bag randomizer (`src/lib/tetris/bag.ts`, already implemented
  but unused by the ambient loop), and for each spawned piece, score every
  candidate `(column, rotation)` placement by holes-created + bumpiness +
  resulting stack height, choosing the lowest-cost placement greedily (no
  lookahead/search tree needed — this is the standard simple-AI approach and
  doesn't paint itself into a corner). Reset/clear on the same conditions as
  today when the board fills up.
- **Coloring now maps to true piece type** (not a drop-order-cycling
  workaround) since the heuristic player produces genuine piece-type
  variety.
- The real click-to-play overlay (`#tetris-board`) is unaffected by any of
  the above — still fully player-controlled, using the same muted-7
  per-piece-type color map for visual consistency between ambient and
  gameplay states.

## 4. Site-Wide Accent System

**Problem:** Beyond the single cobalt accent, the palette is exactly 5
tokens total (bg/text/accent/text-secondary/error) with zero use of maroon
or any other hue anywhere in the codebase — reads as monochrome regardless
of how the tetris rework turns out on its own.

**Decision:** Add three new accent tokens to `tokens.css`, constant across
both light and dark themes (same rationale as the existing cobalt accent —
brand consistency regardless of mode):

```css
--color-accent-maroon: #B06B5F;
--color-accent-clay:   #C08552;
--color-accent-moss:   #7A9B76;
```

These are drawn directly from the muted tetris piece palette (Z, L, and S
respectively) rather than invented independently — site accents and the
tetris rework read as one considered decision, not two unrelated color
choices. `--color-accent` (cobalt, `#3454D1`) is unchanged and remains the
primary accent.

**Usage rules:**

- Project tag chips (on `ProjectCard` and the article meta line) rotate
  through the four accent colors (cobalt + maroon + clay + moss), outlined
  pill style (`border: 1px solid currentColor`, no fill) — deterministic by
  tag name/category, not random, so a given tag always renders the same
  color.
- The featured-project badge stays cobalt-filled with white text — the one
  spot color is meant to draw the eye, and mixing badge colors would dilute
  that.
- Links and CTAs stay cobalt — the accent system adds range for
  categorization (tags), it isn't a general-purpose "make more things
  colorful" license.
- The card hover-reveal border/tint (see §2) stays neutral (`var(--line)`),
  never accent-colored — keeps the hover cue subtle rather than turning
  every hover into a color event.
- Capybara mascot fill color: minor call, likely `--color-accent-moss` or
  `--color-accent-clay` — left to the implementation plan, not decided here.

## Open Items for the Implementation Plan

- Exact heuristic weights for the ambient auto-player (holes vs. bumpiness
  vs. height coefficients) — tune during implementation, not worth
  specifying precisely here as long as it produces a visually varied,
  never-stuck loop.
- Exact hero-corner positioning technique (absolute vs. grid-area) — an
  implementation-level call, not a visual one.
- Capybara mascot's exact accent color pick (moss vs. clay).
- Tag-to-accent-color hashing scheme (e.g. hash tag string, or a maintained
  explicit map) — implementation's call, as long as it's deterministic.
- The board's cell state (`GameState.board` in `src/lib/tetris/engine.ts`)
  currently stores filled/empty as a boolean per cell, with no piece-type
  data retained after a piece lands. Per-piece-type coloring (both ambient
  and real gameplay) requires the engine to retain piece type per landed
  cell, not just a boolean — an engine-level change, not a new design
  decision, but flagged here since it touches shared game state rather than
  being purely a rendering change.
