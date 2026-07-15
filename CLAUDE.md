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
way the original 50%-threshold version did — plus one real-world follow-up
fix once a user reported the stack still wasn't visibly building: the
initial version merely zeroed the lines-cleared weight below 75%, which
looked right in isolation but changed nothing in practice, since clearing
a line already earns a large implicit reward through the heuristic's
aggregate-height term regardless of that weight; fixed by making the
below-threshold weight an active penalty instead of zero. One more single-bug
fix followed the same no-plan-doc pattern: a user reported that resizing the
window turned the ambient board's square cells into rectangles. Root cause —
found via `superpowers:systematic-debugging` — was that `ambientCols`/
`ambientRows`/`cellW`/`cellH` were computed once at load and never again; the
grid itself (`1fr` columns, auto-stretch rows) reflows to whatever container
size exists, so once the viewport's aspect ratio diverged from the load-time
one, column width and row height drifted apart independently. Fixed by
wrapping the setup in `setupAmbientBoard()` and re-running it from a
debounced `resize` listener, with an `ambientGeneration` counter so an
in-flight animation cycle detects a mid-cycle resize and bails instead of
racing the just-replaced board. A further no-plan-doc pass, following the
project's mock-first workflow preference below since it was pure layout/CSS,
fixed a related complaint that the Home hero's copy wrapped far more
aggressively on a narrower desktop window than at a wide one: both the
hero copy's `max-width` and the desktop rail's `width` were flat
percentages/fixed lengths tied to shrinking containers rather than holding
their wide-window size as a floor. Mocked in an Artifact (rail width and
hero-copy width sliders, tuned live against the user's own eyeballing) before
touching `index.astro`/`Nav.astro`/`global.css`; landed as `--rail-width:
clamp(9rem, 2.9rem + 12.68vw, 14rem)` (see Navigation below) and
`.hero-copy`'s `max-width: max(23rem, 40%)`. This file describes the site
as actually built, not just as planned. Every pass has hit the same
environment limitation in this
particular sandbox — no root access, missing Playwright's native
`libnspr4` dependency — so each pass's e2e suite needed a real-environment
run afterward; done for the rewrite and the first two refinement passes
(all Playwright/axe suites green there). The Tetris hero polish pass, the
post-merge bug-fix pass, and this resize fix are the exceptions as of this
doc update — verified via unit tests, a clean production build, and (for the
resize fix) confirming the dev server actually served the updated bundle,
since this sandbox has no Chrome binary for either browser-automation MCP
tool either; their Playwright suites still need a real-environment
confirmation before merging to `main`. One more no-plan-doc pass, on
direct user request, then removed the Tetris hidden click-to-play overlay
(the real playable game triggered by clicking the ambient hero animation)
entirely: the ambient hero animation alone was judged enough to convey the
hobby, so the trigger button, modal overlay/panel, on-screen board, score
display, touch controls, and their DOM wiring (`openOverlay`/`closeOverlay`,
gravity timer, keyboard game controls, focus trap) were all deleted from
`TetrisHero.astro`, along with the now-unused `createGame`/`moveLeft`/
`moveRight`/`rotate`/`softDrop`/`hardDrop`/`createBag` imports — the ambient
animation only ever needed `landingRow`/`cellsFor` from `engine.ts` plus
`createAmbientDemo`/`stepAmbientDemo`/`chooseBestPlacement`, all of which
stay. `engine.ts`'s and `bag.ts`'s full API is untouched (still exercised by
their own unit tests) since the deletion only removed *callers* in
`TetrisHero.astro`, not the underlying logic. Verified via unit tests (71/71)
and a clean production build (output JS for this component's bundle dropped
from ~12KB to ~7.5KB, consistent with the removed code); this sandbox still
can't run Playwright, so the e2e suite (its one overlay-specific test
deleted from `tests/e2e/tetris.spec.ts`) still needs a real-environment
confirmation before merging to `main`. One more no-plan-doc pass, on direct
user request, added a "JOHN NG" nameplate button above the Home hero's
eyebrow line (`index.astro`), addressing feedback that it wasn't obvious
whose portfolio the site was until scrolling to the bio section. Followed
the project's mock-first workflow preference below through several rounds
in an Artifact — initials-only coloring beat a few louder alternatives,
then a Syne/Unbounded/etc. font survey, then an animation survey — landing
on: **Unbounded** (a blocky/grid-native variable face, added to the
existing Google Fonts `css2` link in `BaseLayout.astro` rather than
self-hosting, matching how the other four typefaces already load) at
800 weight; only **J** and **O** carry color, because they're the only
letters in "JOHN NG" that are also real tetromino letters (I/O/T/S/Z/J/L),
each using that exact piece's hue — not "first letter of each word," which
read as arbitrary in review. `--tetris-i/o/t/j` moved from being redeclared
locally inside `TetrisHero.astro`'s `.tetris-hero` rule to `tokens.css`'s
`:root`, so the nameplate and the ambient board read the literal same
values instead of two copies that could drift. The click/load flash effect
does *not* use CSS `@keyframes` (an earlier Artifact-only draft did, and
hit a real bug there worth recording: restarting a pseudo-element's
animation via `el.style.animation = 'none'` from JS silently no-ops,
because JS can only set inline styles on real elements, never on
`::before`/`::after` — so "replay" only ever restarted the letter's own
color transition, never the flash block layered on top of it, which is
why replay visually looked like the name fading rather than flashing).
The real component instead reuses `TetrisHero.astro`'s own `flashRows()`
pattern verbatim — a `setTimeout`-driven `classList.toggle('flashing')`
loop, same `FLASH_CYCLES`/`FLASH_INTERVAL_MS` constants — which sidesteps
that whole bug class since there's no CSS animation to restart, just a
class toggle, and happens to make the nameplate's flash read as the same
motion language as the board's own line-clear flash rather than a
separately-invented effect. The flash overlay itself is a fixed `#ffffff`,
not `var(--color-bg)` like the board's flash, since the nameplate isn't
sitting inside a grid of alternating cells the way the board is — a
token-driven flash there would either blend into the page or flash navy
in dark mode instead of reading as a flash. A second real bug, caught only
by watching a live re-render rather than reading the code: the space
between "JOHN" and "NG" is its own `.ch` span (for equal flex-cell width),
and giving it the same treatment as the letter spans made an empty white
block flash where there was no letter — excluded via `:not(.sp)`. A third,
accessibility-only issue caught during the same pass: that space span had
no actual space character in it (width came from CSS `min-width` alone),
so the button's accessible name would have concatenated to "JOHNNG" — an
`&nbsp;` inside the span fixes this without needing an `aria-label`
override, keeping the accessible name the literal visible text rather than
a maintained duplicate of it. Verified via unit tests (71/71, unaffected —
this feature has no pure `src/lib/` logic, matching the architecture
pattern's expectation that DOM-only widgets are e2e-covered, not
unit-covered) and a clean production build confirming all 7 letter/space
spans and the promoted tokens render in the output; this sandbox still
can't run Playwright, so — as with every pass above — a real-environment
e2e run is still needed before merging to `main`, and no new Playwright
spec was added for this pass specifically (nothing here changes nav,
a11y-tree shape beyond the accessible-name fix already covered by the
`&nbsp;`, or any existing covered flow).

