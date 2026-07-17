# Home scroll lock: Apple-style hand-rolled section snap

## Problem

Home's four sections (hero/bio/featured/teaching) currently rely on native
CSS `scroll-snap-type: y mandatory` (`global.css`) for section-to-section
navigation. Native snap has no duration/easing control and no way to lock
input during the transition — one wheel tick (or the tail of a trackpad's
momentum trail) snaps near-instantly, which reads as abrupt rather than the
deliberate, weighted "scroll lock" feel of reference sites like Apple's
product pages. Apple achieves that feel with a hand-rolled wheel-intercept
and animated scroll, not native CSS snap. This spec replaces native snap on
desktop with the same approach, while leaving mobile untouched.

## Scope

Desktop only (`min-width: 769px`), and only when
`prefers-reduced-motion: reduce` is not set. Mobile keeps its existing
native CSS scroll-snap behavior byte-for-byte, including the
`.mobile-nav { scroll-snap-align: start }` fix already in place for it.
Only Home (`index.astro`) has this section structure — no other route is
affected.

## Design

### New module: `src/lib/scrollLock.ts`

Pure logic only, no DOM — unit-tested with Vitest, per this repo's existing
lib/DOM-script split.

- `DURATION_MS = 700`
- `WHEEL_THRESHOLD = 2` (ignore `|deltaY|` below this — wheel-event noise)
- `easeInOutCubic(t: number): number` — standard cubic ease-in-out
  (`t < 0.5 ? 4*t**3 : 1 - (-2*t+2)**3/2`), not a literal solve of any CSS
  `cubic-bezier()` curve. Visually equivalent "slow-fast-slow" shape;
  trivial to assert exact values at `t = 0, 0.5, 1` in a test.
- `currentSectionIndex(scrollY: number, sectionTops: number[]): number` —
  index of the last section whose top is `<= scrollY` (with a small
  epsilon). Stateless: recomputed fresh from real scroll position every
  gesture rather than tracked across gestures, so it stays correct through
  hash-link jumps, resizes, or any other out-of-band scroll change.
- `nextSectionIndex(current: number, deltaY: number, count: number): number` —
  `current + 1` if `deltaY > 0`, `current - 1` if `deltaY < 0`, clamped to
  `[0, count - 1]`.

### DOM wiring: `index.astro`'s existing `<script>` block

The four sections gain a shared `data-scroll-section` attribute (additive —
existing `.hero`/`.bio`/`.featured`/`.teaching` classes are untouched) so
the script can query them generically instead of hardcoding four selectors.

Setup, once at load:

```
if (matchMedia('(min-width: 769px)').matches
    && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // attach the wheel listener below
}
```

This is a one-time check (matches the nameplate-flash script's existing
pattern elsewhere in this file) — it does not re-evaluate on resize or a
live `prefers-reduced-motion` change mid-session.

Per `wheel` event (`{ passive: false }`):

1. If a lock animation is already in flight: `preventDefault()` and return.
   This is the hard lock — every event during the 700ms transition,
   including a trackpad's momentum trail, is swallowed outright.
2. If `|event.deltaY| < WHEEL_THRESHOLD`: return without calling
   `preventDefault()` (noise, not a real gesture).
3. Compute `currentIndex = currentSectionIndex(window.scrollY, sectionTops)`
   fresh from the live section offsets.
4. **Footer handoff:** if `window.scrollY` is at or past the teaching
   section's bottom edge (i.e. the user has already scrolled into the
   seam/footer past the four locked sections), return without
   `preventDefault()` — native scroll owns that zone in both directions.
   This is what lets an upward flick from deep in the footer scroll
   normally instead of yanking the user back up into "featured."
5. Compute `target = nextSectionIndex(currentIndex, event.deltaY,
   sectionTops.length)`. If `target === currentIndex` (already at the
   first or last of the four sections and still pushing further in that
   direction): return without `preventDefault()` — this is the other half
   of the footer handoff, letting a downward flick from "teaching" continue
   into the footer.
6. Otherwise: `preventDefault()`, set the lock flag, and run a
   `requestAnimationFrame` loop scrolling from the current `scrollY` to
   `sectionTops[target]` over `DURATION_MS`, sampling `easeInOutCubic` each
   frame. Clear the lock flag when the loop completes.

`sectionTops` is recomputed (fresh `offsetTop` reads) at the start of each
new gesture that isn't immediately rejected by steps 1-2, so a resize
between gestures can't leave it stale.

### CSS changes (`global.css`)

`html { scroll-snap-type: y mandatory }` moves from unconditional to inside
a `@media (max-width: 768px)` block. `scroll-behavior: smooth` stays
unconditional (harmless on desktop now that JS drives the actual section
transitions; still relevant to any other in-page anchor scroll). The
existing `prefers-reduced-motion: reduce` block already zeroes
`scroll-snap-type`/`scroll-behavior` and needs no change — combined with
the JS setup check above, reduced-motion desktop now falls through to
plain native scroll with neither snap nor lock, matching mobile's own
reduced-motion behavior.

## Known limitation (accepted, not a bug to fix later)

Wheel-only scope means keyboard scrolling (PageDown/Space/arrows) and
focus-triggered scroll-into-view are not locked or animated on desktop.
Since desktop also loses native CSS snap, a keyboard-driven scroll can land
mid-section. This is an accepted trade-off of scoping the lock to wheel
input only, not an oversight.

## Testing

- Vitest (`src/lib/scrollLock.test.ts`): `easeInOutCubic` at `t = 0, 0.5,
  1` and a couple of intermediate points; `currentSectionIndex` across
  values before/at/between/after known offsets; `nextSectionIndex`
  clamping at both ends and normal increment/decrement.
- New `tests/e2e/scroll-lock.spec.ts`:
  - Desktop viewport: a synthetic wheel event moves `window.scrollY` to
    exactly the next section's `offsetTop` after the animation settles.
  - `prefers-reduced-motion: reduce` (desktop viewport): a wheel event
    produces native scroll behavior, not a locked jump.
  - Mobile viewport: unaffected — existing native-snap assertions in
    `nav.spec.ts`/`home.spec.ts` continue to pass unmodified, plus a
    check that no JS lock attaches (e.g. a wheel-equivalent scroll isn't
    forced to a section boundary).
  - This sandbox's Playwright now runs for real (per `CLAUDE.md` Status) —
    expect a real e2e run this pass, not just unit tests + build.

## Out of scope

- No change to mobile's scroll behavior at all.
- No change to any route other than Home.
- No keyboard or touch/swipe interception (see Known limitation above).
- No change to the hero's existing 10vh "peek" design — first-load peek is
  unaffected since it's a static layout property, not scroll-driven.
