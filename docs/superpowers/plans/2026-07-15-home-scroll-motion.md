# Home Scroll Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Home's wheel-intercept scroll lock and replace it with native desktop proximity snap, then add two scroll animations the lock made impossible: reveal-on-entry and parallax.

**Architecture:** The scroll lock and parallax are structurally incompatible — the lock swallows the continuous input parallax needs to read as depth (measured: board drifts 131px while the lock scrolls the page 819px in the same 700ms, at a locked 60fps). The lock comes out entirely; desktop gets `scroll-snap-type: y proximity`, which settles to a section only when the visitor stops near one and never hijacks a gesture. Parallax math lives in a new pure `src/lib/parallax.ts` (unit-tested); both animations wire up in `index.astro`'s `<script>` blocks (e2e-tested), following this repo's established pure-logic/DOM-wiring split.

**Tech Stack:** Astro, TypeScript strict, Vitest (unit), `@playwright/test` + `@axe-core/playwright` (e2e). CSS `@property`, `IntersectionObserver`, native CSS scroll-snap.

**Spec:** `docs/superpowers/specs/2026-07-15-home-scroll-motion-design.md` — read it first, especially "Why the scroll lock has to go" (the measurements) and "Composing the two transforms" (the silent-failure bug this plan is designed around).

## Global Constraints

- **All motion CSS for this pass goes in `src/styles/global.css`, not `index.astro`'s scoped `<style>`.** Two Astro scoping traps make the scoped block wrong here: (1) a `body[...]` selector in a component's scoped style gets rewritten to `body[data-astro-cid-*]` and silently never matches, because `<body>` lives in `BaseLayout.astro`, not this component; (2) the Tetris board's root element is authored in `TetrisHero.astro` and carries *that* component's cid, so `index.astro`'s scoped rules can never reach it. The rules are attribute-gated (`[data-reveal]`, `[data-depth]`), so putting them in `global.css` only affects elements that opt in.
- **The `--parallax-y` producer and consumer must be the same set of elements.** The mock scoped the transform to `[data-reveal]` only; the Tetris board carries `data-depth` but no `data-reveal`, so JS wrote `--parallax-y` to it every frame and nothing consumed it. The board never moved — no error, no warning. A custom property with no consumer fails silently. Any selector change here must keep `[data-reveal], [data-depth]` in sync.
- **Reveal's hidden state must be gated on JS + motion.** CSS hides `[data-reveal]` content only under `body[data-motion='on']`, and JS sets that attribute only after confirming `prefers-reduced-motion` is not `reduce`. If the script never runs, or motion is reduced, content renders normally. Never ship a rule that can leave content at `opacity: 0` when JS is absent.
- **Never read `offsetTop` inside the scroll handler.** It forces a synchronous layout every frame. Cache section tops and refresh from a debounced `resize` listener — the same pattern `TetrisHero.astro`'s `setupAmbientBoard()` already uses.
- Mobile (`max-width: 768px`) behavior is unchanged by this pass: `global.css`'s `scroll-snap-type: y mandatory` and `MobileNav.astro`'s `scroll-snap-align: start` (the fix for the force-snap-past-the-hamburger bug) both stay exactly as-is.
- Values ported from the approved mock are **starting points to tune live**, per this repo's convention that these are hand-picked against screenshots, not computed.
- `npm run test:all` is the real gate. This machine has the `LD_LIBRARY_PATH`/`libnspr4` fix, so Playwright runs here.
- Baseline before this plan: **79 unit tests passing, 10 test files.**

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/lib/scrollLock.ts` | **deleted** — lock math | 1 |
| `src/lib/scrollLock.test.ts` | **deleted** — 12 unit tests | 1 |
| `tests/e2e/scroll-lock.spec.ts` | **deleted** — replaced by `scroll-motion.spec.ts` | 1 |
| `src/styles/global.css` | desktop proximity snap; all motion CSS (`@property`, transform composition, reveal states) | 1, 3 |
| `src/pages/index.astro` | lock `<script>` removed; `data-reveal`/`data-depth` attributes; reveal + parallax wiring | 1, 3, 4 |
| `src/lib/parallax.ts` | **new** — pure shift math | 2 |
| `src/lib/parallax.test.ts` | **new** — unit tests for the above | 2 |
| `src/components/TetrisHero.astro` | `data-depth` on the board root | 4 |
| `tests/e2e/scroll-motion.spec.ts` | **new** — native scroll, snap, reveal, parallax, reduced motion, mobile | 1, 3, 4 |
| `CLAUDE.md` | rewrite the scroll-lock paragraph to describe this pass | 5 |

---

### Task 1: Remove the scroll lock, add desktop proximity snap

**Files:**
- Delete: `src/lib/scrollLock.ts`
- Delete: `src/lib/scrollLock.test.ts`
- Delete: `tests/e2e/scroll-lock.spec.ts`
- Modify: `src/pages/index.astro` (remove the second `<script>` block — the one importing from `../lib/scrollLock`)
- Modify: `src/styles/global.css:7-11` (add a desktop block after the existing mobile one)
- Test: `tests/e2e/scroll-motion.spec.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: Home with no wheel interception; `html` computes `scroll-snap-type: y proximity` at `>=769px` and `y mandatory` at `<=768px`. The four sections keep their existing `scroll-snap-align: start` — inert on desktop until now, consumed by proximity snap from here on.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/scroll-motion.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('desktop no longer intercepts the wheel — nothing calls preventDefault', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // Mirrors the deleted scroll-lock spec's own logic, inverted. Per the DOM
  // spec, dispatchEvent() returns false when a listener called
  // preventDefault() on a cancelable event. With the lock gone, no listener
  // on Home may cancel a wheel event in any direction.
  const notCancelled = await page.evaluate(() =>
    window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 400, cancelable: true, bubbles: true })
    )
  );
  expect(notCancelled).toBe(true);
});

