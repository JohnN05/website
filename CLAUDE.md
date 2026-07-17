# johnjng.com — Personal Website

## Purpose

John Ng's personal site. Intro + portfolio, revamped (2026) from a single-page
CRA SPA into a professional/minimal, multi-page Astro site with dedicated
space for project write-ups and a few subtle hobby-inspired interactive
details (Tetris, Minesweeper, butterfly-knife-flip toggle, capybara easter
egg). This file describes the site as actually built, not just as planned.

**Status:** feature-complete through a full design-review pass; only review
item 8 (a small residual typography-contrast audit — see
`docs/2026-07-16-design-review-next-steps.md`) is still open. Verified via
`npm run test:all` (typecheck + unit + build + e2e/axe) in a real browser;
CI (`.github/workflows/ci.yml`) runs the same gate on every push/PR. All work
lives on `worktree-website-revamp`, not yet merged to `main`.

Major passes, each building on the last (full task-by-task detail and bugs
found live in `docs/superpowers/plans/*.md`; smaller passes ran directly off
user feedback with no plan doc and are described inline below where they
touch a specific component):

1. Initial rewrite — CRA → Astro multi-page site.
2. Visual refinement — spacing scale, tag-accent colors, chrome-reduced cards,
   Tetris autoplay heuristic, collapsible sidebar nav.
3. Hero & nav refinement — permanently-expanded desktop rail, full-hero-width
   Tetris background.
4. Tetris hero polish — SRS wall kicks + T-spin scoring, layered blur
   depth-of-field, blocky piece motion, build-up-before-clear heuristic.
5. A string of small no-plan-doc passes: removed the Tetris click-to-play
   overlay (ambient animation alone now conveys the hobby), added the "JOHN
   NG" nameplate, retired the article reading-progress capybara mascot,
   reworked Home's section rhythm into wash/seam bands, and brought
   `/projects` + `/contact` to visual parity with Home.
6. Home scroll-motion — replaced an earlier scroll-lock experiment (its
   spec/plan are historical only; the feature itself was removed) with
   parallax + reveal-on-entry, since the two couldn't coexist: parallax only
   reads as depth under continuous scroll coupling, which the lock severed.
7. Rail/hero wordmark piece-reveal (`PieceMark.astro`) — the "JOHN NG" mark
   reveals its J and O as real tetrominoes.
8. A six-part design-review pass (tracked in
   `docs/2026-07-16-design-review-next-steps.md`): balisong theme toggle
   rebuild, featured-card covers + hover piece-drop, a teaching impact row,
   Home's `TetrisWell` scroll-well, an image-led article header, a bio-portrait
   piece dissolve, a T-spin contact-send animation, a `/404` + Minesweeper
   redesign, and a `/projects` featured-row hierarchy.

A whole-branch review after pass 6 caught three real usability bugs no test
had caught: every non-Home route was unscrollable on mobile (a scroll-snap
rule scoped sitewide when only Home authored snap targets), dark mode was
unreachable on mobile (two `ThemeToggle` mounts sharing one `id`, so
`getElementById` only ever bound the hidden desktop one), and the rail's
theme toggle was unclickable at the bottom of any desktop page (the footer,
a sibling of `#main-content`, never got the rail's width offset, then won
hit-testing once it gained `z-index` for an unrelated reason). All three are
fixed; the resulting rules are noted in Navigation and Accessibility below —
don't reintroduce any of them piecemeal.

## Stack

- **Astro** — static-first site generator. Zero JS by default; only hydrate
  islands that need interactivity (ambient Tetris board, theme toggle,
  Minesweeper board, contact form, the piece-reveal wordmark). The footer's
  capybara easter egg is pure CSS (hover-triggered), no script.
- **MDX content collections** — each project article is one `.mdx` file under
  `src/content/projects/`. Astro derives the route slug from the filename.
  Adding a new project = add one file, no code changes.
- Deployed on Netlify. Contact form uses Netlify's built-in static form
  handling — no backend/serverless functions anywhere in this stack.
- Previous stack was Create React App — fully replaced, not incrementally
  patched. Old repo history (pre-rewrite) is kept for content reference only.