Two more no-plan-doc passes followed, both on direct user request. The
first replaced the Home bio's vaguer/partly-unverified copy and retired the
single meta project write-up (about rebuilding this site itself) in favor
of three real project stubs — Terp Rater, Movement Map, and the Echtralex/
Lexicography capstone, each `featured: true` with a placeholder "full
write-up in progress" body pending real articles — plus a new standalone
Teaching section (Nobel Explorers, CSA leadership) that had previously been
compressed into a single bio line. The second removed the article
reading-progress capybara mascot entirely (`CapybaraProgress.astro`,
`lib/capybara.ts` + its test, the `capybara-run` keyframe, its usage in
`ArticleLayout.astro`, and the accessibility e2e's paired reduced-motion
check) — no replacement progress indicator was added. The footer's
capybara easter egg is a separate, self-contained component with no shared
code or assets, and was untouched by this. Verified via unit tests (71/71)
and a clean production build for both passes; as with every pass above,
this sandbox can't run Playwright, so a real-environment e2e run is still
needed before merging to `main`.

A further no-plan-doc pass, on direct user request ("more minimal and
spacy"), reworked Home's section rhythm. Followed the project's mock-first
workflow preference through several rounds in an Artifact: hero/bio/
featured/teaching each hold `min-height: 90vh` with `display: flex;
align-items: center` rather than content-driven height, deliberately
leaving ~10vh of the next section visible below the fold on first load (a
"peek," meant as a future scroll-reveal hook) instead of exactly filling
the viewport. Vertical section padding moved from `--space-9` (6rem) to a
new `--space-10` (9rem) token in `tokens.css`; the hairline `border-top`
dividers between sections were dropped entirely. Bio's two detail
paragraphs collapsed into one, and the dropped "Secondary Education minor"
line was folded into the eyebrow instead of lost; teaching's two detail
lines similarly merged into one. In place of the dividers, each section now
carries a subtle background wash — not an invented palette, but this
codebase's own `ACCENT_ORDER` (`src/lib/tags.ts`: cobalt, maroon, clay,
moss, the same sequence already deciding tag-chip colors sitewide) mapped
1:1 against reading order via four new `--wash-*` tokens in `tokens.css`
(each a `color-mix` of `--color-bg` and its accent at a `--wash-mix: 12%`,
defined once in `:root` and recomputing correctly under
`:root[data-theme='dark']` with no separate override, since custom
properties resolve at point of use). A first version alternated only two
flat colors and hit a real sizing bug worth recording: `box-sizing:
border-box` means a section's padding is *inside* its `min-height`, so a
short section (hero) hit its peek correctly but a copy-heavy section (bio,
teaching) could push content+padding past `90vh` and show no peek at
all — flat color alone made that invisible. The fix wasn't more precise vh
math (fighting variable copy length indefinitely); it was `.seam`, a
10rem-tall `position: relative; z-index: 1` band with negative
top/bottom margins straddling each section boundary, filled with a
`linear-gradient` between the two sections' wash colors and `filter:
blur(40px)` — the blurred gradient reads as a soft tonal drift regardless
of exact pixel heights, and the same blur-band device carries the wash back
out to plain `--color-bg` before `Footer.astro`, which stays completely
unchanged (it lives in the shared `BaseLayout` on every route — projects,
articles, contact, 404 — none of which have a wash sequence leading into
it, so tinting the footer itself would only have made sense on Home).
Verified via unit tests (67/67, unaffected — this pass has no `src/lib/`
logic) and a clean production build; confirmed the change was actually
being served (not stale WSL2 HMR) by restarting the dev server fresh and
`curl`-checking for the new wash/seam classes and trimmed copy in the
response body, since this sandbox has no Chrome binary for either
browser-automation MCP tool to take a real screenshot with. As with every
pass above, a real-environment Playwright run is still needed before
merging to `main`.

One immediate user-reported follow-up fixed a real bug in that pass: the
teaching→footer `.seam` bleeds 5rem into the footer's own box by design
(that's what makes the wash fade out gradually instead of stopping dead at
the boundary), but `Footer.astro`'s capybara caption text has no `z-index`
of its own, so it stacked at the footer's ambient level and rendered
*underneath* the seam's opaque blurred gradient instead of on top of it —
illegible exactly where the two overlapped. Fixed with one rule:
`.site-footer` now carries `position: relative; z-index: 2`, above the
seam's `z-index: 1`, so the footer's real content always paints over any
decorative wash bleeding into it from above, regardless of DOM order.
Doesn't touch the seam or wash system at all — footer stays unaware of
either, per the same "footer doesn't need to know about the wash" reasoning
as the original pass. Verified via a clean production build and unit tests
(67/67, unaffected).

A further pass (spec: `docs/superpowers/specs/2026-07-14-projects-contact-parity-design.md`,
plan: `docs/superpowers/plans/2026-07-14-projects-contact-parity.md`) brought
`/projects` and `/contact` up to Home's visual identity — both pages had
been left as a bare `h1` plus a minimally-styled block while every
refinement pass above polished Home. Mocked first in an Artifact (the
project's established visual-work-first workflow), then implemented via
`subagent-driven-development`, reusing existing tokens only: `/projects`
gained an intro band (`--wash-featured`, the same clay tint Home's own
Featured-projects section already uses, with a `.seam` fading to flat
`--color-bg` before the grid — a smaller-scale instance of `index.astro`'s
own seam mechanism, not a new pattern); `ProjectCard.astro` gained a
generated cover (no project has a real `cover` image yet, so each card
gets a `color-mix` tinted block using `accentForTag(project.tags[0] ??
project.title)` plus the title's first letter as a low-opacity IBM Plex
Mono glyph — the same "colored single letter as identity" move the Home
nameplate already uses for J/O, generalized to any title); `/contact`
became a Bio-style split two-column layout (`--wash-hero` — cobalt, the
site's primary-action color — with one seam before the footer, mirroring
Home's teaching→footer seam); and `ContactForm.astro` got a pure restyle
(border-radius, `--line` borders, a real `:focus-visible` ring matching the
nameplate button's, Inter labels) with its submit `<script>` byte-for-byte
unchanged. The whole-branch review caught one real integration bug no
single task's diff could see: `ProjectCard.astro` is also rendered by
Home's own Featured-projects section, so the new cover silently leaked
onto Home too — a page explicitly out of scope for this pass. Fixed with
an opt-in `showCover` prop (default `false`); only `/projects` passes
`showCover={true}`, and Home's own `<ProjectCard>` call site is untouched,
so its Featured cards render exactly as before. Verified via unit tests
(67/67, unaffected — no `src/lib/` logic touched) and a clean production
build; as with every pass above, this sandbox can't run Playwright, so a
real-environment e2e run is still needed before merging to `main` — that
run will also surface a pre-existing, unrelated stale assertion in
`tests/e2e/projects.spec.ts` (asserts exactly 1 project; 4 non-draft
projects exist today, added in an earlier undocumented pass that never
updated this test).

The sandbox's missing-`libnspr4`/no-root limitation referenced throughout
this doc is now resolved for this machine (not portable to a fresh
checkout elsewhere): Chromium's own binary needs `libnspr4`/`libnss3`/
`libasound2` at the OS level, which `apt install` can't provide without
root, separately from Playwright's own browser download (already present
and unaffected). Fixed by extracting those packages' `.deb`s user-locally
(`dpkg-deb -x`, no root needed) into `~/.local/lib/playwright-deps` and
prefixing `LD_LIBRARY_PATH` onto the `test:e2e`/`test:all` scripts in
`package.json`, rather than mutating any global shell config. This let a
Playwright suite actually run in this sandbox for the first time since the
original rewrite and the first two refinement passes — every pass listed
above from the Tetris hero polish pass onward had only ever been verified
via unit tests and a clean build, never a real browser, and that first
real run surfaced real, previously-invisible issues: a genuine mobile
production bug (`global.css`'s `html { scroll-snap-type: y mandatory }`
combined with Home's four `scroll-snap-align: start` sections had no snap
point at the true top of the document, so mobile page loads force-snapped
scroll position past `MobileNav.astro`'s top bar, hiding the hamburger
toggle above the fold on first load — fixed by giving `.mobile-nav` its
own `scroll-snap-align: start` so position 0 is itself a valid snap
target); several tests that had drifted from the app entirely (the two
`#capybara` tests in `article.spec.ts` testing a mascot already fully
removed per an earlier pass — despite that pass's own note above claiming
its paired e2e check was deleted, it wasn't — deleted now; the reduced-
motion Tetris check in `accessibility.spec.ts` referencing a `#tetris-
ambient` id that no longer exists, split into `-soft`/`-crisp` during the
depth-of-field pass, updated to check `-crisp`; and `home.spec.ts`'s own
stale project-card count alongside the already-known one in
`projects.spec.ts`); and two genuinely flaky `tetris.spec.ts` timing
tests, only exposed by real browser timing rather than a logic bug in
`TetrisHero.astro` itself — both tests anchored their sampling waits to a
wall-clock offset from `page.goto()` rather than to the ambient loop's own
animation-cycle clock, which drift apart under real page-load latency
(font loading, hydration) and, it turned out, even ordinary Playwright↔
browser IPC round-trip time was enough on its own to blow past a 300ms
phase boundary. Fixed by moving each test's whole synchronize-then-sample
sequence into a single `page.evaluate()`, synchronizing to the actual
phase-fall→phase-turn transition via an in-page `MutationObserver` instead
of Node-side `toHaveClass` polling (which is itself level-triggered and
adds its own latency), and — since even that isn't a substitute for
proving two reads landed on the *same* spawned piece — adding a small
test-only production hook: `pieceCycle`/`data-cycle` on `#tetris-piece`,
bumped once per `runAmbientCycle()` call, asserted equal across both
reads. One more real (if trivial) finding once cross-cycle drift was
eliminated: two reads of the same unchanged CSS pixel value straddling a
layout/paint pass can serialize to slightly different floating-point
strings in Chromium (~0.0003px observed) — both tests now compare parsed
floats with `toBeCloseTo(…, 2)` rather than exact string/deep equality,
still tight enough to catch a real scramble-into-rotation bug (which would
differ by whole cells, not thousandths of a pixel). All of the above
verified via a real `npm run test:all` in this sandbox: 67/67 unit tests,
a clean production build, and all 33 Playwright/axe e2e tests green.

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
  islands that need interactivity (Tetris widget, light/dark toggle,
  Minesweeper board). The footer's capybara easter egg is pure CSS (hover-
  triggered caption animation) — no script, so it isn't one of these.
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
  `tetris/engine.ts` + `tetris/bag.ts` + `tetris/ambientDemo.ts`,
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
rail (`#nav-rail`), permanently expanded — there is no collapse/expand
toggle, no `localStorage` persistence, and no `data-rail` attribute. Its
width is fluid rather than a flat `14rem`, though: both `.rail`'s `width`
here and `#main-content`'s `margin-left` in `global.css` read a single
`--rail-width` custom property (`clamp(9rem, 2.9rem + 12.68vw, 14rem)`,
defined once inside `global.css`'s own `min-width: 769px` block) rather than
each hardcoding `14rem` independently — two call sites computing the same
value from independent formulas is exactly the shape of bug this codebase
already hit once with the Tetris ambient piece's animated vs. committed
placement (see Status above), so this uses one shared source instead. The
rail holds its full `14rem` from a 1400px-wide viewport upward, then narrows
toward a `9rem` floor as the viewport shrinks toward the 769px breakpoint,
where it disappears entirely in favor of the mobile drawer below.

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
Mono** (small labels: nav wordmark, eyebrows, article meta line). A fifth
face, **Unbounded** (weight 800), is scoped to exactly one place — the
Home hero's "JOHN NG" nameplate button (see Status above) — rather than a
general role like the other four; loaded through the same Google Fonts
`css2` link as the rest, not self-hosted separately.

## Hobby details — priority order

**Primary (most polish):** Tetris (ambient hero-background animation only —
there is no playable overlay; hidden below mobile breakpoint). The article
reading-progress capybara mascot (`CapybaraProgress.astro`, `lib/capybara.ts`)
was removed per direct user request — no replacement progress indicator was
added, since the browser's own scrollbar already conveys position and this
capybara wasn't the only cue. The footer's capybara easter egg (a separate,
self-contained component with no shared code) is untouched. The ambient loop
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
game-over-reset branch. That computation — cols, rows, `cellW`, `cellH`, and
the board reset — lives in `setupAmbientBoard()`, which also reruns from a
debounced `window.resize` listener: the grid's own sizing (`1fr` columns,
auto-stretch rows) reflows to any container box on its own, so leaving
cols/rows frozen at their load-time values let a viewport resize skew the
container's aspect ratio away from what those counts were chosen for,
turning square cells into rectangles. An `ambientGeneration` counter lets a
`runAmbientCycle()` animation already in flight when a resize lands detect
that its board was just replaced and bail instead of continuing to animate
into stale coordinates. Each piece plays a real spawn → turn → fall
animation cycle (`#tetris-piece`, `.phase-turn`/`.phase-fall` CSS
transitions driven by `runAmbientCycle()`) instead of snapping directly
into its landing position.