test('desktop uses native proximity snap', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const snapType = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollSnapType
  );
  expect(snapType).toBe('y proximity');
});

test('mobile keeps its mandatory snap untouched', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const snapType = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollSnapType
  );
  expect(snapType).toBe('y mandatory');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/scroll-motion.spec.ts --reporter=line`

Expected: FAIL. The wheel test fails because the lock still cancels the event (`notCancelled` is `false`); the proximity test fails because desktop currently computes `scroll-snap-type: none`.

- [ ] **Step 3: Delete the lock's three files**

```bash
git rm src/lib/scrollLock.ts src/lib/scrollLock.test.ts tests/e2e/scroll-lock.spec.ts
```

- [ ] **Step 4: Remove the lock's script block from `index.astro`**

Delete the **entire** second `<script>` block — the one beginning:

```
<script>
  import {
    DURATION_MS,
    WHEEL_THRESHOLD,
    easeInOutCubic,
    currentSectionIndex,
    nextSectionIndex,
  } from '../lib/scrollLock';
```

...through its closing `</script>`. It is the last element in the file.

Leave untouched: the first `<script>` block (the nameplate flash), every `<style>` rule including the four `scroll-snap-align: start` declarations, and all markup.

- [ ] **Step 5: Add desktop proximity snap to `global.css`**

Directly after the existing mobile block at `src/styles/global.css:7-11`, add:

```css
/* Desktop replacement for the removed wheel-intercept scroll lock. Proximity
   (not mandatory) is deliberate: mandatory fires its own scroll animation on
   every gesture, which would yank the parallax layers mid-drift and re-create
   the exact conflict the lock had. Proximity leaves the gesture alone and only
   settles when the visitor stops near a section. */