- **TypeScript strict**, **Vitest** (+ happy-dom) for pure `src/lib/` logic,
  **`@playwright/test`** + **`@axe-core/playwright`** for e2e/accessibility.
  `npm run typecheck` (`astro sync && tsc --noEmit` — plain `tsc` fails on a
  fresh checkout because `astro:content` types only exist after `astro sync`
  runs), `npm test` (unit), `npm run build`, `npm run test:e2e`, or
  `npm run test:all` (all four in sequence — the real CI gate).

## Architecture pattern

Every interactive widget splits into two layers:
- **Pure logic** in `src/lib/` (`theme.ts`, `projects.ts`, `contactForm.ts`,
  `tags.ts`, `parallax.ts`, `nameplate.ts`,
  `tetris/engine.ts` + `tetris/bag.ts` + `tetris/autoplay.ts` +
  `tetris/ambientDemo.ts`, `minesweeper/engine.ts`) — no DOM, no I/O, fully
  unit-tested with Vitest.
- **DOM wiring** in the matching `.astro` component's `<script>` block —
  imports the pure module, renders/re-renders the DOM, handles events.
  Covered by Playwright e2e, not unit tests.

Two silent-failure traps in Astro's CSS scoping, both worth checking against
any new component:

- **Runtime-created elements never get scoped.** Astro scopes `<style>` by
  stamping a `data-astro-cid-*` attribute at build/render time; anything
  created via `document.createElement` (all the widget grids: `TetrisHero`,
  `TetrisWell`, `MinesweeperBoard`) never receives it, so rules targeting
  those elements need `:global()`. Forgetting it renders an unstyled grid,
  not an error.
- **A class passed as a prop to a child does not carry the parent's scope.**
  `<PieceMark class="rail-wordmark" />` styled from `Nav.astro`'s own
  `<style>` silently never matches — Astro stamps `PieceMark`'s cid on the
  mark's root, not `Nav`'s. Style a wrapper the parent actually authors
  instead (`.rail-home` etc., inherited into the child), or use `:global()`
  if you really mean to leak the selector sitewide.

## Site map

`/` (home, hero + featured-projects preview) · `/projects` (index, newest
project as a full-width featured row) · `/projects/[slug]` (article) ·
`/contact` (Netlify Forms) · `/404` (Minesweeper board).

## Navigation

Desktop (`min-width: 769px`): `Nav.astro` renders a fixed-left icon+wordmark
rail (`#nav-rail`), permanently expanded — no collapse/expand toggle, no
`localStorage`, no `data-rail` attribute. Its width is fluid: `--rail-width`
(`clamp(9rem, 2.9rem + 12.68vw, 12rem)`, defined once in `global.css`) drives
the rail's own `width` *and* `#main-content`'s and `.site-footer`'s
`margin-left`, rather than each hardcoding the value independently.
`.site-footer` needs that offset explicitly because it's a **sibling** of
`#main-content` in `BaseLayout`, not a child, so it doesn't inherit it —
without it the footer spans full-width under the fixed rail and can win
hit-testing over the rail's controls once it has its own `z-index` (it does,
`z-index: 2`, so its capybara caption paints above Home's blurred `.seam`).
Fix footer/rail overlap issues with the offset, not by touching either
element's `z-index` — that reopens whichever bug the current values close.

Both `ThemeToggle` mounts (rail + mobile drawer) bind by **class**, never by
`id`: Astro bundles a component's `<script>` once per page no matter how many
times it's mounted, so an `id`-based lookup only ever binds the first
instance and leaves the rest silently dead.

The rail's (and mobile bar's, and Home hero's) name is one shared
`PieceMark.astro` instance rendering "JOHN NG" in Unbounded, whose J and O
reveal as real tetrominoes — see Hobby details. Which instance performs on a
given page is a `data-owns` flag set from the route (`Nav.astro` computes
`isHome`): the hero performs on `/`, the rail performs everywhere else.

