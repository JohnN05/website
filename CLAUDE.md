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
clamp(9rem, 2.9rem + 12.68vw, 14rem)` (the cap has since dropped to `12rem`
— see Navigation below) and `.hero-copy`'s `max-width: max(23rem, 40%)`. This file describes the site
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
a maintained duplicate of it. **(That "JOHNNG" diagnosis was wrong, and was
only disproved much later, by the wordmark pass below — it was reasoned out
rather than read off a real AX tree, and this pass shipped with no Playwright
spec to check it. The real failure mode of this DOM shape is per-letter
spacing, `"J O H N N G"`: each `.ch` is a flex item, flex blockifies its
children, and accessible-name computation inserts a space at every non-inline
box boundary. A literal space character cannot fix that, and never was what
made this name correct.)** Verified via unit tests (71/71, unaffected —
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
so its Featured cards render exactly as before. (The later design-review pass
below deliberately reversed this: Home now passes `showCover={true}` too, on
direct user request — the prop stays opt-in, both call sites now opt in.)
Verified via unit tests
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

A nameplate-timing pass (no plan doc, direct user request) then made the
Home mark's reveal noticeable — it fired at `document.fonts.ready`, in the
same instant as first paint, and was over in 805ms. The reveal is now
*shorter* (630ms), with a 700ms `LOAD_DELAY_MS` holding the letters at rest
first: being noticed is the delay's job, not the animation's. The J also
disagreed with its own piece — `PIECES.J` spawns flat, which is the letter J
rotated a quarter-turn clockwise, so the blocks filled in lying on their side
under a glyph still standing up. The letter now meets the piece rather than
the reverse (the piece's spawn and CCW turn are real Tetris moves and are
untouched): it paints already tipped, gated in CSS on `html[data-motion='on']`
— the same render-blocking `BaseLayout` gate the scroll reveal uses, which is
what makes reduced motion and no-JS render an upright J with no second check
to drift. No transform transition anywhere, so the tip is a snap by
construction like the turn.

**A full review of the revamp followed, and it was overdue — it found three
bugs that made the site unusable for whole classes of visitor, none of which
any test caught:**

1. **Every non-Home route was completely unscrollable on a phone.**
   `scroll-snap-type: y mandatory` applied sitewide below 769px, but only Home
   authors section snap targets; everywhere else the only snap area was
   `MobileNav`'s own `scroll-snap-align: start` at document position 0, so the
   viewport was pinned there. `/contact`'s Send button — the site's *only*
   contact channel — was unreachable, as were 3 of 4 project cards. Note the
   irony: that MobileNav snap target was itself the fix for the earlier
   "hamburger snapped above the fold" bug. It fixed Home and trapped every
   other route. Both snap rules are now scoped to `html[data-snap='sections']`,
   set by `BaseLayout` from the route. CI missed it because its one mobile test
   visited `/` — the single route where the bug is invisible.
2. **Dark mode was unreachable for every mobile visitor.** `ThemeToggle` is
   mounted twice, but Astro bundles a component's `<script>` **once per page,
   not once per instance** — a trap worth remembering in its own right. Both
   mounts emitted `id="theme-toggle"`; the single `getElementById` bound only
   the rail's (first in DOM order), which is `display: none` on a phone, so the
   drawer's button had no listener at all. Now bound by class across every
   mount, with no duplicated id.
3. **The rail's theme toggle was unclickable at the bottom of any desktop
   page.** `Footer` is a *sibling* of `#main-content`, so it never got the rail
   offset and spanned the full viewport under the fixed rail. Harmless until
   `Footer` took `z-index: 2` (added so its capybara caption paints above
   Home's blurred `.seam`) — which also beats the rail's `z-index: auto`, so
   the footer's transparent box won hit-testing over the toggle. Seen, clicked,
   nothing happened; keyboard Enter still worked, which is what pinned it on
   hit-testing rather than the handler. Fixed by giving `.site-footer` the same
   `--rail-width` offset as `#main-content` so the two stop overlapping at all
   — *not* by raising the rail's `z-index`, which would have re-opened the
   caption-under-seam bug the footer's `z-index` exists to close. Two
   deliberate stacking decisions, each locally right, silently composed into
   this.

Scoping the snap rules opened a cascade trap worth recording: the
reduced-motion `html { scroll-snap-type: none }` disable won on **source order
at equal specificity**. Moving the snap rules to an attribute selector (0,1,1)
would have silently outranked it and turned snapping back on for exactly the
visitors who asked for it off. The disable had to move to the same selector,
and now has a test.

The same review also fixed: Minesweeper never announcing its own outcome
(`#ms-status` had no live region, so a screen-reader user got no signal the
game had ended and every later Enter silently no-op'd behind the `gameOver`
guard — now `role="status"`); Minesweeper dropping focus to `<body>` on every
mouse click (`render()` rebuilds all 81 buttons, the keyboard path refocused by
hand at three call sites, the mouse path never did — focus restoration now
lives in `render()` itself, gated on the grid actually having had focus so the
initial render and Reset don't steal it); the Netlify honeypot being decorative
(the form lacked `data-netlify-honeypot`, and the JS fetch never transmitted
`bot-field` — a honeypot nothing sends catches nothing); and the ambient Tetris
loop running forever on mobile, where `.tetris-hero` is `display: none` (a 0x0
container still clamped to a 4x4 board with a *negative* cell size and
re-rendered it on a timer, burning a phone's battery for something no one can
see — now gated on the container having a real box, derived rather than
re-testing the 768px breakpoint in JS).

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

A further pass (spec: `docs/superpowers/specs/2026-07-15-home-scroll-motion-design.md`,
plan: `docs/superpowers/plans/2026-07-15-home-scroll-motion.md`) removed the
scroll lock from the pass immediately above and replaced it with reveal-on-
entry (section content rises into place as it arrives) plus parallax (layers
drift at different rates on scroll). This is not a reversal of that prior
pass but a resolved conflict between it and this one: parallax only reads as
depth under continuous coupling to the visitor's own input — you scroll a
little, layers separate a little, and the rate difference is legible because
you're the one driving it — and the lock's entire purpose was severing that
coupling, replacing it with a fixed-rate 700ms burst between two dead stops.
Both cannot hold at once, so the lock had to go. A live-traced measurement
settled it, and settled that it was never a performance problem: real
`scrollLock.ts` math, real tokens/washes/blurred seams, one hero→bio travel
per mode, locked 60fps in all four modes (16.7ms median frame, 0 frames
>20ms, 0 long tasks). The actual finding was geometry, not framerate: the
board drifted 131px while the lock scrolled the page 819px in the same
700ms — parallax moving at ~16% of the page's own speed, in the same
direction, during the only window in which anything moved at all, so the
depth cue drowned in the very scroll it exists to read as distinct from. A
standing hypothesis about the `filter: blur(40px)` seams and the ~168-cell
masked board being repaint-expensive was tested in the same trace and
disproved — they cost nothing measurable, worth recording so neither is
re-suspected later. The first attempt at this trace was invalid and had to
be rerun: Chromium restores scroll position across `reload()`, so each mode
was silently measuring a *different* section pair, and the `both` run
measured no travel at all; reruns must force `scrollY` to 0 before each
sample. Desktop now uses `scroll-snap-type: y proximity` (in a new
`min-width: 769px` block in `global.css`, replacing the lock's listener
entirely — not the pre-existing `--rail-width` block of the same width, which
is separate and untouched);
mandatory was considered and rejected because it fires its own scroll
animation on every gesture, which would re-create the same conflict in a
milder form. Mobile's `scroll-snap-type: y mandatory` block is untouched.
`src/lib/scrollLock.ts`, its test file, the wheel-intercept `<script>` in
`index.astro`, and `tests/e2e/scroll-lock.spec.ts` are all deleted outright;
`tests/e2e/scroll-motion.spec.ts` is new. Parallax's own pure math lives in
a new `src/lib/parallax.ts` (`MAX_SHIFT_PX = 200`,
`parallaxShift(scrollY, sectionTop, depth, strength = 1)`, clamped to
±200px), wired from `index.astro` via an rAF-throttled `scroll` listener
that writes `--parallax-y` on each intersecting `[data-depth]` element;
reveal adds `.in` to a section on entry via a second `IntersectionObserver`
(`REVEAL_THRESHOLD`, `0.25` in `index.astro` — this doc said `0.15` for a
while, which was doc drift, not a second threshold) and drives `[data-reveal]`
children through registered
`@property --reveal-y`/`--reveal-o` custom properties, staggered 70ms per
child.

Reveal's hidden state is gated on `html[data-motion='on']`, set by the
render-blocking inline `<script is:inline>` in `BaseLayout.astro`'s `<head>` —
the same one, and for the same reason, as the pre-existing line that sets
`data-theme` there to avoid a theme flash. It must land before first paint:
Astro's `<script>` is `type="module"` and runs *after* paint, so gating from
`index.astro` painted already-visible content at rest and then transitioned it
OUT. Reduced motion — and the inline script not running at all — simply leaves
the attribute unset, so `[data-reveal]` renders at rest with no JS; never write
a rule that can hide it without that attribute. Pre-paint gating does open one
narrower hole, worth knowing because it is *not* the one that constraint
describes: the gate and the revealer are now separate scripts, so if
`index.astro`'s reveal module 404s or throws while the inline head script still
runs, off-screen content stays hidden with no error. Anything that sets
`data-motion` must therefore be render-blocking and must not depend on that
module.
The hero is the one section whose `in` class is authored in `index.astro`'s
markup rather than added by script: it is on screen at load by definition,
reveal is an on-*entry* effect, and a pre-paint gate is too early for any
script to mark it resting in time. Removing that class makes the hero fade in
on every load (verified: its `h1` renders at `opacity: 0.18` mid-fade) — if a
deliberate hero load-in is ever wanted, give it its own mechanism instead.

An earlier version of that gate also pre-marked, from JS, any section merely
touching the viewport as already-entered, which disagreed with the observer's
own 0.15 threshold and produced a bug worth recording: Home's deliberate ~10vh
"peek" of the next section leaves bio 11.1% visible at 1920x1080 — above zero,
so pre-marked resting, but below 0.15, so bio's reveal silently never played
on the most common desktop resolution. Every e2e test ran at 1280x800, where
the hero renders ~835px tall and bio does not peek: the single height at which
the bug is invisible. The fix was not to raise the JS check to match (that
flashes bio's visible peek from 1 to 0, the exact flash the check existed to
prevent) but to move the gate before paint, which makes the check redundant
and lets one threshold govern reveal everywhere. The lesson generalizes: a
load-time "is it already on screen" check and an observer threshold are two
definitions of "entered," and they must not be allowed to disagree.

One
real bug surfaced from the mock and had to be designed around rather than
patched after the fact: a `--parallax-y` written by JS with no CSS rule
consuming it produces no error and no visual difference from a value that's
merely wrong — it silently looks like a taste problem instead of a missing
feature. The board carries `data-depth` but not `data-reveal`, so the
shared transform rule in `global.css` must key off `[data-reveal],
[data-depth]` together, not `[data-reveal]` alone; that selector is
load-bearing, not decorative.

The whole-branch review then found that same constraint broken in the
*inverse* direction, which the plan never considered and no test caught: the
consumer set was silently *larger* than the producer set. `--parallax-y` was
left unregistered (the spec treats `@property` purely as "makes it
transitionable," and since JS rewrites `--parallax-y` every frame it looked
like it needed no registration), and custom properties inherit by default —
so the value written on `.hero-copy` also reached its own `h1` and `.eyebrow`,
which the transform rule matches too, and each re-applied that same translate
*inside* the already-shifted parent. Measured at `scrollY` 400: the hero text
rendered 40px off design instead of 20px, an effective depth of 0.10 rather
than the intended 0.05 — narrowing the very board-vs-copy rate difference the
effect exists to create (`.bio-copy` 0.03→0.06, `.teaching-inner` 0.06→0.12
likewise). `@property`'s `inherits: false` is what scopes a custom property to
its producer; registration here is about inheritance, not animation. Every
test missed it for one reason worth remembering: the hardened `DOMMatrix`
assertion ran on `#tetris-hero`, the only depth layer with no `[data-reveal]`
descendants — the single element inheritance cannot reach.

Four more real issues turned up during this
pass, none anticipated by its own plan: (1) the plan's own literal e2e
assertion — `getComputedStyle(html).scrollSnapType === 'y proximity'` — is
unsatisfiable in any browser, because per CSSOM serialization `proximity`
is the *initial* strictness value and computed-style serialization omits
initial values; verified empirically that desktop actually reads `'y'`,
mobile reads `'y mandatory'` (non-initial, so it survives), and an
unsnapped element reads `'none'` — asserting `'y'` still discriminates all
three cases, so the fix cost no coverage. (2) axe-core's `color-contrast`
rule alpha-blends a transparent foreground into its background and scores
the blend; Home's not-yet-revealed sections sit at `opacity: 0` by design
with no time bound, so a scan mid-load flagged them as real WCAG failures
(5 elements, count varying with scan timing) — a genuine conflict between
two of this same plan's own requirements (ship the opacity-gated reveal;
keep the accessibility sweep green), escalated to the human rather than
picked unilaterally. Ruling: scan Home in its revealed state, with
`color-contrast` kept at full strength and zero exclusions; the reveal
design itself was not the defect, axe's static-snapshot model versus
scroll-reveal UX is the tension, and it's a known pattern for scroll-reveal
sites generally, not a bug in this one. (3) `scroll-behavior: smooth`
hijacked a programmatic scroll for the *second* time on this branch — the
human's own approved test-fixture snippet failed verbatim, because both
`scrollIntoView()` and `scrollTo(0, 0)` defer to `html { scroll-behavior:
smooth }` and animate, cutting the last section's scroll short before its
observer fired; fixed with an explicit `behavior: 'instant'` on both calls.
The scroll-lock pass above hit the identical trap from a different angle
(per-frame `window.scrollTo(0, y)` calls launching competing native
smooth-scrolls) — this is now a repeat offender in this codebase, not a
one-off, and any future scroll-driven code should assume `scroll-behavior:
smooth` will intercept an unqualified scroll call. (4) polling for the
`.in` class alone was necessary but not sufficient to know a reveal had
actually finished: `.in` marks the fade as *started* (520ms, plus up to
70ms per staggered child), so a test could sample mid-fade and axe would
score whatever blended opacity it caught mid-transition — an observed
foreground of `#757d89` (a blend of the authored `#4A5468`) scored 3.48
contrast against the 4.5 needed. Fixed by additionally polling every
`[data-reveal]` element to computed `opacity === '1'`, the state axe
actually measures. A fifth issue was caught in the parallax wiring itself
and is a reusable lesson: the plan's own literal e2e tests asserted only
that `--parallax-y` was *set*, which proves the producer ran but nothing
about whether any consumer exists — `getComputedStyle` returns a custom
property's value whether or not a rule reads it. Deliberately reintroducing
the exact regression the load-bearing-selector fix above exists to prevent
(dropping `[data-depth]` from the transform selector) kept every existing
assertion green: `--parallax-y` still read `64.00px` while the board's real
`translateY` stayed `0`. Fixed by additionally asserting the consumer's own
output via `new DOMMatrix(getComputedStyle(el).transform).f`. Asserting a
custom property is set only tests the producer; the transform matrix is
what proves a consumer exists. Unit count moved 79 → 74 (12 scroll-lock
tests deleted, 7 parallax tests added). Verified via a real Playwright run
in this sandbox (the `LD_LIBRARY_PATH`/`libnspr4` fix below is in place and
working here, and continues to be — this doc's long-running "this sandbox
can't run Playwright" caveat no longer applies from the Tetris hero polish
pass onward and should not be reintroduced for future passes): 74/74 unit,
clean production build, 43/43 e2e, all independently re-confirmed by the
controller directly rather than only trusted from subagent reports — and in
this pass that mattered more than usual: one implementer reported its fix as
DONE when the suite was in fact still red, and another ran with its safety
classifier unavailable. The e2e count is 40 for the four planned tasks plus
three regression tests added from review findings — the inheritance
double-apply, bio's reveal at 1920x1080, and the hero not animating on load
(the parallax-consumer check is an added assertion inside an existing test,
not a new one). Each was proven to fail against the bug it guards, by
reintroducing that bug, before being kept.

A further pass (plan: `docs/superpowers/plans/2026-07-15-rail-wordmark-piece-reveal.md`;
no separate design spec) replaced the rail's IBM Plex Mono wordmark with a
stacked Unbounded mark (JOHN over NG) whose J and O reveal themselves as real
tetrominoes, and gave the Home hero nameplate the same reveal **in place of**
its flash (the `flashNameplate()` script, its `.flashing` rules, and its
`.ch:not(.sp)::before` overlay are deleted outright — keeping both would put
two animations on one element). Six tasks via
`subagent-driven-development`. The piece model is pure logic in
`src/lib/nameplate.ts` (`PIECES`, `rotateCcw`, `pieceBlocks`);
`PieceMark.astro` renders the mark from it at build time and wires the reveal
for **every** `[data-piece-mark]` on the page from one script, so the rail, the
mobile bar, and the hero are one implementation rather than three copies.
Ownership — which mark performs on a given page — is a `data-owns` flag set
from the route (`Nav.astro` computes `isHome`), not branching in each
component: on `/` the hero performs and the rail stays quiet, everywhere else
the rail is the only name on screen and performs. The rail's cap dropped
14rem→12rem since the stacked mark needs less width. Unit 74 → 92; e2e 43 → 53.
A follow-up pass then rebuilt the reveal's geometry — see "Piece geometry"
below; the counts moved to 89 unit / 56 e2e.

Three things from this pass are worth carrying forward. **(1)** The design
avoids two bug classes by construction rather than by care: the turn is applied
by rewriting the blocks' CSS grid placement, which is not a transitionable
property, so it *cannot* accidentally become a tween that catches a tetromino at
30°; and the O's rotation no-op falls out of `rotateCcw`'s math (a 2x2 square in
a 2x2 box maps onto itself) rather than an `if (piece === 'O')` branch. The same
`pieceBlocks()` produces both the server-rendered markup and the client's
rotation writes — verified at review as genuinely one source of truth, so the
animated-vs-committed divergence that hit the ambient piece cannot recur here.
**(2)** The plan's own literal code shipped a real bug again (a pre-flight scan
caught it before dispatch): its `the O holds still` e2e test asserted an
*ordered* block comparison that the rotation provably never produces, since the O's
rotation permutes array order while preserving the cell set. Ruled: compare as a
set, matching the unit tests' own `sorted()` convention. **(3)** The
whole-branch review earned its keep — see the Astro-scoping paragraph below for
the `.rail-wordmark` font-size rule that never matched, which five per-task
reviews passed and which was the controller's own error (its dispatch prompt
asserted the false claim as context).

