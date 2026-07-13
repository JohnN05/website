# johnjng.com — Personal Website

## Purpose

John Ng's personal site. Intro + portfolio, revamped (2026) from a single-page
CRA SPA into a professional/minimal, multi-page site with dedicated space for
project write-ups and a couple of subtle hobby-inspired interactive details
(tetris, minesweeper, butterfly-knife-flip toggle, capybara mascot).

**Status:** initial rewrite implemented (16 tasks, PR #1), followed by
three refinement passes built on top: a visual refinement pass (15 tasks:
spacing scale, tag-accent colors, chrome-reduced cards, Tetris autoplay
heuristic, collapsible sidebar nav), a hero & nav refinement pass (8 tasks:
removed the redundant Home nav item and the rail's collapse/expand toggle
in favor of a permanently-expanded desktop rail, widened the Tetris ambient
layer into a full-hero-width background, parameterized board dimensions
sitewide), and a Tetris hero polish pass (8 tasks + one post-review
integration fix: SRS wall kicks + T-spin scoring, exact ambient cell
sizing, layered soft/crisp gradual blur, blocky-but-fast piece motion, a
build-up-before-clearing heuristic with a 50%-height reset floor, and
flash-before-clear), followed by a small post-merge bug-fix pass (3
commits, no plan doc — each was a user-reported visual bug fixed via
`superpowers:systematic-debugging` directly on `TetrisHero.astro`): a
stale falling-piece overlay left rendered on top of the grid during the
line-clear flash, the ambient piece visually scrambling instead of
rotating cleanly, and a `setTimeout`/CSS-transition race in the piece's
phase timers. Two further small passes followed, each with its own
spec/plan doc: removing the ambient demo's heuristic hole-heavy reset
entirely in favor of resetting only on a genuine top-out, and then
restoring a build-up-before-clearing heuristic (removed as part of that
same reset simplification) at a higher 75% threshold, relocated inside
`chooseBestPlacement` itself so it can't re-diverge across call sites the
way the original 50%-threshold version did. This file describes the site
as actually built, not just as planned. Every pass has hit the same
environment limitation in this
particular sandbox — no root access, missing Playwright's native
`libnspr4` dependency — so each pass's e2e suite needed a real-environment
run afterward; done for the rewrite and the first two refinement passes
(all Playwright/axe suites green there). The Tetris hero polish pass and
the post-merge bug-fix pass are the exceptions as of this doc update —
verified here via unit tests (72/72) and a clean production build only;
their Playwright suites still need that same real-environment
confirmation before merging to `main`.

Full design rationale: `docs/superpowers/specs/2026-07-11-website-revamp-design.md`
(original rewrite), `docs/superpowers/specs/2026-07-11-website-visual-refinement-design.md`
(visual refinement), `docs/superpowers/specs/2026-07-11-hero-and-nav-refinement-design.md`
(hero & nav refinement — the Tetris hero polish pass has no separate design
spec, only its own plan). Implementation plans (task-by-task, with exact
deviations disclosed): `docs/superpowers/plans/2026-07-11-website-revamp.md`,
`docs/superpowers/plans/2026-07-11-website-visual-refinement.md`,
`docs/superpowers/plans/2026-07-11-hero-and-nav-refinement.md`, and
`docs/superpowers/plans/2026-07-12-tetris-hero-polish.md`. Read each spec
for the "why" behind anything below; read each plan for the "how" and for
bugs found and fixed during implementation. Original rewrite: a dependency
version pin, an unwinnable Tetris ambient-demo script, Astro CSS-scoping
gaps, flaky/infinite-looping test fixtures, a CSS-cascade bug, two ARIA
violations caught by axe-core. Visual refinement: the capybara mascot's
`color` token was inert because its SVG is painted via `background-image`
(an isolated rendering context where `currentColor` can't resolve to the
host element) — fixed by switching to `mask-image` + `background-color`,
which does respect it. Hero & nav refinement: a project-grid double-padding
bug, an ambient-demo game-over reset that silently dropped custom board
dimensions back to the engine's 10x20 default, and an e2e test whose read
landed in an animation's brief empty-overlay gap by coincidence rather than
by margin. Tetris hero polish: two real bugs found in the plan's own
literal test/implementation code (a miscounted-holes test fixture and a
50%-reset-floor gate that checked the wrong side of a drop), plus one
integration bug the per-task reviews couldn't see until the whole branch
was reviewed together — the ambient piece's animated landing spot and its
committed landing spot could silently diverge below the build-up floor,
fixed by giving both call sites one shared source of truth for the
line-clear weighting decision. Post-merge bug-fix pass (see "Ambient piece
animation" below for the mechanics): three separate root causes behind
what looked like one recurring "piece isn't aligned to the grid" visual
bug — a DOM-clearing order bug, a data-shape mismatch, and a timer race —
each only reproducible by watching the live animation, not by unit tests
(this widget's DOM wiring is e2e-only per the architecture pattern above).
A follow-up small fix pass (spec:
`docs/superpowers/specs/2026-07-12-tetris-ambient-topout-only-reset-design.md`,
plan: `docs/superpowers/plans/2026-07-12-tetris-ambient-topout-only-reset.md`)
then removed the ambient demo's heuristic hole-heavy reset entirely, per
user report that it read as a random mid-stack restart — it now resets
only on a genuine top-out.

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

Desktop (`min-width: 769px`): `Nav.astro` renders a fixed-left icon+label
rail (`#nav-rail`), permanently expanded at `14rem` width — there is no
collapse/expand toggle, no `localStorage` persistence, and no `data-rail`
attribute. `#main-content`'s `margin-left` in `global.css` is a fixed offset
matching the rail width, not something toggled at runtime.

Mobile (`max-width: 768px`): `Nav.astro`'s rail is `display: none`;
`MobileNav.astro` (a separate, always-mounted component) renders a top bar
with a hamburger toggle (`#mobile-nav-toggle`) opening a link drawer
(`#mobile-drawer`), including its own `ThemeToggle` instance since the
desktop rail is off-screen at this width.

The mobile hamburger toggle gets its accessible name from a `.sr-only` span
(clip/absolute-positioned, not `display:none`, so it stays in the
accessibility tree) rather than `aria-label` — a deliberate pattern, not an
oversight.

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

Typography: **Bricolage Grotesque** (headlines, weight 600, using the
`opsz` optical-size axis) · **Source Serif 4** (article prose body text
only) · **Inter** (UI/interface copy — nav, buttons, forms) · **IBM Plex
Mono** (small labels: nav wordmark, eyebrows, article meta line).

## Hobby details — priority order

**Primary (most polish):** Tetris (ambient hero-background animation,
hidden click-to-play overlay, hidden below mobile breakpoint) and the
capybara mascot (article reading-progress indicator, speed scales with
scroll, collapses to resting pose at 100%). The ambient loop
(`src/lib/tetris/ambientDemo.ts`) no longer runs a fixed O-piece-only
script — it draws real pieces from the 7-bag randomizer
(`src/lib/tetris/bag.ts`) and picks each placement via a genuine (if
simple) heuristic AI (`src/lib/tetris/autoplay.ts`: `chooseBestPlacement`,
scoring candidate placements by holes/bumpiness/aggregate-height/lines-
cleared), so the animation shows real piece variety instead of a repeating
script. Piece type is preserved through to rendering (`TetrisHero.astro`'s
`renderBoard` sets `data-piece` per cell) and each of the 7 types gets its
own muted color — I/O/T/J via dedicated hex values, S/Z/L reusing the
site's moss/maroon/clay accent tokens directly.

`TetrisHero.astro` renders the board as a ~70%-width absolutely-positioned
background layer (`right: 0; width: 70%` of the hero, so its own left edge
sits at ~30% of the hero width — just past where the hero copy ends) behind
the hero copy (not a small corner widget). It's actually two duplicate board
layers stacked on top of each other for a gradual depth-of-field falloff,
driven by two `--tetris-mask-*` custom properties (shared by both the ambient
board layers and the falling-piece layers so they stay in lockstep). Both are
horizontal `mask-image` gradients whose stops are measured relative to the
container's own width, and the two are deliberately *separated* across that
width so the effect reads — an earlier revision collapsed both to the same
dead zone and the sharp layer covered the blurred one everywhere, killing the
blur entirely. `--tetris-mask-soft` (the blurred layer) starts at literal
`transparent` at the container's left edge with **no dead-zone step and no
opacity floor** — a nonzero first stop showed as a hard vertical seam — and
eases up (≈`t^1.4`) to full opacity by 90%, so it governs both where the
board appears and the whole left→right fade. `--tetris-mask-crisp` (the sharp
layer) holds a 42% dead zone, rises from zero on a quadratic ease, and only
overtakes the blur near the right edge (full by 92%). Net left→right: nothing
→ faint+blurred → brighter+blurred → full+sharp. Because a true CSS curve
can't be handed to `mask-image` directly (it only interpolates linearly
between stops), each curve is baked in as ~8–10 sampled `rgba(0,0,0,a)` stops.
This falloff was tuned iteratively against a live dev server and screenshots,
not derived analytically — the exact stop values are a hand-picked result,
not a formula to "correct." Cell size targets a
larger 44px per cell but is always computed exactly from the container's
real box plus the grid's 1px gaps (`cellW`/`cellH` in the component script)
rather than assumed from the target size directly — a prior version derived
cell size before measuring gaps and drifted out of alignment, cutting off
the rightmost column/row. Board cols/rows are computed from the container's
`clientWidth`/`clientHeight` at init (`ambientCols`/`ambientRows` in the
component script) rather than hardcoded to the engine's 10x20 default, so
`createAmbientDemo`/`stepAmbientDemo`/`createGame` all take explicit
cols/rows through every code path, including the demo's internal
game-over-reset branch. Each piece plays a real spawn → turn → fall
animation cycle (`#tetris-piece`, `.phase-turn`/`.phase-fall` CSS
transitions driven by `runAmbientCycle()`) instead of snapping directly
into its landing position; the real click-to-play board stays crisp and
un-animated in comparison, distinguishing decoration from gameplay.

**Ambient piece animation — three bugs found from one user report of "the
piece isn't aligned to the grid," each with a different root cause:**
1. The piece now *spawns already in its final rotation* rather than
   rotation 0 — `SHAPES` in `engine.ts` defines each of a piece's 4
   rotation states as an independently hand-authored array, not one shape
   rotated per cell index (e.g. the I piece's cell index 0 jumps from
   `(0,1)` to `(2,0)` between rotations 0 and 1), so animating `left`/`top`
   from a rotation-0 shape to the target rotation sent each of the 4 cell
   divs flying along its own unrelated diagonal — landing off-grid for the
   transition's mid-frames before snapping onto the grid at the end. With
   both ends of the turn phase holding the same rotation, every cell moves
   by one uniform `(dx, 0)`: a rigid horizontal slide, not a scramble.
2. The turn phase's `TURN_MS`/fall phase's `FALL_MS` `setTimeout` delays
   are chained *inside* the callback that actually starts their paired CSS
   transition (the `requestAnimationFrame` for the turn, the turn's own
   phase-switch callback for the fall) rather than scheduled from cycle
   start alongside it. `TURN_MS` (300) and `FALL_MS` (220) exactly equal
   their transitions' declared durations (`0.3s`/`0.22s`) with zero margin,
   but `requestAnimationFrame` doesn't fire until the next paint — so a
   timer anchored to cycle start could fire before the transition's final
   `steps(N, end)` jump landed, freezing the piece mid-slide for the rest
   of that phase. Worse the farther the piece had to travel, which is why
   S/Z (whose autoplay placements tend to need bigger horizontal jumps)
   showed it most visibly. `setTimeout` never fires early, so anchoring
   both clocks to the same instant removes the race.
3. The falling-piece overlay (`pieceSoftEl`/`pieceCrispEl`) is cleared
   immediately once `stepAmbientDemo` locks the piece into the board —
   *before* the clear-flash branch runs, not after. The locked piece is
   already baked into the board cells themselves (`preClearBoard`); leaving
   the overlay in place during the flash left a stale, un-flashing copy of
   the piece sitting on top of the grid for the whole flash duration, only
   visible long enough to notice because a non-clearing drop clears the
   overlay on the very next synchronous line anyway.

**Lower priority (simpler first pass is fine):** Minesweeper (the `/404`
page, needs its context line — see spec) and the butterfly-knife-flip
light/dark toggle.

The capybara, Minesweeper reveal, and butterfly-knife toggle all use
standard smooth CSS easing — a "stepped/frame-based" motion language across
all four details was tried and explicitly rejected as janky. The Tetris
ambient piece is a narrower, deliberate exception to that default (not a
reversal of it): its turn/fall transitions use CSS `steps()` timing instead
of smooth easing, snapping row-by-row for a blocky, snap-to-grid feel that
reads as more authentically Tetris — the fall phase in particular is sped
up (not just stepped) to feel like a piece being soft-dropped rather than
gliding down.

The ambient loop also plays real wall kicks and awards a T-spin score bonus
(`isTSpin` in `engine.ts`, gated on `GameState.lastMoveWasRotation`). It
resets only on a genuine top-out (`stepAmbientDemo`'s `result.gameOver` in
`ambientDemo.ts`) — an earlier heuristic reset for hole-heavy positions past
a 50%-height floor was tried and removed because it read as a random
mid-stack restart to a viewer rather than a real game over; hole-heavy
positions are now left standing indefinitely. Cleared rows flash a few times
before disappearing (`stepAmbientDemo`'s `clearedRows`/`preClearBoard`,
consumed in `TetrisHero.astro`'s `runAmbientCycle`).

Placement selection still favors building a visible stack before cashing in
line clears, restored at a higher 75% threshold (`BUILD_UP_HEIGHT_RATIO` in
`autoplay.ts`) after the reset-floor removal above stripped out its earlier
50%-threshold form. Rather than a duplicated external helper threaded through
two call sites (the shape that caused the animated-vs-committed-placement
divergence bug described in the Status section), the decision now lives
entirely inside `chooseBestPlacement` itself: it derives the build-up/cashing-in
weight from `state.board` via the already-exported `columnHeights`, so
`ambientDemo.ts`'s `stepAmbientDemo` and `TetrisHero.astro`'s
`runAmbientCycle` — which both already call `chooseBestPlacement(state)` with
no config — get the same weighting for the same piece by construction, with
no second value to keep in sync.

Wall kicks and T-spin scoring are shared engine behavior, not ambient-loop-
only: `engine.ts`'s `rotate()`/`lockPiece()` back both the ambient loop and
the real click-to-play overlay, so players can now wall-kick rotations that
previously failed and score a T-spin bonus on the real board too. This is
an intentional gameplay improvement, decided on deliberately rather than
gated behind a flag.

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

`tests/e2e/nav.spec.ts` covers the permanently-expanded desktop rail
(renders at the full `14rem` width, both links reachable and labeled, the
wordmark links home) and the mobile drawer (rail hidden below 769px,
hamburger opens the drawer, links reachable) — passing, along with the
rest of the Playwright suite, in a real browser environment.

## Repo history

Old CRA site's commit history is preserved — useful for content reference
(bio copy, past repo list) even after the rewrite.

## Workflow preferences

- Execute multi-task implementation plans in this repo with
  `superpowers:subagent-driven-development`: a fresh implementer subagent
  per task, a task-scoped reviewer after each (spec compliance + code
  quality), and one broad whole-branch review on the most capable
  available model once every task is done.
- Verify, don't just trust. When a subagent's fix touches production logic
  or deviates from a plan's literal code, or its safety classifier was
  unavailable for a given run, re-derive or re-run the claim independently
  before accepting it — this repo's plans have had genuine bugs in their
  own literal test/implementation code more than once (see the Status
  section above), not just implementer mistakes.
- Escalate, don't resolve. When a finding conflicts with what the plan's
  own text mandates — or when two of the plan's own requirements conflict
  with each other, as happened with Task 1's wall-kicks/T-spin change
  reaching the real click-to-play game despite a constraint saying it
  shouldn't — ask directly rather than picking a side unilaterally.
- `npm run test:all` (unit + build + e2e) is the real CI gate. This
  particular sandbox cannot launch a Playwright browser (missing
  `libnspr4`, no root) — treat that specific failure signature as a known
  environment limitation, not a regression, but always get a
  real-environment Playwright run before merging any branch built here.
- Cost-tier subagent models to the task, not the session default: a cheap
  model for tasks where the plan supplies literal code (transcription plus
  testing), a standard model once a task has real integration/behavioral
  judgment or a history of subtle bugs even with literal code given, and
  the most capable available model for the final whole-branch review.
- For visual/CSS work (the Tetris mask falloff, spacing, colors), confirm
  the intended look *before* touching component code: build a self-contained
  mock and publish it as an Artifact for the user to react to, iterate on the
  mock until they approve the exact curve/values, then port the approved
  result into the real component. Then stand up a dev server (`npm run dev`)
  so they can see it live in-context, and expect several rounds of eyeballed
  tuning — these values are hand-picked against screenshots, not computed.
- HMR is unreliable in this WSL2 sandbox because the repo lives on the
  Windows drive (`/mnt/c/...`), where inotify file-change events frequently
  don't fire — Vite/Astro then silently serves stale CSS and an edit "does
  nothing." Do NOT diagnose an unchanged-looking result as a bad value until
  you've ruled this out: after any edit, fully restart the dev server (kill +
  relaunch, optionally `rm -rf node_modules/.vite`), `curl` the served page
  and grep for a distinctive string from the new CSS to confirm it's actually
  being served, and have the user hard-refresh (Ctrl+Shift+R). Chasing this
  as a styling problem instead of a caching one already cost several wasted
  iterations once.
