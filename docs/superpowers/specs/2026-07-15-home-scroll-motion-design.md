# Home scroll motion — reveal on entry + parallax, replacing the scroll lock

**Date:** 2026-07-15
**Supersedes:** `2026-07-14-home-scroll-lock-design.md` (that pass's feature is removed by this one)

## Problem

Home's four sections (hero, bio, featured, teaching) currently animate
nothing. The ask was scroll animations; two directions were mocked and
compared live: reveal-on-entry (content rises into place as a section
arrives) and parallax (layers drift at different rates).

Parallax read as janky and hard to see in the mock. Measurement showed why,
and it wasn't performance.

## Why the scroll lock has to go

The scroll lock (`src/lib/scrollLock.ts` + `index.astro`'s wheel listener)
swallows every wheel event and animates section-to-section over 700ms. That
is structurally incompatible with parallax, not merely badly tuned:

- Parallax earns depth from **continuous coupling to visitor input** — you
  scroll a little, layers separate a little, and the rate difference is
  legible because you are driving it.
- The lock **removes that input entirely**. Between two dead stops it moves
  the page at a fixed rate. Parallax degrades into a 700ms burst of relative
  motion, four times per page.

Measured on the mock (real `scrollLock.ts` math, real tokens, real washes and
blurred seams; headless Chromium, 1440x900, one hero→bio travel per mode):

| mode | median frame | worst frame | frames >20ms | long tasks | board drift |
|---|---|---|---|---|---|
| none | 16.7ms | 16.8ms | 0 | 0 | 0px |
| reveal | 16.7ms | 16.8ms | 0 | 0 | 0px |
| parallax | 16.7ms | 16.8ms | 0 | 0 | 131px |
| both | 16.7ms | 16.8ms | 0 | 0 | 131px |

Locked 60fps in every mode — zero dropped frames, zero long tasks. An
earlier hypothesis that the `filter: blur(40px)` seams and the ~168-cell
masked board were repaint-expensive was **disproved**; they cost nothing
measurable. Layer promotion has nothing to fix.

The geometry is the finding: the board drifts **131px** while the page
itself scrolls **819px** in the same 700ms. Parallax moves at ~16% of the
page's own speed, in the same direction, during the only window in which
anything moves at all. The depth cue is drowned by the scroll it exists to
differentiate from. No strength value fixes this — at 3x the board visibly
detaches from the hero instead of reading as depth.

Both features cannot coexist. The lock is removed; parallax and reveal both
ship on native scroll.

Caveat recorded honestly: headless Chromium in WSL2 is not the author's
Windows GPU. What the trace proves is that the **main thread is idle**
(0 long tasks, 16.7ms median) — that part is device-independent. It cannot
prove compositing parity on real hardware. The "hard to see" conclusion is a
geometry result, which is device-independent.

## What replaces the lock on desktop

`html { scroll-snap-type: y proximity }` inside a `min-width: 769px` block,
with the sections' existing `scroll-snap-align: start` kept.

Proximity snap lets the visitor scroll freely — so parallax couples the whole
way — and settles to the nearest section only when they stop near one. It
keeps a sectioned rhythm without hijacking input. Mandatory snap was
considered and rejected: it fires its own scroll animation on every gesture
and would re-create the same conflict in a milder form.

Mobile is untouched. `global.css`'s `scroll-snap-type: y mandatory` already
lives in a `max-width: 768px` block, and `MobileNav.astro`'s
`scroll-snap-align: start` is the fix for the force-snap-past-the-hamburger
bug — both stay exactly as they are.

## Architecture

Follows the established two-layer pattern: pure logic in `src/lib/`
(unit-tested, no DOM), DOM wiring in the component's `<script>` (e2e-tested).

### `src/lib/parallax.ts` (new, pure)

```ts
export const MAX_SHIFT_PX = 200;
export function parallaxShift(
  scrollY: number, sectionTop: number, depth: number, strength?: number
): number;
```

`(scrollY - sectionTop) * depth * strength`, clamped to `±MAX_SHIFT_PX`.

Depth is a **rate, not a distance**: an element drifts by its own depth times
how far its section has travelled past the viewport top. This makes the
element sit at exactly its design position when the section is settled
(`scrollY === sectionTop` → shift `0`), so no layout drift accumulates across
four sections and the reveal's own resting `0px` stays true.

The clamp is not defensive padding — it fixes a real bug observed in the
trace. Shift is computed from the section's own top with no bound, so with
the visitor parked at `teaching` the hero's board still computed a 390px
shift while scrolled entirely off-screen. Parallax is additionally gated to
sections currently intersecting the viewport (see below), and the clamp
bounds the transform regardless.

### `src/pages/index.astro` (DOM wiring)

- **Parallax:** one `scroll` listener, rAF-throttled, writing `--parallax-y`
  as an inline custom property on each `[data-depth]` element whose host
  section currently intersects the viewport. An `IntersectionObserver`
  maintains the visible-section set so off-screen sections cost nothing.
- **Reveal:** a second `IntersectionObserver` adds `.in` to a section as it
  enters, which drives its `[data-reveal]` children from offset+transparent
  to resting. Staggered via `transition-delay` stamped per child index.

### Composing the two transforms

Both effects want `translateY` on the same elements. Naively, one clobbers
the other. Both offsets ride a single transform through two registered
custom properties:

```css
@property --reveal-y   { syntax: '<length>'; inherits: false; initial-value: 0px; }
@property --reveal-o   { syntax: '<number>'; inherits: false; initial-value: 1; }

[data-reveal], [data-depth] {
  transform: translateY(calc(var(--reveal-y) + var(--parallax-y, 0px)));
}
```

`@property` registration is what makes `--reveal-y` transitionable — an
unregistered custom property is untyped and jumps rather than animating.

**The selector must cover both attributes.** The mock's first version scoped
the transform to `[data-reveal]` only; the Tetris board carries `data-depth`
but no `data-reveal`, so JS set `--parallax-y` on it every frame and nothing
consumed it. The board never moved, silently — no error, no warning. A
custom property with no consumer fails quietly and looks like a taste
problem rather than a bug. Whatever ships, the producer and consumer of
`--parallax-y` must be provably the same set of elements.

## Layers and values

Ported from the approved mock as **starting points to tune live**, per this
repo's convention that these values are hand-picked against screenshots, not
computed.

| Element | `data-depth` | Note |
|---|---|---|
| Tetris board | 0.16 | fastest; the depth anchor |
| hero copy | 0.05 | slow layer against the board |
| bio headshot | 0.10 | leads its copy |
| bio copy | 0.03 | |
| project cards | 0.05 / 0.08 / 0.11 | staggered depth — cards fan slightly |
| teaching inner | 0.06 | |

Reveal: rise `28px`, stagger `70ms` per child, transform `620ms
cubic-bezier(0.22, 1, 0.36, 1)`, opacity `520ms ease-out`. Fires once per
section per page load (not replayed on re-entry).

The hero does not animate on load. Astro's `<script>` is `type="module"` and
runs after the DOM paints, so applying the hidden state to already-visible
content would transition it *out* before bringing it back in — a flash on
every load. Any section on screen when the script runs is already entered, and
is marked resting synchronously before the hidden state can apply to it.
Reveal is an on-entry effect; the hero has entered.

The three project cards are one layer (`.project-grid`, depth `0.08`) rather
than the mock's individual `0.05 / 0.08 / 0.11` fan. Cards are `<ProjectCard />`
components rendered from a `.map()`, and this codebase has already been bitten
once by adding a display prop to that component and having it leak onto Home
(the `showCover` bug). The grid takes the fan's midpoint. If the fan proves to
matter visually, it earns its own decision rather than a silent prop.

## Accessibility

- Under `prefers-reduced-motion: reduce`, neither observer nor the scroll
  listener attaches, and content renders at its resting position with full
  opacity. Same convention as the Tetris ambient loop's reduced-motion
  freeze. `global.css`'s existing reduced-motion block already sets
  `scroll-snap-type: none`.
- Parallax is desktop-only (`min-width: 769px`) — its anchor layer, the
  Tetris board, is `display: none` below that breakpoint, so mobile parallax
  would animate almost nothing at real cost.
- Reveal runs at every width; it is opacity/transform only and does not
  gate content on JS. If the script never runs, everything renders normally.
- Reveal must never be the only way information is conveyed — it is
  presentation of content already present in the DOM.

## Testing

- **Unit (Vitest):** `src/lib/parallax.test.ts` — zero shift at rest,
  sign/magnitude either side of rest, depth and strength scaling, clamp at
  `±MAX_SHIFT_PX`.
- **E2E (Playwright):** `tests/e2e/scroll-lock.spec.ts` is deleted wholesale
  and replaced by `tests/e2e/scroll-motion.spec.ts` — a wheel gesture scrolls
  natively (no lock swallowing it); a section gains `.in` on entry;
  `--parallax-y` on the board changes across a scroll and is `0px`/absent at
  rest; reduced-motion leaves content at rest with no `.in` dependency;
  parallax does not attach below 769px.
- `npm run test:all` is the gate. This machine's `LD_LIBRARY_PATH` fix means
  Playwright runs here.

## Removal footprint

Deleted:

- `src/lib/scrollLock.ts`, `src/lib/scrollLock.test.ts` (12 unit tests)
- `index.astro`'s wheel-intercept `<script>` in full
- `tests/e2e/scroll-lock.spec.ts`

Kept, despite belonging to the lock's pass:

- the four sections' `scroll-snap-align: start` rules — proximity snap
  consumes them, so they stop being inert on desktop rather than going away
- CLAUDE.md's scroll-lock paragraph, rewritten to describe this pass

The scroll-lock spec and plan docs stay in `docs/` as history — this spec
supersedes them rather than deleting them.

## Known limitations (accepted)

- Proximity snap's settle behavior is browser-implemented and not tunable;
  it will feel slightly different across engines. Accepted as the cost of
  dropping 12 unit tests' worth of hand-rolled scroll code.
- Parallax is wheel/touch/keyboard-agnostic because it reads `scrollY`
  rather than intercepting input — a strict improvement over the lock, which
  was wheel-only.