Two accessibility findings from this pass, both from real AX trees rather than
reasoning: the mark's accessible name computes to `"J O H N N G"` without
`.line`'s `aria-label`, because flex blockifies each letter span and accname
inserts a space at every non-inline box boundary — so the plan's own "do not
paper over it with an `aria-label` duplicate" constraint was **deliberately
overridden** by the project owner. The label is not a maintained duplicate: it
reads the same `line` variable that renders the letters beneath it, so it cannot
drift. (This also disproved this doc's own long-standing "JOHNNG" claim — see
the annotation above.) Second: axe files contrast on single-character content
(the J/O glyphs) under `incomplete`, never `violations`, with the reason
"Element content is too short to determine if it is actual text content" — and
`accessibility.spec.ts` asserts only `.violations`, so the reveal-wait that
plan Task 6 added to prevent a mid-reveal contrast failure guards a violation
that cannot currently be reported for this component. Kept anyway (cheap, correct
in principle, and it starts guarding if a glyph ever holds >1 character), with
its comment corrected to stop claiming otherwise. Worth remembering: that wait's
deliberate-break check proved it *waits*, not that it *guards* — weaker evidence
than it reads as. Verified by the controller directly, not only from subagent
reports: 92/92 unit, clean build, 53/53 e2e in this sandbox's real browser.
Still open and deliberately unfinished: the mark's `font-size`s and
`PieceMark`'s four timing constants want live eyeball tuning per the
mock-first/dev-server workflow preference below.