@media (min-width: 769px) {
  html {
    scroll-snap-type: y proximity;
  }
}
```

- [ ] **Step 6: Run the e2e test to verify it passes**

Run: `npx playwright test tests/e2e/scroll-motion.spec.ts --reporter=line`

Expected: PASS, 3 tests.

- [ ] **Step 7: Run the unit suite and confirm the expected drop**

Run: `npx vitest run --reporter=basic`

Expected: **67 tests passing, 9 test files** (was 79 / 10 — the 12 `scrollLock.test.ts` tests are gone by design, not by regression).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: replace Home's scroll lock with native desktop proximity snap

The lock swallowed every wheel event to animate section-to-section over
700ms, which is structurally incompatible with parallax: parallax reads as
depth only when continuously coupled to visitor input, and the lock removes
that input. Proximity snap keeps a sectioned rhythm without hijacking the
gesture.

Drops scrollLock.ts and its 12 unit tests (79 -> 67).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Pure parallax shift math

**Files:**
- Create: `src/lib/parallax.ts`
- Test: `src/lib/parallax.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MAX_SHIFT_PX: number` (200) and `parallaxShift(scrollY: number, sectionTop: number, depth: number, strength?: number): number`. Task 4 imports both.

- [ ] **Step 1: Write the failing test**

Create `src/lib/parallax.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parallaxShift, MAX_SHIFT_PX } from './parallax';