Mobile (`max-width: 768px`): the rail is `display: none`; `MobileNav.astro`
(a separate, always-mounted component) renders a top bar with a hamburger
toggle (`#mobile-nav-toggle`) opening a link drawer (`#mobile-drawer`),
including its own `ThemeToggle` instance. The toggle's accessible name comes
from a `.sr-only` span (clipped, not `display:none`, so it stays in the a11y
tree) rather than `aria-label` — deliberate, not an oversight.

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
flagged, falls back to latest N by date. `/projects`' featured row is
unrelated: it's always `projects[0]` after sorting by date, regardless of the
`featured` flag. `draft: true` hides an entry from `/projects` and Home
without deleting it — that's how `_template.mdx` stays in the repo as a
non-live "copy this file" starting point.

## Visual design tokens

| Role | Light | Dark |
|---|---|---|
| Background | `#FAF7F0` (ivory) | `#0F1E3D` (navy) |
| Text primary | `#0F1E3D` (navy) | `#FAF7F0` (ivory) |
| Accent (cobalt) | `#3454D1` | same |
| Accent (maroon) | `#B06B5F` | same |
| Accent (clay) | `#C08552` | same |
| Accent (moss) | `#7A9B76` | same |
| Text secondary | `#4A5468` (slate) | `#9AA7B8` |
| `--line` (hairline dividers) | `color-mix(in srgb, var(--color-text) 12%, var(--color-bg))` | recomputes per-theme |

Two independent color systems, easy to conflate:

- **Tag/project accents** (`accentForTag(tag): 'cobalt' | 'maroon' | 'clay' |
  'moss'` in `src/lib/tags.ts`) hash a tag string so the same tag always
  renders the same color everywhere it appears (tag chips, generated project
  covers, article meta line) — no maintained lookup table.
- **Piece/wash tokens** (`tokens.css`) bind each Home section to a canonical
  Tetris hue: `--piece-j` (blue, hero), `--piece-o` (gold, bio), `--piece-l`
  (orange, featured), `--piece-i` (teal, teaching). Each `--wash-*` is
  `color-mix(--color-bg, its --piece-*, 18%)` — the section background, the
  `TetrisWell` piece dropped for that section, and the piece color are the
  same value by construction, not independently chosen. Canonical I is teal,
  not green (tried and rejected as non-canonical).

Spacing scale (`src/styles/tokens.css`): `--space-1` (0.25rem) through
`--space-9` (6rem), plus `--space-10` (9rem, Home's section vertical
padding). Not redefined per-theme.

Typography: **Bricolage Grotesque** (headlines, weight 600) · **Source Serif
4** (article prose only) · **Inter** (UI copy) · **IBM Plex Mono** (small
labels: eyebrows, article meta line) · **Unbounded** (weight 800, the "JOHN
NG" mark only, via `PieceMark.astro`, which owns the face itself). All five
load through one Google Fonts `css2` link in `BaseLayout.astro`.

## Hobby details

**Tetris ambient hero** (`TetrisHero.astro` + `src/lib/tetris/*`) — decorative
only, no play overlay. Real 7-bag randomization (`bag.ts`) and a genuine
heuristic AI (`autoplay.ts`'s `chooseBestPlacement`, scoring by holes,
bumpiness, aggregate height, and lines cleared) choose each placement, so the
animation shows real variety. Below a 75% stack-height threshold
(`BUILD_UP_HEIGHT_RATIO`), a clear is actively *penalized* rather than merely
unweighted — a zero-weight version looked right in isolation but changed
nothing, since a clear's height drop already scores well on its own; that
weighting decision lives entirely inside `chooseBestPlacement` (derived from
`state.board`) so `ambientDemo.ts` and `TetrisHero.astro` share one source of
truth instead of two call sites that could silently diverge. Wall kicks and
T-spin scoring (`isTSpin`/`rotate`/`lockPiece` in `engine.ts`) back the
ambient loop; the board resets only on a genuine top-out, not a heuristic
"this looks bad" reset (tried once, read as a random restart). Cleared rows
flash before disappearing.

The board renders as two stacked full-hero-width layers (a blurred "soft"
layer + a sharp "crisp" layer) masked by hand-tuned `--tetris-mask-*` gradient
stops for a depth-of-field falloff — the values are tuned against screenshots,
not a formula. Cols/rows/cell size are computed from the container's real box
at runtime (not hardcoded to 10×20), recomputed on resize via
`setupAmbientBoard()`, with an `ambientGeneration` counter so an in-flight
animation from before a resize bails instead of animating into stale
coordinates. Each piece plays a real spawn→turn→fall cycle using CSS
`steps()` (not eased) for a blocky, snap-to-grid feel — narrower and
deliberately different from the smooth easing every other hobby detail uses.
The whole loop is gated off entirely when its container has no real box
(hidden below the mobile breakpoint) — derived from the container's own
size, not a second hardcoded breakpoint check.

**"JOHN NG" wordmark** (`PieceMark.astro`) — on every route. J and O (the
only letters in "JOHN NG" that also name real tetrominoes) reveal themselves
as those pieces: the letter fades while four blocks fill in, the piece turns
once, then it reverses. Each piece's box is measured against its letter's
actual ink via canvas `measureText` (waits on `document.fonts.ready`,
re-measures on resize) rather than laid out on a shared CSS grid — an O's
blocks come out visibly bigger than a J's, which is deliberate (a shared
block size left the O too small for the letter it replaces). The turn is
applied by rewriting CSS grid placement (not a transitionable property), so
it's a snap by construction. Exactly one mark performs per page
(`data-owns`, set from the route); reduced motion leaves letters at rest.