A design-review pass (no plan doc, direct user request; source review at
`docs/2026-07-16-design-review.md`) then addressed the review's top three
items, mock-first in an Artifact through several rounds before any component
was touched, per the workflow preference below. Committed as `5bb3352`.

1. **Butterfly-knife toggle rebuilt as a legible balisong** (`ThemeToggle.astro`).
   The old control was a 48×16 SVG of two flat `rect` bars that read as a
   broken dash and gave no theme signal. It is now a shaped balisong — two
   handles that pivot about their own centerlines (so a 180° flip keeps them
   parallel and in-lane: together over the blade when closed, stacked on the
   far side when open), visible pivot pins, and a Squid-Industries-Mako-style
   clip-point blade with a swedge line. **State is CSS-driven off
   `html[data-theme]`, not toggled by the component's script** — closed=light,
   blade-out=dark — which is the load-bearing decision: because `BaseLayout`
   sets `data-theme` before first paint, the knife renders in the correct
   resting silhouette with no flash and no JS, and the click handler is reduced
   to flipping the attribute (`persistTheme` alongside). The flip animation
   falls out of the CSS transition on that attribute change, so both mounts
   (rail + drawer) animate from one source with no per-button bookkeeping — the
   old `.flipping` class and its `setTimeout` are gone. Under reduced motion the
   transition is removed but the silhouette still swaps, so the current mode is
   never ambiguous. A sun/moon glyph and a `Light`/`Dark` mode word were added
   for discoverability (both `aria-hidden`; the button's accessible name stays
   an action `aria-label`), also toggled purely by the `html[data-theme]`
   selector. The SVG is static server-rendered markup, not a runtime
   `createElement` grid, so ordinary Astro scoping applies and the
   `html[data-theme='dark']` ancestor rules need `:global()` on the attribute
   selector but no grid-style `:global()` wrapper on the whole rule.