describe('parallaxShift', () => {
  it('is zero when the section is settled at the top of the viewport', () => {
    // Depth is a rate, not a distance: at rest the element must sit at
    // exactly its design position, so the reveal's own resting 0px stays
    // true and no drift accumulates across sections.
    expect(parallaxShift(800, 800, 0.16)).toBe(0);
  });

  it('drifts positive once the section has travelled past the viewport top', () => {
    expect(parallaxShift(900, 800, 0.1)).toBeCloseTo(10, 5);
  });

  it('drifts negative while the section is still below the viewport top', () => {
    expect(parallaxShift(700, 800, 0.1)).toBeCloseTo(-10, 5);
  });

  it('scales with depth', () => {
    expect(parallaxShift(900, 800, 0.05)).toBeCloseTo(5, 5);
    expect(parallaxShift(900, 800, 0.16)).toBeCloseTo(16, 5);
  });

  it('scales with strength, defaulting to 1', () => {
    expect(parallaxShift(900, 800, 0.1)).toBeCloseTo(10, 5);
    expect(parallaxShift(900, 800, 0.1, 2)).toBeCloseTo(20, 5);
    expect(parallaxShift(900, 800, 0.1, 0)).toBe(0);
  });

  it('clamps a far-offscreen section to +MAX_SHIFT_PX', () => {
    // Observed for real while tracing the mock: parked at "teaching", the
    // hero's board still computed a 390px shift while scrolled entirely
    // off-screen. Unbounded shift is a bug, not a tuning question.
    expect(parallaxShift(3000, 0, 0.16)).toBe(MAX_SHIFT_PX);
  });

  it('clamps symmetrically to -MAX_SHIFT_PX', () => {
    expect(parallaxShift(0, 3000, 0.16)).toBe(-MAX_SHIFT_PX);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/parallax.test.ts --reporter=basic`

Expected: FAIL — `Failed to load url ./parallax` / cannot find module.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/parallax.ts`:

```ts
// Bounds how far any layer may drift from its design position. Not defensive
// padding: while tracing the mock, a section parked four screens away still
// computed a 390px shift for the hero's Tetris board, because shift is derived
// from the section's own top with no bound. Task 4 additionally skips layers
// whose section isn't intersecting the viewport; this is the second belt.
export const MAX_SHIFT_PX = 200;

/**
 * How far a parallax layer should be offset from its design position.
 *
 * `depth` is a rate, not a distance: the layer drifts by its own depth times
 * how far its section has travelled past the viewport top. That makes the
 * shift exactly 0 when the section is settled (scrollY === sectionTop), so
 * layers rest where they were designed to sit and nothing accumulates across
 * Home's four sections.
 */
export function parallaxShift(
  scrollY: number,
  sectionTop: number,
  depth: number,
  strength = 1
): number {
  const shift = (scrollY - sectionTop) * depth * strength;
  return Math.min(MAX_SHIFT_PX, Math.max(-MAX_SHIFT_PX, shift));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/parallax.test.ts --reporter=basic`

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parallax.ts src/lib/parallax.test.ts
git commit -m "feat: add pure parallax shift math

Depth as a rate rather than a distance, so a settled section's layers rest
at exactly their design position. Clamped to +/-200px — an unbounded shift
computed 390px for an off-screen board during mock tracing.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Reveal on section entry

**Files:**
- Modify: `src/styles/global.css` (append the motion block at end of file)
- Modify: `src/pages/index.astro` (add `data-reveal` attributes; add a reveal `<script>`)
- Test: `tests/e2e/scroll-motion.spec.ts` (append two tests)

**Interfaces:**
- Consumes: Task 1's removal of the lock script.
- Produces: `body[data-motion='on']` set by JS when motion is allowed; `.in` added to a `[data-scroll-section]` as it enters the viewport; `[data-reveal]` children transition from offset+transparent to resting, staggered by DOM index. Task 4 relies on the `@property` declarations and the shared `[data-reveal], [data-depth]` transform rule added here.
- Consequence worth knowing: **the hero does not animate on load.** It is on screen when the script runs, so it is marked resting synchronously (Step 5) to avoid a load flash. Reveal is an on-*entry* effect, and the hero is already entered. If a deliberate hero load-in is wanted later, it needs its own mechanism — do not get it by removing the synchronous mark.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/scroll-motion.spec.ts`:

```ts
test('a section reveals its contents on entry', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const bio = page.locator('.bio');
  await expect(bio).not.toHaveClass(/\bin\b/);

  await bio.scrollIntoViewIfNeeded();
  await expect(bio).toHaveClass(/\bin\b/);

  // The reveal must actually resolve to resting, not just flip a class.
  const heading = bio.locator('h2');
  await expect
    .poll(async () => (await heading.evaluate((el) => getComputedStyle(el).opacity)))
    .toBe('1');
});

test('reduced motion renders content at rest with no reveal gating', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // The hidden state is gated on body[data-motion='on'], which JS must not
  // set under reduced motion — otherwise content could sit at opacity 0
  // forever. This is the failure mode worth a test of its own.
  const motion = await page.evaluate(() => document.body.dataset.motion);
  expect(motion).toBeUndefined();

  const opacity = await page
    .locator('.bio h2')
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe('1');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/scroll-motion.spec.ts --reporter=line`

Expected: FAIL on the first new test — `.bio` never gains the `in` class. (The reduced-motion test may pass vacuously right now; it must still pass at the end.)

- [ ] **Step 3: Add the motion CSS to `global.css`**

Append to the end of `src/styles/global.css`:

```css
/* ── Home scroll motion ──────────────────────────────────────────────────
   Lives here rather than in index.astro's scoped <style> for two reasons,
   both real Astro scoping traps: a `body[...]` selector in a component's
   scoped block gets rewritten to body[data-astro-cid-*] and silently never
   matches (<body> belongs to BaseLayout.astro), and the Tetris board's root
   is authored in TetrisHero.astro under that component's own cid, out of
   index.astro's reach. Everything below is attribute-gated, so it only
   touches elements that opt in. */

/* Registered so they can be transitioned — an unregistered custom property is
   untyped and jumps instead of animating. */
@property --reveal-y {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}
@property --reveal-o {
  syntax: '<number>';
  inherits: false;
  initial-value: 1;
}

/* Reveal and parallax both want translateY on the same elements; each rides
   its own custom property into one transform so neither clobbers the other.
   BOTH attributes must stay in this selector: the mock scoped it to
   [data-reveal] only, and the Tetris board (data-depth, no data-reveal) had
   --parallax-y written to it every frame with nothing consuming it — it
   silently never moved. */
[data-reveal],
[data-depth] {
  transform: translateY(calc(var(--reveal-y) + var(--parallax-y, 0px)));
}

/* The hidden state is gated on an attribute JS sets only when motion is
   allowed, so content is never left invisible if the script doesn't run. */
body[data-motion='on'] [data-reveal] {
  --reveal-y: 28px;
  --reveal-o: 0;
  opacity: var(--reveal-o);
  transition:
    --reveal-y 620ms cubic-bezier(0.22, 1, 0.36, 1),
    --reveal-o 520ms ease-out;
}
body[data-motion='on'] [data-scroll-section].in [data-reveal] {
  --reveal-y: 0px;
  --reveal-o: 1;
}
```

- [ ] **Step 4: Add `data-reveal` attributes in `index.astro`**

In the markup only, add a bare `data-reveal` attribute to each of these elements. Order within a section determines its stagger, so do not reorder anything.

- `.hero`: the `.nameplate` button, the `.eyebrow` paragraph, the `h1`
- `.bio`: the `.bio-frame` div, and inside `.bio-copy` — the `.eyebrow`, the `h2`, the `.lede`, the `.detail`
- `.featured`: the `h2`, and each of the three `<ProjectCard />` call sites is **not** touched (a card is a component; see Task 4 for why the grid gets depth instead)
- `.teaching`: the `.eyebrow`, the `h2`, the `.detail`

Example — the hero's copy becomes:

```astro
    <div class="hero-copy">
      <button class="nameplate" id="nameplate" type="button" data-reveal>
        <span class="ch j-piece">J</span><span class="ch o-piece">O</span><span class="ch">H</span><span class="ch">N</span><span class="ch sp">&nbsp;</span><span class="ch">N</span><span class="ch">G</span>
      </button>
      <p class="eyebrow" data-reveal>Software Engineer</p>
      <h1 data-reveal>Coding practical solutions for people. That's always been the point.</h1>
    </div>
```

- [ ] **Step 5: Add the reveal script to `index.astro`**

Append a new `<script>` block at the end of the file:

```astro
<script>
  const REVEAL_STAGGER_MS = 70;
  const REVEAL_THRESHOLD = 0.15;

  // Same reduced-motion convention as the Tetris ambient loop: check once,
  // and if motion is reduced simply never attach — global.css's hidden state
  // is gated on the attribute set below, so content renders normally.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-scroll-section]')
    );

    // Astro's <script> is type="module", so it runs AFTER the DOM has painted.
    // Setting data-motion first would apply the hidden state to already-visible
    // content and transition it OUT before the observer brought it back in — a
    // flash on every load. Any section on screen right now is, by definition,
    // already entered: mark it resting synchronously, before the hidden state
    // can ever apply to it. Off-screen sections flip to hidden invisibly.
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        section.classList.add('in');
      }
    });

    document.body.dataset.motion = 'on';

    sections.forEach((section) => {
      const items = Array.from(
        section.querySelectorAll<HTMLElement>('[data-reveal]')
      );
      items.forEach((el, i) => {
        el.style.transitionDelay = `${i * REVEAL_STAGGER_MS}ms`;
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          // Fires once per section per page load — no replay on re-entry.
          observer.unobserve(entry.target);
        });
      },
      { threshold: REVEAL_THRESHOLD }
    );

    // Sections marked resting above are already done; observing them would
    // only re-add a class they carry.
    sections
      .filter((section) => !section.classList.contains('in'))
      .forEach((section) => observer.observe(section));
  }