**`TetrisWell.astro`** — a Home-only decorative well fixed bottom-right. Each
of Home's four sections drops one hardcoded tetromino as it scrolls into
view (J→hero, O→bio, L→featured, I→teaching, matching the wash order above);
the I-bar clears four lines at once, flashes, and empties; scrolling back to
the top re-arms it. Piece shapes are fully hard-coded (not generated) since a
4-wide well only has one tiling that both matches each piece's letter and
sits grounded without floating. `pointer-events: none` and fades out while
the footer is on screen, deferred until any in-progress clear finishes (a
`clearActive` guard) so the payoff at the very bottom of the page — where the
footer also enters — never gets hidden mid-animation. A single `nextIdx`
pointer turns the four independent section observers into one ordered queue,
since a scroll position restored mid-page would otherwise drop a piece onto
an empty board out of sequence. Desktop-only, `aria-hidden`, off under
reduced motion.

**Theme toggle** (`ThemeToggle.astro`) — a shaped balisong (two handles that
pivot about their own centerlines, visible pivot pins, a clip-point blade),
not the two flat bars of the original pass. State is purely CSS-driven off
`html[data-theme]` (closed=light, blade-out=dark) rather than toggled by
script, so both mounts animate from one attribute change with no flash and no
per-button bookkeeping, and it renders correctly pre-JS. A sun/moon glyph and
mode word (both `aria-hidden`) aid discoverability; reduced motion drops the
transition but still swaps the resting silhouette.

**Contact send** (`ContactForm.astro`) — on a successful send, a T piece
spawns high, drops block-by-block, snaps 90° in place into a T-spin double
(geometry verified against the real `rotate()`/`isTSpin` in `engine.ts` via a
throwaway solver script, then baked as a fixed coordinate sequence — the
visual is a rigid-body rotation the engine's per-rotation cell arrays don't
model), the two completed rows flash and clear, and the reply rises out of
the freed space. Reduced motion, no-JS, and the error path all keep a plain
text success/error swap; the inline-feedback hard constraint below is
unaffected either way.