2. **Featured cards gained covers + an on-brand hover** (`ProjectCard.astro`,
   `index.astro`). Home now passes `showCover={true}` — a **deliberate reversal
   of the projects/contact parity pass's decision** (recorded above) to keep
   Home coverless; the review explicitly wanted the `/projects` cover treatment
   on Home, so both call sites now opt in. Cards gained a real resting hairline
   border, an accent top-edge that wipes in on hover, and a lift/shadow. A real
   tetromino now drops into the cover on hover and **white-flashes clear in
   place on leave**, reusing `TetrisHero`'s `flashRows()` motion language (a
   `setTimeout` `classList.toggle` loop, same `FLASH_CYCLES`/`FLASH_INTERVAL_MS`
   feel, `#ffffff` flash like the nameplate's rather than a token) — no CSS
   `@keyframes`. The piece shape is chosen deterministically from the card's own
   accent (`PIECE_CELLS`: cobalt→J, maroon→Z, clay→L, moss→S), the same
   determinism `accentForTag` already gives the color, so a tag always yields
   the same piece. Motion is gated behind `prefers-reduced-motion:
   no-preference` and the drop/flash script never wires under reduced motion, so
   the piece simply stays hidden; the accent edge (a state change, not travel)
   stays either way.
3. **Teaching prose became a count-up impact row** (`index.astro`). The flattest
   prose block is now a mono-labelled number row (`60+ / 3 / 2` — Students /
   Countries / Programs) in Bricolage at a larger scale with `tabular-nums`,
   the sentence kept as support beneath. The numbers count up on entry via their
   own `IntersectionObserver`. The **final values ship in the markup**, so
   reduced motion and no-JS both render them correct with nothing to animate;
   only when motion is allowed does the script reset to `0` and count up, and the
   section's reveal keeps it opacity-0 until entry so that reset is never a
   visible flicker. A first draft used `<dl>/<dt>/<dd>` with the number as `dd`
   before the label `dt` — reverted to plain `div`/`span` (the approved mock's
   structure) to avoid the odd term-before-description ordering.

Verified by the controller directly: typecheck clean, 92/92 unit, clean build,
73/73 e2e + axe green in this sandbox's real browser (the axe sweep covers the
new cover pieces, impact row, and knife on all five routes; the theme-toggle
spec still passes because the `.theme-toggle` class and the `data-theme` flip it
keys off are preserved). The exact knife angles/curves, the Mako blade profile
(drawn from memory, not a reference image), and the impact-row scale remain open
to live eyeball tuning per the workflow preference below.

A follow-up design-review pass (no plan doc, direct user request; tracked in
`docs/2026-07-16-design-review-next-steps.md`) then took review items 4 and 5 —
the section through-line and the washes-commit-or-cut decision, which the
next-steps doc had deliberately coupled (item 5 gates item 4). Mocked
first through several rounds in an Artifact per the workflow preference below.
The wash decision was **commit, at 18%** (up from the near-invisible 12%), and
item 4 landed as a new **`TetrisWell.astro`** — a Home-only decorative
scroll-well fixed at bottom-right. As the visitor scrolls the four Home
sections, each drops its own tetromino into the well; the well fills columns 0–2
solid and the last section (teaching) drops a vertical I-bar down the open
column-3 channel that completes four lines at once, flashes (`#fff`, the board's
own `flashRows()` cadence), and empties — the "leave a well, drop the bar for a
Tetris" payoff. Scrolling back to the very top wipes the well and re-arms it so
the build + clear replays.

Several decisions here are load-bearing and were arrived at against the mock,
not derived:

- **Piece colour == section colour.** The review's real complaint was two
  colour systems fighting: the washes ran on `ACCENT_ORDER`
  (cobalt/maroon/clay/moss) while the pieces are *tetrominoes* with their own
  identity colours. Resolved by binding both to the piece's own Tetris hue via
  four new `--piece-{j,l,o,i}` tokens in `tokens.css` — J=blue (the cobalt
  accent, the site's canonical "J-piece blue"), L=orange (clay), O=gold
  (`--tetris-o`), I=teal (`--tetris-i`). Each section's `--wash-*` is now mixed
  from the SAME `--piece-*` it drops, so section and piece share a colour, and
  the well reuses the ambient hero board's palette rather than inventing a
  second one. (This retired the earlier ACCENT_ORDER→wash mapping recorded in
  the "more minimal and spacy" pass above.) Canonical I is cyan/teal, **not
  green** — a green I was tried and rejected as both non-canonical and a blend
  against the moss teaching wash.
- **Line-clear geometry pins the shapes.** In a 4-wide well no row can complete
  until the last piece without clearing early, so the only shape that works is a
  vertical I dropped into an open channel — which is why the pieces are J / L /
  O / I rather than one-per-section-accent. Fully hard-coded (final coords, no
  generation, no gravity sim), per the user's "no fancy piece generation."
- **The footer-fade defers to the clear.** The well is `pointer-events: none`
  (never steals a footer click) and fades out (`.near-footer`) while
  `.site-footer` is on screen (a footer `IntersectionObserver`), so the two
  never overlap at the page bottom — the specific footer-collision class this
  codebase has already paid for three times. But the clear plays at the very
  bottom, exactly where the footer enters, so fading on footer-visibility alone
  hid the well mid-payoff. Fixed with a `clearActive` guard: the well is "busy"
  from the I-bar's drop until the clear finishes, and the fade is only honored
  when it isn't busy (`updateFade()` is the single arbiter of `.near-footer`).
- **Pieces drop in strict order.** The four section observers each fire
  independently the moment their section is 35% visible, so a refresh whose
  scroll position restores mid-page dropped a piece onto an empty board, out of
  sequence (and could fire the clear on nothing). A single `nextIdx` pointer
  turns the four independent triggers into one ordered queue — a section only
  drops when it is the next expected piece — so nothing plays until the hero's J
  leads off, and the board stays clear until then. Reset back to 0 on the
  scroll-to-top replay.

Decorative throughout: `aria-hidden`, hidden below the 769px desktop breakpoint
(where the Tetris hero is hidden too) and hidden entirely under reduced motion,
with the script gated so it never attaches there. The 20 empty board cells are
server-rendered so ordinary Astro scoping applies; the pieces are created at
runtime, so their selectors use `:global()` (the same `createElement` scoping
trap as `TetrisHero`/`MinesweeperBoard`). Verified by the controller directly:
typecheck, unit, clean build, and **76/76 e2e + axe** green in this sandbox's
real browser — including a new `tests/e2e/tetris-well.spec.ts` (footer-fade +
`pointer-events`, the ordered-drop guarantee proven via the `cleared` state a
mid-page jump must never reach, and mobile-hidden) and the existing Home axe
sweep, which now covers the well. The exact well cell size, drop timing, and the
18% wash remain open to live eyeball tuning.

A third design-review pass (no plan doc, direct user request; tracked in
`docs/2026-07-16-design-review-next-steps.md`) then took review item 6 — the
article header, the review's "most neglected surface." Mocked first through
three Artifact rounds per the workflow preference below. The review's own
suggested direction (carry the ProjectCard's cover *glyph* into the header) was
built in the first mock and **rejected by the owner** — a big first letter read
as thin on a low-content page, and the owner noted real cover photos are planned
for articles. So the header was rebuilt image-led. It landed in
`ArticleLayout.astro` as a split header echoing the site's own Bio/contact
two-column: a mono meta line, a larger Bricolage title
(`clamp(2.4rem, 5vw, 3.6rem)` — bigger than /projects' 2.8rem h1, which also
delivers review item 8's one bold scale moment; Bricolage loads at weight 600
only — see the `css2` link in `BaseLayout.astro` — so the impact is size +
tracking, not weight, and a 700 here would only faux-bold), a Source Serif
**dek** pulled from the project's `summary` frontmatter, and a 4:3 cover frame
with an accent hairline + inset top-edge (the ProjectCard top-edge, wrapped).
The cover holds a real photo when the project's optional `cover` field is set,
and otherwise renders a **server-side generated fallback** — a shallow frozen
tetromino stack in the article's own accent (`accentForTag(tags[0])`), rendered
in the component frontmatter so ordinary Astro scoping applies (no runtime
`createElement`, so none of the `:global()` grid trap). A white tetromino marker
sits at the cover's top-right on the **fallback only** (a real photo carries its
own identity and stays clean), reusing the same piece shape the ProjectCard
cover already drops for that accent. To stop the card and the article from
drifting, `ACCENT_VAR` and `PIECE_CELLS` were lifted out of `ProjectCard.astro`'s
local consts into `lib/tags.ts`, and both components now import them — one
source, same piece for the same tag by construction, the shape this codebase
keeps choosing over two hand-kept copies. `[slug].astro` passes `summary` and
`cover` through (both already in the content schema). The prose column is
untouched (70ch Source Serif). One self-inflicted bug was caught before testing:
a `<ul>` nested inside a `<p class="meta">` is invalid and auto-closes the `<p>`,
spilling the tags out of the flex row — changed to a `<div>`. Verified by the
controller directly: typecheck, 92/92 unit, clean build, and 76/76 e2e + axe
green in this sandbox's real browser (the accessibility sweep covers
`/projects/portfolio-site-rewrite`, which now renders the new header + fallback).
The cover aspect (4:3), title scale, fallback stack density, and marker size
remain open to live eyeball tuning. Review items 8
(residual typography — item 6 delivered the bold-title moment) and the per-page
cleanups remain — **`docs/2026-07-16-design-review-next-steps.md` is the live
tracker for what's done and what remains from this review; read it (not just
this log) before picking up any further design-review work.**