The hero copy sharing this section (`index.astro`'s `.hero-copy`) has the
same fixed-vs-fluid consideration as the rail above: its desktop `max-width`
is `max(23rem, 40%)`, not a plain percentage, so the copy column holds a
fullscreen-derived floor width — and therefore wraps the same way it does at
a wide window — as the window narrows, only yielding back to the 40% figure
once the window is narrow enough that holding the floor would run text
under the Tetris board.

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

Below the threshold, a clear is actively *penalized* (`BUILD_UP_CLEAR_PENALTY`,
a negative `linesClearedWeight`), not just left unweighted — an initial
zero-weight version looked correct in isolation but changed nothing in
practice, confirmed by instrumenting a real ambient run: `scoreResult`'s
`aggregateHeight` term already rewards a clear on its own (it drops the
entire stack by a row across every column), so a merely-zeroed bonus never
had to fight anything and the demo kept cashing in the first available line
regardless of stack height. Only a real penalty makes "keep building" the
better-scoring choice below 75%. Confirmed against a real run: `tall`
now flips true ~40% of the time over a long stretch (0% before the penalty),
with stack height peaking near 95% before a top-out reset, versus never
crossing ~70% before.

Wall kicks and T-spin scoring live in `engine.ts`'s `rotate()`/`lockPiece()`,
backing the ambient loop's autoplay. (They previously also backed a real
click-to-play overlay triggered by clicking the ambient animation, removed
per direct user request — see Status above — since the ambient animation
alone was judged enough to convey the hobby; `engine.ts`'s full game-logic
API is otherwise untouched.)

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