**Minesweeper** (`MinesweeperBoard.astro`, `/404`) — styled to match the
site's card language; opened cells recede to flat `--color-bg` so revealed
numbers keep full `--color-text` contrast in both themes (the previous
`--color-text-secondary` fill broke dark-mode contrast). Uses proper ARIA
containment (`role="grid"` → `role="row"` → `role="gridcell"`, `display:
contents` on the row wrapper) rather than flat `grid` → `<button>` children,
which axe-core flags as `aria-required-children`; cells convey state via
`aria-label` only (`aria-pressed` isn't valid on `gridcell`).

**Article header** (`ArticleLayout.astro`) — an image-led split header (mono
meta line, large Bricolage title, Source Serif dek from the project's
`summary`, 4:3 cover). The cover holds a real photo when a project sets
`cover`, otherwise a server-rendered fallback: a frozen tetromino stack tinted
by `accentForTag(tags[0])` (no runtime `createElement`, so none of the
`:global()` scoping trap).

**Bio portrait** (`index.astro`'s `.bio-frame`) — an O-piece dissolve: a gold
2×2 block breaks off the bottom-left on scroll-entry, and click toggles it
apart/whole, flashing white on reassembly. Cells are sliced via the sprite
technique (one shared background image at `400% 400%`, per-cell
`background-position`) rather than `object-fit: cover`, which crops every
cell to the image center regardless of offset and would show the same
central region on all four pieces. Server-rendered at rest, so reduced
motion / no-JS renders a plain photo with no script attached.

**Project cards** (`ProjectCard.astro`) — an opt-in `showCover` prop (default
`false`; both Home and `/projects` pass `true`) renders a generated cover
when no real `cover` image exists: a `color-mix` tinted block plus the
title's first letter as a low-opacity glyph, tinted by
`accentForTag(tags[0] ?? title)`. On hover, a tetromino (shape chosen by the
same accent, so a tag always yields the same piece) drops into the cover and
flash-clears on leave; gated behind `prefers-reduced-motion: no-preference`.
`/projects` splits the newest project (by date) into its own full-width
featured row above the regular grid.

**Removed:** the Tetris click-to-play overlay (the ambient animation alone
was judged enough to convey the hobby — `engine.ts`'s full game-logic API is
otherwise untouched, still exercised by its own unit tests) and the article
reading-progress capybara mascot (`CapybaraProgress.astro`, `lib/capybara.ts`
— no replacement was added; the browser's own scrollbar conveys position).
The footer's capybara easter egg is a separate, self-contained, pure-CSS
component and was untouched by either removal.

## Hard constraints (don't reintroduce these)

- No resume download link anywhere.
- No email/phone displayed as text anywhere — contact goes through `/contact`
  only. LinkedIn/GitHub links stay visible (public profile links, not private
  contact info).
- No dedicated About page — bio lives on Home.
- No Pokémon or other copyrighted character likeness for the mascot — IP risk,
  ruled out during design. The footer capybara is original.
- Contact form must show an inline success message via JS `fetch` submit — do
  not let it fall through to Netlify's default unstyled success-page
  redirect. It must also show inline feedback on failure (non-2xx response or
  a thrown/rejected `fetch`) rather than failing silently — `#contact-error`
  (`role="alert"`), form stays visible so the visitor can retry. Error copy
  stays within the "no email/phone as text" constraint (points to
  LinkedIn/GitHub, not a static address).

## Accessibility

`prefers-reduced-motion` fallbacks across every interactive/decorative
detail, full keyboard operability for Minesweeper (the only actually-playable
one — Tetris is purely decorative), visible focus states sitewide,
skip-to-content link, and `aria-hidden` on purely-decorative details (the
Tetris ambient animation, `TetrisWell`, the footer capybara).

Verified sitewide by `tests/e2e/accessibility.spec.ts`: an
`@axe-core/playwright` sweep (no serious/critical violations) across all 5
routes, a skip-link-is-first-tab-stop check, and a reduced-motion check that
the Tetris ambient loop freezes on a static frame. `tests/e2e/nav.spec.ts`
covers the rail and mobile drawer; `tests/e2e/wordmark.spec.ts` covers the
"JOHN NG" mark's reveal, ownership, and reduced-motion behavior.

Two testing lessons worth keeping, both found by a dedicated audit of this
suite:

- `test.use({ reducedMotion: 'reduce' })` does nothing in this Playwright
  setup — use `page.emulateMedia({ reducedMotion: 'reduce' })` instead.
- Prefer the strict `Locator` API over `page.click(selector)`. The legacy
  selector API is non-strict and silently takes the first match, which is how
  a completely dead duplicate-`id` `ThemeToggle` mount passed CI for months.

That same audit deliberately broke the production code six existing tests
claimed to guard and found none of the six would actually fail. Recurring
shapes worth checking against any new test here: asserting a transient state
only after it's already settled instead of the durable evidence; comparing
two empty/unrendered subjects (which trivially "match"); using a fixture
where the failure being tested for can't structurally occur (an O piece
can't create a hole no matter where it lands); asserting something the test
never actually reads; and a comment describing a fixture the test doesn't
build. The working rule: a test is finished when you can name — and
ideally have watched — the one-line production change that turns it red.

## Repo history

Old CRA site's commit history is preserved — useful for content reference
(bio copy, past repo list) even after the rewrite.

## Workflow preferences

- **Keep this file concise.** When a pass changes behavior documented here,
  update the relevant section in place rather than appending a new
  narrative paragraph — this file describes the site *as built*, not a
  changelog. Bug war-stories, "verified X/X tests" reports, and per-pass
  play-by-play belong in the pass's plan doc (`docs/superpowers/plans/`) and
  git history, not here; only promote a finding to CLAUDE.md if it's a
  durable rule future work needs (a gotcha, a constraint, an architectural
  decision) — not the story of how it was found. If a section starts
  reading like a log instead of a reference, condense it before adding to
  it.
- Execute multi-task implementation plans with
  `superpowers:subagent-driven-development`: a fresh implementer subagent per
  task, a task-scoped reviewer after each, and one broad whole-branch review
  on the most capable available model once every task is done.
- Verify, don't just trust. When a subagent's fix touches production logic or
  deviates from a plan's literal code, or its safety classifier was
  unavailable, re-derive or re-run the claim independently — this repo's
  plans have had genuine bugs in their own literal test/implementation code
  more than once, not just implementer mistakes.
- Escalate, don't resolve. When a finding conflicts with what a plan mandates
  — or two of a plan's own requirements conflict with each other — ask
  directly rather than picking a side unilaterally.
- `npm run test:all` (typecheck + unit + build + e2e) is the real CI gate,
  and now runs on GitHub Actions too (`.github/workflows/ci.yml`, on every
  push and PR; lives only on this branch, not yet a required check on
  `main`). Two things about it are easy to silently break again:
  `webServer.reuseExistingServer` must stay `false` — a reused leftover
  server can score a stale `dist/` as green; and `typecheck` must stay
  `astro sync && tsc --noEmit`, not bare `tsc`, since `astro:content` types
  are only generated (gitignored) as a side effect of `astro sync`/`dev`/
  `build`, and a fresh checkout has none of them yet.
- **One worktree, one agent at a time.** `npm run build` writes `dist/`, and
  `test:e2e` builds before running, so concurrent agents in the same worktree
  clobber each other's build and results. If a review agent must run
  concurrently, give it its own worktree.
- This sandbox's Chromium previously couldn't launch (missing
  `libnspr4`/`libnss3`/`libasound2`, no root for `apt install`); fixed on
  this machine only via a user-local `dpkg-deb` extraction plus a scoped
  `LD_LIBRARY_PATH` in `package.json`'s `test:e2e`/`test:all` scripts — not
  portable to a fresh checkout. Treat the same missing-`libnspr4` signature
  elsewhere as this known limitation, not a regression.
- Cost-tier subagent models to the task: a cheap model when a plan supplies
  literal code (transcription plus testing), a standard model once a task has
  real integration/behavioral judgment, the most capable available model for
  the final whole-branch review.
- For visual/CSS work, confirm the intended look *before* touching component
  code: build a self-contained mock and publish it as an Artifact, iterate
  until approved, then port the result into the real component and confirm
  live against `npm run dev`. Expect several rounds of eyeballed tuning —
  these values are hand-picked against screenshots, not computed.
- HMR is unreliable in this WSL2 sandbox (repo lives on `/mnt/c/...`, where
  inotify often doesn't fire) — after any edit, fully restart the dev server
  before trusting an unchanged-looking result, and `curl` + grep the served
  page for a distinctive string from the new code to confirm it's actually
  being served.