</script>
```

- [ ] **Step 6: Run the e2e tests to verify they pass**

Run: `npx playwright test tests/e2e/scroll-motion.spec.ts --reporter=line`

Expected: PASS, 5 tests.

- [ ] **Step 7: Run the accessibility sweep — it must stay green**

Run: `npx playwright test tests/e2e/accessibility.spec.ts --reporter=line`

Expected: PASS. Reveal is presentation of content already in the DOM; if this suite reports a violation, the reveal is gating content and the approach is wrong — stop and escalate rather than adjusting the test.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: reveal Home's section contents on entry

IntersectionObserver adds .in per section; children rise from 28px and fade
in, staggered 70ms by DOM order. The hidden state is gated on a body
attribute JS sets only when motion is allowed, so content is never left
invisible when the script doesn't run or motion is reduced.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Parallax layers

**Files:**
- Modify: `src/components/TetrisHero.astro:1` (add `data-depth` to the board root)
- Modify: `src/pages/index.astro` (add `data-depth` attributes; add a parallax `<script>`)
- Test: `tests/e2e/scroll-motion.spec.ts` (append two tests)

**Interfaces:**
- Consumes: `parallaxShift`, `MAX_SHIFT_PX` from `src/lib/parallax.ts` (Task 2); the `[data-reveal], [data-depth]` transform rule and `@property` declarations from `global.css` (Task 3).
- Produces: `--parallax-y` written as an inline custom property on each `[data-depth]` element whose host section is intersecting the viewport. Desktop-only.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/scroll-motion.spec.ts`:

```ts
test('the Tetris board drifts against the hero copy as the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const readShift = (selector: string) =>
    page
      .locator(selector)
      .evaluate((el) =>
        parseFloat(getComputedStyle(el).getPropertyValue('--parallax-y')) || 0
      );

  // At rest at the top of the hero, every layer sits at its design position.
  expect(await readShift('#tetris-hero')).toBe(0);

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
  await page.waitForFunction(
    () =>
      parseFloat(
        getComputedStyle(document.querySelector('#tetris-hero')!).getPropertyValue(
          '--parallax-y'
        )
      ) > 0,
    undefined,
    { timeout: 2000 }
  );

  const board = await readShift('#tetris-hero');
  const copy = await readShift('.hero-copy');

  // The effect IS the rate difference — a board that moves identically to the
  // copy is not parallax, so assert separation, not just movement.
  expect(board).toBeGreaterThan(copy);
  expect(Math.abs(board)).toBeLessThanOrEqual(200);
});

test('parallax does not attach below the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
  await page.waitForTimeout(300);

  // The board is display:none under 769px, so its depth layer would animate
  // almost nothing at real cost.
  const shift = await page
    .locator('.hero-copy')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--parallax-y').trim());
  expect(shift === '' || shift === '0px').toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/scroll-motion.spec.ts --reporter=line`

Expected: FAIL — `--parallax-y` is never set, so the `waitForFunction` times out.

- [ ] **Step 3: Add `data-depth` to the Tetris board root**

In `src/components/TetrisHero.astro`, line 1 becomes:

```astro
<div class="tetris-hero" id="tetris-hero" data-depth="0.16">
```

The root is already `position: absolute`, so it already establishes the containing block its absolutely-positioned children resolve against — adding a transform does not move them relative to it.

- [ ] **Step 4: Add `data-depth` attributes in `index.astro`**

Add to the markup:

- `.hero-copy` → `data-depth="0.05"`
- `.bio-frame` → `data-depth="0.1"` (this element also carries `data-reveal` from Task 3 — both, on the same element)
- `.bio-copy` → `data-depth="0.03"`
- `.project-grid` → `data-depth="0.08"`
- `.teaching-inner` → `data-depth="0.06"`