`prefers-reduced-motion` fallbacks for the remaining hobby details, full
keyboard operability for Minesweeper (the only one that's actually
playable — Tetris is purely decorative, see Hobby details above), visible
focus states sitewide, skip-to-content link, and `aria-hidden` on
purely-decorative details (Tetris ambient animation, the footer's capybara
easter egg).

Minesweeper's board uses proper ARIA containment (`role="grid"` →
`role="row"` → `role="gridcell"`, with `display: contents` on the row
wrapper so the wrapper doesn't disturb the CSS Grid visual layout) rather
than flat `role="grid"` → `<button>` children, which axe-core flags as
`aria-required-children`. Minesweeper cells convey state via `aria-label`
only (not `aria-pressed`, which isn't a permitted attribute on `gridcell`).

Verified sitewide by `tests/e2e/accessibility.spec.ts`: an
`@axe-core/playwright` sweep (no serious/critical violations) and a
skip-link-is-first-tab-stop check on all 5 routes, plus a targeted
reduced-motion check (Tetris ambient loop freezes on a static frame) — this
is the suite that actually caught the ARIA containment bugs above during
implementation. (Its former second reduced-motion check, for the
now-removed reading-progress capybara, was deleted along with the
component.)

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
  sandbox's Chromium binary previously failed to launch (missing
  `libnspr4`/`libnss3`/`libasound2`, no root for `apt install`) — now
  fixed on this machine only via a user-local lib extraction plus a
  scoped `LD_LIBRARY_PATH` in `package.json` (see Status above), so
  `npm run test:e2e` actually runs here now. That fix is local-machine
  state, not something a fresh checkout inherits — if a from-scratch
  environment hits the same missing-`libnspr4` signature, treat it as
  that known limitation rather than a regression, and either redo the
  same local fix or fall back to a real-environment Playwright run before
  merging.
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