A fourth design-review pass (no plan doc, direct user request; tracked in
`docs/2026-07-16-design-review-next-steps.md`) then took review item 7 — the bio
portrait's "most generic possible frame" (a plain 20px-radius `<img>`). Mocked
first through several Artifact rounds per the workflow preference below.
`index.astro`'s `.bio-frame` is now an **L-piece dissolve**: a 4×4 conceptual
grid where an L tetromino (left column rows 1–3 + a foot cell) breaks off the
bottom-left of the photo, the four cells colour to `--piece-l` (clay, the bio
section's own piece), and the notch reveals the section wash behind. On entry the
portrait holds whole ~650ms, then breaks; **clicking toggles** whole/apart, and
on reassembly the cells fly home and **flash white** before resolving to the
photo — reusing the board's `flashRows()` motion language (a `setTimeout`
`classList.toggle` loop, no CSS `@keyframes`), same as the Featured cover pieces.

Several decisions here are load-bearing:

- **The review's own suggested direction was rejected in mocking.** The review
  proposed masking the portrait into a tetromino silhouette; a jagged mask
  straight over a face crops the head. The approved answer reshapes the *break*
  into a piece while the face itself stays rectangular — the photo is never
  masked into a non-rectangular outline.
- **Cells slice via the sprite technique, not `<img object-fit>`.** A first mock
  gave each cell an oversized `<img object-fit:cover>` positioned by
  `left`/`top`; `object-fit: cover` cropped every cell to the image *centre*
  regardless of the offset, so all four broken pieces showed the face instead of
  their own regions — the exact bug the user caught twice. Fixed with the
  canonical N×N sprite formula: one shared `--img`, `background-size: 400% 400%`,
  and a per-cell `background-position` (e.g. the foot cell at `33.333% 100%`), so
  each cell carries its true slice and the notch reveals the wash. The core is
  the photo clipped (`clip-path`) to the square minus the L notch.
- **No runtime `createElement`; the resting state needs no JS.** All cells are
  server-rendered markup, so ordinary Astro scoping applies — none of the
  `:global()` grid trap that `TetrisHero`/`MinesweeperBoard`/`TetrisWell` need.
  Core + four photo cells at home compose one seamless square, so under reduced
  motion (or no JS) the portrait renders as a clean photo and the dissolve script
  never attaches. `role="img"`/`aria-label="John Ng"` on `.bio-frame` carries the
  identity the old `<img alt>` did; the click toggle is a decorative enhancement,
  not an AT control (no `tabindex`/`role="button"`, so it adds no dead control to
  the a11y tree). Entry-break is fired by its own `IntersectionObserver`; the
  frame keeps its existing `data-reveal`/`data-depth`, so reveal fades it in and
  parallax translates the whole frame while the cells animate independently
  inside — no conflict, since the cells carry no `data-reveal`/`data-depth` and so
  are untouched by `global.css`'s shared transform rule.

Verified by the controller directly: typecheck, 92/92 unit, clean build, and
76/76 e2e + axe green in this sandbox's real browser (the accessibility sweep
covers Home, which now renders the new frame). The L placement, scatter
distance/rotation, clay intensity, and hold/flash timing remain open to live
eyeball tuning.

A follow-up pass (no plan doc, direct user request) fixed a piece that lied
about its colour: the scroll-well's **bio** piece was an orange (`--piece-l`)
cell set whose silhouette was actually a **J**, not an L — a viewer caught it as
"two J pieces, one orange." Root cause is geometric, not a typo: the well packs
cols 0–2 and leaves col 3 open for the I-bar, and once hero's blue J sits
`X../XXX` on the floor and feat's gold O takes the top-left 2×2, the only cells
left for bio form a J. An exhaustive search (`scratchpad/solve.py`, kept out of
the repo) confirmed **only two** genuine `{J, L, O}` tilings of that 3×4 space
exist, and neither is grounded in the current drop order (hero→bio→feat), so
"bio drops a real L, second, without floating" is provably impossible. The one
tiling that is both correct-silhouette *and* bottom-up-grounded needs drop order
**J, O, L** — i.e. **bio drops the gold O, feat drops the orange L** (swapped
from before). Chosen (option "Y") over keeping bio orange with a one-step
floating overhang, both mocked in Artifacts first per the workflow preference.

The swap propagates by the piece==section==wash rule, so it touched three
places in lockstep: `TetrisWell.astro`'s `PIECES` (reordered to `j, o, l, i`
with the new coords — the well now builds J on the floor, O resting on it, L on
top, nothing floats); the section `data-band`s in `index.astro` (bio `o`, feat
`l`); and `tokens.css` (`--wash-bio` now mixes from `--piece-o`/gold,
`--wash-featured` from `--piece-l`/orange — the `--piece-*` *values* are
unchanged, only which section wears which). The seam gradients reference the
wash tokens by section name, so they followed automatically. **The bio portrait
`.bio-frame` was rebuilt from the L-piece dissolve (above) into an O-piece
dissolve** to keep bio's identity single: a gold 2×2 block breaks off the
bottom-left quarter (`clip-path` notch `…50% 100%, 50% 50%, 0 50%`, cells
`o1`–`o4` sprite-sliced, `--piece-o` fill), replacing the L's thin arm+foot.
This supersedes the two "L-piece dissolve" / "bio drops the orange L"
descriptions in the passes above — bio is the O now, everywhere. Verified by the
controller directly: typecheck, unit, clean build, and **76/76 e2e + axe** green
in this sandbox's real browser (no test asserted piece shape or wash colour, so
none needed updating; the ordered-drop and axe sweeps still cover the well).
Scatter distances, the O notch corner, and the gold wash remain open to live
eyeball tuning.

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
  `parallax.ts`, `nameplate.ts`, `tetris/engine.ts` + `tetris/bag.ts` +
  `tetris/ambientDemo.ts`, `minesweeper/engine.ts`) — no DOM, no I/O, fully
  unit-tested with Vitest.
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

That scoping has a **second, distinct trap in the same silent-failure
family**, found by the wordmark pass's whole-branch review after five
per-task reviews passed it: **a class passed as a prop to a child component
does not carry the parent's scope.** `Nav.astro` mounted
`<PieceMark class="rail-wordmark" />` and styled `.rail-wordmark` in its own
scoped `<style>`; Astro stamped *`PieceMark`'s* cid on the mark's root span,
while the rule compiled against *`Nav`'s* cid, so it never matched and the
rail rendered at the inherited 16px instead of 20px on every route. Nothing
errored, and every e2e test still passed because they use that class only as
a locator, which resolves fine. The fix is to style a wrapper the parent
actually authors (`.rail-home`/`.mobile-home` carry the `font-size` and it
inherits into the mark) rather than reaching into the child — `:global()`
also works but leaks the selector sitewide for no benefit. The Home hero
hid this: its `.nameplate` is authored *in* `index.astro`, so its size
reaches the mark by ordinary inheritance and looked correct throughout.
Note the interaction with the WSL2/HMR warning below — a rule that never
matches and a rule that's being served stale look identical from the browser.