The mock fanned the three project cards at `0.05 / 0.08 / 0.11` individually. Cards are `<ProjectCard />` components rendered from a `.map()`, and Home deliberately does not pass them display props (see CLAUDE.md's `showCover` note — a prop added for `/projects` leaked onto Home). Depth goes on the grid instead, at the fan's midpoint. If the fan turns out to matter visually, that is a follow-up worth its own decision, not a silent prop addition here.

- [ ] **Step 5: Add the parallax script to `index.astro`**

Append a new `<script>` block at the end of the file:

```astro
<script>
  import { parallaxShift } from '../lib/parallax';

  const PARALLAX_MIN_WIDTH_PX = 769;
  const RESIZE_DEBOUNCE_MS = 150;

  if (
    matchMedia(`(min-width: ${PARALLAX_MIN_WIDTH_PX}px)`).matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    const layers = Array.from(document.querySelectorAll<HTMLElement>('[data-depth]'));
    const sectionTops = new Map<HTMLElement, number>();
    const visible = new Set<HTMLElement>();

    function hostOf(el: HTMLElement): HTMLElement | null {
      return el.closest<HTMLElement>('[data-scroll-section]');
    }

    // offsetTop forces a synchronous layout, so it is read here and on resize —
    // never inside the scroll handler. Same reasoning as TetrisHero.astro's
    // setupAmbientBoard().
    function refreshTops(): void {
      sectionTops.clear();
      document
        .querySelectorAll<HTMLElement>('[data-scroll-section]')
        .forEach((section) => sectionTops.set(section, section.offsetTop));
    }

    function applyParallax(): void {
      const scrollY = window.scrollY;
      for (const el of layers) {
        const host = hostOf(el);
        if (!host || !visible.has(host)) continue;
        const top = sectionTops.get(host);
        if (top === undefined) continue;
        const shift = parallaxShift(scrollY, top, Number(el.dataset.depth));
        el.style.setProperty('--parallax-y', `${shift.toFixed(2)}px`);
      }
    }

    // Off-screen sections cost nothing: their layers are skipped entirely
    // rather than transformed where nobody can see them.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target as HTMLElement;
        if (entry.isIntersecting) visible.add(section);
        else visible.delete(section);
      });
      applyParallax();
    });
    document
      .querySelectorAll<HTMLElement>('[data-scroll-section]')
      .forEach((section) => observer.observe(section));

    let queued = false;
    window.addEventListener(
      'scroll',
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          applyParallax();
        });
      },
      { passive: true }
    );

    let resizeTimer: number | undefined;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        refreshTops();
        applyParallax();
      }, RESIZE_DEBOUNCE_MS);
    });

    refreshTops();
    applyParallax();
  }
</script>
```

- [ ] **Step 6: Run the e2e tests to verify they pass**

Run: `npx playwright test tests/e2e/scroll-motion.spec.ts --reporter=line`

Expected: PASS, 7 tests.

- [ ] **Step 7: Run the full gate**

Run: `npm run test:all`

Expected: **74 unit tests passing** (67 after Task 1, plus Task 2's 7), a clean production build, and the full Playwright/axe suite green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add parallax depth layers to Home

Board 0.16 against hero copy 0.05; headshot 0.1 against bio copy 0.03;
project grid 0.08; teaching 0.06. Layers whose section is off-screen are
skipped via IntersectionObserver, and section tops are cached rather than
read per frame.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (the scroll-lock paragraph in Status, beginning "A further pass (spec: `docs/superpowers/specs/2026-07-14-home-scroll-lock-design.md`...")

**Interfaces:**
- Consumes: Tasks 1-4, complete and committed.
- Produces: documentation matching what is actually built.

- [ ] **Step 1: Rewrite the scroll-lock paragraph**

Replace that paragraph with one describing this pass. It must record:

- The lock is **removed**, and why it is not a reversal but a resolved conflict: parallax reads as depth only under continuous input coupling, and the lock's whole purpose was removing that coupling. Both cannot hold.
- The measurement that settled it, with numbers: locked 60fps in all four modes (16.7ms median, 0 frames >20ms, 0 long tasks), so it was **never** a performance problem — the board drifts 131px while the lock scrolls the page 819px in the same 700ms, and the depth cue drowns in the scroll it exists to differentiate from.
- The disproved hypothesis, explicitly: the `filter: blur(40px)` seams and the ~168-cell masked board were suspected of being repaint-expensive and measured as costing nothing. Worth recording so nobody re-suspects them.
- Desktop now uses `scroll-snap-type: y proximity`; mandatory was rejected because it fires its own scroll animation per gesture and would re-create the conflict in milder form. Mobile is untouched.
- The silent-failure bug from the mock: a `--parallax-y` written by JS with no CSS consumer produces no error and looks like a taste problem. The `[data-reveal], [data-depth]` selector is load-bearing.
- Unit count moved 79 → 74 (12 scroll-lock tests deleted, 7 parallax tests added).
- The invalid first trace, and why: Chromium restores scroll position across `reload()`, so each mode silently measured a *different* section pair and the `both` run measured no travel at all. Reruns must force `scrollY` to 0.

Also update: the **Architecture pattern** section's `src/lib/` list (drop `scrollLock.ts`, add `parallax.ts`), and the **Hard constraints** section if it mentions the lock.

- [ ] **Step 2: Verify the doc matches the code**

Run: `grep -rn "scrollLock\|scroll lock" CLAUDE.md src/ tests/`

Expected: no hits in `src/` or `tests/`. Hits in `CLAUDE.md` only where describing the removal as history.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record the scroll-motion pass in CLAUDE.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification

Final state:

- `npm run test:all` green: **74 unit**, clean build, full Playwright/axe suite.
- Live check per this repo's visual-work convention: `npm run dev`, then confirm the served page is actually the new one (WSL2 `/mnt/c` HMR drops inotify events and silently serves stale CSS — `curl` the page and grep for `data-depth` before concluding a value looks wrong), hard-refresh, and tune the depth/reveal values live. They are hand-picked, not computed.