## Site map

`/` (home, hero + featured-projects preview) · `/projects` (index) ·
`/projects/[slug]` (article) · `/contact` (Netlify Forms) · `/404`
(Minesweeper board).

## Navigation

Desktop (`min-width: 769px`): `Nav.astro` renders a fixed-left icon+label
rail (`#nav-rail`), permanently expanded — there is no collapse/expand
toggle, no `localStorage` persistence, and no `data-rail` attribute. Its
width is fluid rather than a flat width, though: `.rail`'s `width` here and
`#main-content`'s **and `.site-footer`'s** `margin-left` in `global.css` all
read a single `--rail-width` custom property (`clamp(9rem, 2.9rem + 12.68vw, 12rem)`,
defined once inside `global.css`'s own `min-width: 769px` block) rather than
each hardcoding the value independently — two call sites computing the same
value from independent formulas is exactly the shape of bug this codebase
already hit once with the Tetris ambient piece's animated vs. committed
placement (see Status above), so this uses one shared source instead. The
rail holds its full `12rem` from a ~1148px-wide viewport upward, then narrows
toward a `9rem` floor as the viewport shrinks toward the 769px breakpoint,
where it disappears entirely in favor of the mobile drawer below. The cap was
`14rem` until the stacked `PieceMark` wordmark (see Status) replaced the old
one-line mono wordmark and no longer needed the width.

`.site-footer` takes that offset because it is a **sibling** of
`#main-content` in `BaseLayout`, not a child — so it does not inherit it, and
without it the footer spans the full viewport straight under the fixed rail.
That overlap made the rail's theme toggle unclickable at the bottom of every
desktop page once the footer took `z-index: 2` (see Status). Don't remove the
offset and reach for the rail's `z-index` instead: the footer's `z-index` is
load-bearing for Home's `.seam`.

Both `ThemeToggle` mounts (rail and drawer) are bound by **class**, never by
id. Astro bundles a component's `<script>` once per page no matter how many
times it is mounted, so a single-element lookup binds one button and leaves
the rest silently dead — which is exactly what happened to the drawer's copy
(see Status). Any component mounted more than once per page has this property;
don't give one an id.

The rail's name is a `PieceMark` instance (`layout="stack"`), not text: see
the Hobby details section for the mark itself and for the ownership rule
deciding which of a page's marks performs its reveal.

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
Mono** (small labels: eyebrows, article meta line — no longer the nav
wordmark, which is now Unbounded). A fifth face, **Unbounded** (weight 800),
carries every instance of the "JOHN NG" mark rather than a general role like
the other four: the Home hero nameplate, the desktop rail, and the mobile
bar, all via `PieceMark.astro`, which owns the face itself so no mount
restates it. Loaded through the same Google Fonts `css2` link as the rest,
not self-hosted separately.

## Hobby details — priority order

**The "JOHN NG" mark (`PieceMark.astro`)** is the site's second Tetris
surface, and the only one that appears on every route. Its J and O — the only
letters in "JOHN NG" that also name real tetrominoes (I/O/T/S/Z/J/L), which is
why H/N/N/G stay neutral and why this rule must not be widened — reveal
themselves as those pieces: the letter fades out while four blocks fill in
where it was, the piece turns once, then it all reverses.

**Piece geometry — the part that is easy to get wrong, and was.** The first
version placed each piece against its letter's *layout box*: a 3-block lattice
pinned to the bottom of a cell wider and taller than the glyph, and lower. The
result looked plainly broken — pieces sat low and left of the letters they were
meant to replace — while every test passed, because nothing asserted where a
piece landed relative to its letter. It shipped that way. The rules now:

- **Each piece owns its box; there is no shared grid.** The box is sized at
  runtime to the *ink* of the letter it replaces, and divided into `boxSize`
  blocks. So the O's blocks come out 1.5x the J's (a 2x2 piece covering the same
  cap height as a 3x3 one has bigger blocks). That is the deliberate trade,
  chosen by the owner over the alternative (one block size everywhere, which
  leaves the O piece at two-thirds the height of the O it replaces). Don't
  "fix" it back to a shared block size — that reintroduces the misalignment.
- **The box is measured, not derived.** CSS cannot see where a glyph's ink sits
  inside its line box, so `measure()` in `PieceMark.astro` asks canvas
  `measureText` and writes left/top/width/height. It therefore waits on
  `document.fonts.ready` (measuring the fallback face would place every piece
  wrong and never re-measure) and re-measures on resize (the hero's mark is
  sized in vw). Nothing plays before the first measurement.
- **`measure()` suppresses the glyph's transform before reading its rect, and
  must keep doing so.** `getBoundingClientRect()` includes transforms, and the J
  is *already tipped a quarter-turn at first paint* — so the naive read returns
  width and height swapped, with the left edge moved by `(w - h) / 2`. That
  placed the J's piece ~4px off its letter. The vertical term hid it by pure
  luck: the baseline formula reads `glyphRect.top + (glyphRect.height - S) / 2`,
  and rotating about the centre shifts `top` by `(h - w) / 2` while `height`
  becomes `w` — the two cancel exactly, so `baseline` is invariant under the
  tip. Nothing cancels horizontally, and nothing asserted horizontal placement
  until `wordmark.spec.ts`'s "the turned J covers the letter it replaces" was
  added. That test samples the four cells mid-play rather than the resting
  lattice box, because the box is deliberately *not* centred on the ink (it is 3
  blocks wide and the turned J occupies 2 of them) — asserting the box's centre
  would be asserting the arithmetic instead of the claim.
- **The box is anchored on the *turned* state, not the spawn.** A rotation
  happens inside a box that stays put, so anchoring on the final shape is what
  lets the piece turn *into* its letter.
- **The turn goes counter-clockwise.** `rotateCcw` stands the J up as
  `..X / ..X / .XX` — the letter J. Clockwise lands on `XX. / X.. / X..`, a
  mirrored hook; that was the shipped bug. Both are legal Tetris moves, so only
  a test that asserts the *shape* catches this — hence the picture-drawing
  assertion in `nameplate.test.ts`.
- **The letter fades; it is not knocked out.** Painting the glyph in
  `var(--color-bg)` over the piece worked only while the piece sat where the
  letter wasn't. Now that they coincide, a knocked-out glyph hollows the piece
  out to a fringe. Fading also removes the reveal from axe's contrast rule
  entirely — there is no frame where a letter is painted its own background.

Grid column/row counts are rendered inline from each piece's `boxSize` rather
than hardcoded in CSS (CSS `repeat()` needs an integer literal and can't read a
custom property), so there is nothing for a unit test to pin — the old
`LATTICE_SIZE` and its pinning test are gone. The turn is still a snap by
construction, not by discipline: it's applied by rewriting grid placement, which
is not transitionable. Exactly one mark per page performs (`data-owns`, set from
the route); under reduced motion the script checks once and never attaches,
leaving the letters at rest. `tests/e2e/wordmark.spec.ts` re-measures the font
and asserts each rendered box against its letter's ink — the assertion the
original pass lacked, and the reason the bug was invisible to CI. See the Status
section for the accessible-name and axe findings, which are the non-obvious
parts.

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

None of that runs unless the board is actually on screen (`ambientOnScreen` /
`ambientShouldRun()`). Below the mobile breakpoint `.tetris-hero` is
`display: none`, which makes the container 0x0 — and a 0x0 container still ran
every line of the setup: cols/rows clamped to their 4x4 floor, `cellW`/`cellH`
came out **negative**, and the cycle chain re-rendered that invisible board and
scheduled its successor forever, on a phone, on the site's busiest page. The
check is derived from the container's own box rather than by re-testing
`(max-width: 768px)` in JS, since the breakpoint already lives in this
component's CSS and a second copy of the literal `768` is the same
two-call-sites-drift shape this codebase keeps paying for. It is rechecked on
every resize, not latched at load, so a visitor who widens a narrow window
still gets the board.

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
light/dark toggle. (The toggle has since been rebuilt into a proper balisong
by the design-review pass in Status above — this "lower priority / simpler"
framing describes only its original first pass; see `ThemeToggle.astro` and
that pass for how it works now.)

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

`tests/e2e/nav.spec.ts` covers the permanently-expanded desktop rail (pinned
at its `12rem` cap above the ~1148px threshold, narrowing toward its `9rem`
floor below it, both links reachable and labeled, the wordmark links home)
and the mobile drawer (rail hidden below 769px, hamburger opens the drawer,
links reachable). `tests/e2e/wordmark.spec.ts` covers the mark itself: the
ownership rule on each route (including that a non-owning mark hovered for a
full play's duration never plays), the stacked layout, that only J and O
carry pieces, the accessible name, the J's snap between rotation states and
back to spawn, the O holding still, that the turn never tweens, that the J is
already lying down at first paint and upright again once the reveal is over,
and reduced motion. All passing in a real browser environment.

**Two testing lessons this file paid for, both worth keeping:**

`test.use({ reducedMotion: 'reduce' })` does nothing in this setup — probed
directly, the page still reported
`matchMedia('(prefers-reduced-motion: reduce)').matches === false` and `html`
still carried `data-motion="on"`. This spec's reduced-motion test used it and
therefore spent its whole life asserting that a normally-animating mark
happened not to be mid-reveal at the moment it looked. Every other spec here
uses `page.emulateMedia({ reducedMotion: 'reduce' })`, which works; this one
was the outlier, and now matches. The unexplained `TS2353` sitting on that line
was the tell, unread because nothing ran `tsc` (see the Stack section: it does
now, first in `test:all`).

Prefer the strict `Locator` API to `page.click(selector)`. The legacy
`page.*` selector API is non-strict and silently takes the first match — which
is how a completely dead mobile theme toggle passed CI for months (see
Navigation).

**A dedicated audit then hunted the rest of this family, by deliberately
breaking the production code each test claims to guard and seeing what stayed
green. Six tests could not fail.** The recurring shapes, worth checking against
any new test here:

- **Asserting a transient state after it has been cleaned up.** The ownership
  test waited 1000ms and asserted `revealing`/`data-turned` were absent — but a
  full play is 590ms, so it asserted a play *finished*, not that none happened.
  Deleting the ownership gate left the rail playing a full reveal, green. Assert
  the *durable* evidence (`data-cycle`), not the transient one.
- **An empty subject satisfying a comparison.** The reduced-motion Tetris test
  compared the board's `innerHTML` before and after; an unrendered board
  compares `'' === ''`. It proved "nothing changed" and never "a frame is
  shown" — half its own claim. Assert the subject exists before comparing it.
- **A fixture in which the failure cannot arise.** "Does not create holes" used
  an O piece on an empty board, which cannot create a hole under any placement.
  Where a test's point is that a choice was made well, first assert the bad
  choice was *available*.
- **A test that never reads what it names.** "Computes correct adjacent-mine
  counts" asserted mine *placement* and never read `.adjacent`.
- **A comment describing a fixture the test never builds.** "Awards points for
  a cleared line" hard-dropped onto an empty board and asserted `score >= 0`.

The rule this repo now works to: a test is finished when you can name the
one-line production change that makes it fail — and ideally when you have made
that change and watched it go red.

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
- `npm run test:all` (**typecheck** + unit + build + e2e) is the real CI
  gate. Two things about that gate were themselves broken until they were
  fixed, both of which hid real bugs rather than causing them, and both
  worth not reintroducing:
  - `webServer.reuseExistingServer` was `!process.env.CI`. Any leftover
    `astro preview` (or a dev server) still holding port 4321 got reused,
    the `npm run build` in the webServer command never ran, and the whole
    suite scored a **stale dist while reporting green** — an entire
    evening's work once passed against a build that predated every change
    under test. It is now `false` always: e2e fails outright if something
    holds the port, which is the trade this repo wants. **Stop the dev
    server before running e2e.**
  - Nothing ran `tsc`. Despite "TypeScript strict", `astro build` does not
    typecheck, so a real `TS2353` sat unread in the tree — and it was the
    tell for a reduced-motion test that had never once tested reduced
    motion. `typecheck` now runs first in `test:all`.
- **One worktree, one agent at a time.** `npm run build` writes `dist/`, and
  `test:e2e` builds before it runs — so two agents working in this same
  worktree clobber each other's `dist/` and each other's results. It has
  already caused two real incidents: a `git add -A` swept another agent's
  live sabotage line into a commit (`5717a6e` removes it), and an e2e failure
  was misdiagnosed as a code bug when it was one agent's build being scored
  against another's source. If a review agent must run concurrently, give it
  its own worktree, and stage by path rather than `-A`.
  This sandbox's Chromium binary previously failed to launch (missing
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
