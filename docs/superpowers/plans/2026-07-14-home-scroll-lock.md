# Home Scroll Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Home's native CSS `scroll-snap-type: y mandatory` on desktop with a hand-rolled wheel-intercept + animated scroll ("Apple-style" scroll lock), so wheel-driven section-to-section navigation has controlled duration/easing and swallows input mid-transition, while mobile keeps its existing native snap behavior byte-for-byte.

**Architecture:** One new pure-logic module (`src/lib/scrollLock.ts`: easing + section-index math, no DOM, unit-tested) plus one DOM-wiring change in `src/pages/index.astro`'s existing `<script>` area (a `wheel` listener that intercepts, locks, and animates) and a small CSS scope change in `src/styles/global.css` (native snap becomes mobile-only). This follows the repo's existing split: pure logic in `src/lib/`, DOM wiring in the component `<script>` block, e2e-covered rather than unit-covered.

**Tech Stack:** Astro component `<script>` blocks (native `wheel` events, `requestAnimationFrame`, `window.scrollTo`), TypeScript strict, Vitest for the pure module, `@playwright/test` for the DOM-wiring behavior.

## Global Constraints

- Desktop only: gated on `matchMedia('(min-width: 769px)').matches`.
- Only active when `!matchMedia('(prefers-reduced-motion: reduce)').matches`. Reduced-motion desktop must fall through to plain native scroll — no snap, no lock.
- Mobile (`max-width: 768px`) keeps its existing native `scroll-snap-type: y mandatory` behavior completely unchanged, including `MobileNav.astro`'s own `.mobile-nav { scroll-snap-align: start }` (`src/components/MobileNav.astro:21`) — do not touch that file.
- Only `src/pages/index.astro` (Home) gets the new section structure/behavior. No other route is affected.
- `DURATION_MS = 700`, `WHEEL_THRESHOLD = 2` (ignore `|deltaY|` below this — wheel-event noise) — exact values, not tunable placeholders.
- `easeInOutCubic(t)` is `t < 0.5 ? 4*t**3 : 1 - (-2*t+2)**3/2` — a standard cubic ease-in-out, not a literal solve of any CSS `cubic-bezier()` curve.
- The desktop/reduced-motion check in the DOM script runs once at load only. It does not re-evaluate on resize or a live `prefers-reduced-motion` change mid-session — matches this file's existing nameplate-flash script's one-time-check pattern.
- Known limitation, accepted, not a bug to fix in this plan: keyboard scrolling (PageDown/Space/arrows) and focus-triggered scroll-into-view are not locked or animated on desktop. Since desktop also loses native CSS snap, a keyboard-driven scroll can land mid-section. Wheel-only scope is a deliberate trade-off.
- This machine's Playwright now runs for real (`npm run test:e2e` / `npm run test:all` — see root `CLAUDE.md` Status: the `libnspr4`/`libnss3`/`libasound2` sandbox limitation is fixed here via a user-local lib extraction plus a scoped `LD_LIBRARY_PATH` already wired into `package.json`). Both tasks below must end with a real `npm run test:e2e` (or `npm run test:all`) run, not just a build — do not treat a Playwright failure here as the old known-limitation signature.
- This repo's `/mnt/c/...` WSL2 path means HMR can silently serve stale CSS/JS. After any edit, verify via a **fresh** dev server restart or a clean `npm run build`, not a long-running dev server you haven't restarted.

---

### Task 1: `scrollLock.ts` pure module

**Files:**
- Create: `src/lib/scrollLock.ts`
- Test: `src/lib/scrollLock.test.ts`

**Interfaces:**
- Consumes: nothing (pure math, no DOM, no imports from elsewhere in the repo).
- Produces: `DURATION_MS: number`, `WHEEL_THRESHOLD: number`, `easeInOutCubic(t: number): number`, `currentSectionIndex(scrollY: number, sectionTops: number[]): number`, `nextSectionIndex(current: number, deltaY: number, count: number): number` — all consumed by Task 2's DOM wiring in `src/pages/index.astro`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scrollLock.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  DURATION_MS,
  WHEEL_THRESHOLD,
  easeInOutCubic,
  currentSectionIndex,
  nextSectionIndex,
} from './scrollLock';

describe('constants', () => {
  it('exposes the exact tuned duration and wheel-noise threshold', () => {
    expect(DURATION_MS).toBe(700);
    expect(WHEEL_THRESHOLD).toBe(2);
  });
});

describe('easeInOutCubic', () => {
  it('returns 0 at t=0 and 1 at t=1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('returns 0.5 at the midpoint', () => {
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it('is slow-fast-slow: earlier in the first half than linear, symmetric in the second half', () => {
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625, 5);
    expect(easeInOutCubic(0.75)).toBeCloseTo(0.9375, 5);
  });
});

describe('currentSectionIndex', () => {
  const sectionTops = [0, 800, 1600, 2400];

  it('returns 0 at the very top', () => {
    expect(currentSectionIndex(0, sectionTops)).toBe(0);
  });

  it('returns the index of the last section whose top is <= scrollY', () => {
    expect(currentSectionIndex(799, sectionTops)).toBe(0);
    expect(currentSectionIndex(800, sectionTops)).toBe(1);
    expect(currentSectionIndex(1600, sectionTops)).toBe(2);
  });

  it('returns the last section once scrolled past its top, even deep into the footer', () => {
    expect(currentSectionIndex(3000, sectionTops)).toBe(3);
  });

  it('tolerates a small epsilon below an exact section top', () => {
    // Sub-pixel float drift between a computed scrollY and an offsetTop
    // shouldn't misclassify the current section.
    expect(currentSectionIndex(799.6, sectionTops)).toBe(0);
    expect(currentSectionIndex(800, sectionTops)).toBe(1);
  });
});

describe('nextSectionIndex', () => {
  it('moves forward one section on a positive deltaY', () => {
    expect(nextSectionIndex(1, 50, 4)).toBe(2);
  });

  it('moves backward one section on a negative deltaY', () => {
    expect(nextSectionIndex(1, -50, 4)).toBe(0);
  });

  it('clamps at the last section on further forward pressure', () => {
    expect(nextSectionIndex(3, 50, 4)).toBe(3);
  });

  it('clamps at the first section on further backward pressure', () => {
    expect(nextSectionIndex(0, -50, 4)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- scrollLock`
Expected: FAIL — `Cannot find module './scrollLock'` (the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/scrollLock.ts`:

```ts
export const DURATION_MS = 700;
export const WHEEL_THRESHOLD = 2;

// A small epsilon absorbs sub-pixel float drift between a computed scrollY
// and a section's real offsetTop — without it, a scrollY landing 0.4px
// short of a section's top would misclassify as the previous section.
const SECTION_EPSILON = 1;

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

export function currentSectionIndex(scrollY: number, sectionTops: number[]): number {
  let index = 0;
  for (let i = 0; i < sectionTops.length; i++) {
    if (sectionTops[i] <= scrollY + SECTION_EPSILON) index = i;
  }
  return index;
}

export function nextSectionIndex(current: number, deltaY: number, count: number): number {
  const target = deltaY > 0 ? current + 1 : deltaY < 0 ? current - 1 : current;
  return Math.min(Math.max(target, 0), count - 1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- scrollLock`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrollLock.ts src/lib/scrollLock.test.ts
git commit -m "$(cat <<'EOF'
feat: add pure scroll-lock easing/section-index math

Pure logic only (easeInOutCubic, currentSectionIndex,
nextSectionIndex) for Home's upcoming hand-rolled wheel-intercept
scroll lock, matching this repo's lib/DOM-script split. No DOM
wiring yet — that's the next task.
EOF
)"
```

---

### Task 2: DOM wiring, CSS scope change, and e2e coverage

**Files:**
- Modify: `src/pages/index.astro` (add `data-scroll-section` to the four sections; add a new `<script>` block)
- Modify: `src/styles/global.css:3-6` (scope native snap to mobile only)
- Test: `tests/e2e/scroll-lock.spec.ts` (new)

**Interfaces:**
- Consumes: `DURATION_MS`, `WHEEL_THRESHOLD`, `easeInOutCubic`, `currentSectionIndex`, `nextSectionIndex` from `src/lib/scrollLock` (Task 1).
- Produces: nothing consumed by other tasks — this is the last task in the plan.

- [ ] **Step 1: Write the failing e2e tests**

Create `tests/e2e/scroll-lock.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('desktop wheel gesture locks scroll to the next section boundary', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const bioTop = await page.evaluate(
    () => (document.querySelector('.bio') as HTMLElement).offsetTop
  );

  await page.mouse.wheel(0, 400);
  await page.waitForFunction(
    (target) => Math.abs(window.scrollY - target) < 1,
    bioTop,
    { timeout: 3000 }
  );

  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBe(bioTop);
});

test('a second wheel gesture is swallowed while the lock animation is in flight', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const featuredTop = await page.evaluate(
    () => (document.querySelector('.featured') as HTMLElement).offsetTop
  );

  // Two ticks fired back-to-back: the first starts the lock to "bio," the
  // second (fired mid-animation) must be swallowed rather than fast-
  // forwarding straight to "featured."
  await page.mouse.wheel(0, 400);
  await page.mouse.wheel(0, 400);

  await page.waitForTimeout(200);
  const midFlightScrollY = await page.evaluate(() => window.scrollY);
  expect(midFlightScrollY).not.toBe(featuredTop);
});

test('reduced motion: wheel gesture falls through to native scroll, not a locked jump', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const bioTop = await page.evaluate(
    () => (document.querySelector('.bio') as HTMLElement).offsetTop
  );

  await page.mouse.wheel(0, 400);
  await page.waitForFunction(() => window.scrollY > 0, undefined, { timeout: 3000 });

  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(0);
  expect(scrollY).not.toBe(bioTop);
});

test('mobile viewport keeps native scroll-snap and no wheel lock attaches', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const snapType = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollSnapType
  );
  expect(snapType).not.toBe('none');

  const bioTop = await page.evaluate(
    () => (document.querySelector('.bio') as HTMLElement).offsetTop
  );

  await page.mouse.wheel(0, 400);
  await page.waitForFunction(() => window.scrollY > 0, undefined, { timeout: 3000 });

  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(0);
  expect(scrollY).not.toBe(bioTop);
});
```

- [ ] **Step 2: Run the new spec to verify it fails**

Run: `npm run test:e2e -- scroll-lock.spec.ts`
Expected: FAIL — the desktop lock test times out waiting for `scrollY` to reach `bioTop` (native snap moves by roughly the wheel delta, not to the exact section boundary, so it never settles there); the mid-flight-swallow test may pass vacuously today since nothing is locked yet, but will be exercised for real once Step 3 lands.

- [ ] **Step 3: Add `data-scroll-section` and move native snap to mobile only**

In `src/pages/index.astro`, add the attribute to all four sections (additive — existing classes untouched):

```astro
  <section class="hero" data-scroll-section>
```
```astro
  <section class="bio" data-scroll-section>
```
```astro
  <section class="featured" data-scroll-section>
```
```astro
  <section class="teaching" data-scroll-section>
```

In `src/styles/global.css`, replace lines 3-6:

```css
html {
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}
```

with:

```css
html {
  scroll-behavior: smooth;
}

@media (max-width: 768px) {
  html {
    scroll-snap-type: y mandatory;
  }
}
```

The existing `@media (prefers-reduced-motion: reduce)` block (`src/styles/global.css:27-37`) already zeroes both `scroll-snap-type` and `scroll-behavior` unconditionally and needs no change — combined with the JS gate in Step 4 below, reduced-motion desktop falls through to plain native scroll with neither snap nor lock, matching mobile's own reduced-motion behavior.

- [ ] **Step 4: Add the wheel-intercept script**

In `src/pages/index.astro`, add a second `<script>` block directly after the existing nameplate-flash `<script>` block (keep that block untouched):

```astro
<script>
  import {
    DURATION_MS,
    WHEEL_THRESHOLD,
    easeInOutCubic,
    currentSectionIndex,
    nextSectionIndex,
  } from '../lib/scrollLock';

  // One-time check, matching the nameplate-flash script's own pattern: does
  // not re-evaluate on resize or a live prefers-reduced-motion change.
  if (
    matchMedia('(min-width: 769px)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-scroll-section]')
    );
    const teachingEl = sections[sections.length - 1];
    let sectionTops: number[] = [];
    let locked = false;

    function refreshSectionTops(): void {
      sectionTops = sections.map((el) => el.offsetTop);
    }

    function animateScrollTo(target: number): void {
      const start = window.scrollY;
      const distance = target - start;
      const startTime = performance.now();
      locked = true;

      function step(now: number): void {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / DURATION_MS, 1);
        window.scrollTo(0, start + distance * easeInOutCubic(t));
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          locked = false;
        }
      }
      requestAnimationFrame(step);
    }

    window.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        // Hard lock: every event during the 700ms transition, including a
        // trackpad's momentum trail, is swallowed outright.
        if (locked) {
          event.preventDefault();
          return;
        }
        if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;

        refreshSectionTops();
        const current = currentSectionIndex(window.scrollY, sectionTops);

        // Footer handoff (part 1): once scrolled into the seam/footer past
        // the four locked sections, native scroll owns that zone in both
        // directions — lets an upward flick from deep in the footer scroll
        // normally instead of yanking the user back up into "featured."
        const footerBoundary = teachingEl.offsetTop + teachingEl.offsetHeight;
        if (window.scrollY >= footerBoundary) return;

        const target = nextSectionIndex(current, event.deltaY, sectionTops.length);
        // Footer handoff (part 2): already at the first/last of the four
        // sections and still pushing further in that direction — let a
        // downward flick from "teaching" continue into the footer.
        if (target === current) return;

        event.preventDefault();
        animateScrollTo(sectionTops[target]);
      },
      { passive: false }
    );
  }
</script>
```

- [ ] **Step 5: Run the full test suite**

Run: `npm run test:all`
Expected: unit tests pass (including Task 1's `scrollLock.test.ts`), the production build succeeds, and every Playwright spec passes, including all four new `scroll-lock.spec.ts` tests. If `mouse.wheel(0, 400)` in the mid-flight-swallow test doesn't reliably land two events inside the same 700ms animation window on this machine, tighten the gap between the two `page.mouse.wheel` calls or assert on `window.scrollY` immediately (no `waitForTimeout`) instead — do not weaken the assertion itself.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/styles/global.css tests/e2e/scroll-lock.spec.ts
git commit -m "$(cat <<'EOF'
feat: replace Home's native scroll-snap with a wheel-intercept scroll lock

Desktop wheel gestures now animate section-to-section over 700ms with
a cubic ease and hard-lock input mid-transition, replacing native
CSS scroll-snap (which had no duration/easing control and no way to
lock input against a trackpad's momentum trail). Mobile keeps native
snap unchanged; reduced-motion desktop falls through to plain native
scroll with neither snap nor lock.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** `scrollLock.ts`'s four exports (Design → New module) land in Task 1. The DOM wiring's six-step wheel handler, the `data-scroll-section` attribute, and the `global.css` scope change (Design → DOM wiring, CSS changes) land in Task 2. The Known limitation section is carried into Global Constraints verbatim rather than silently dropped. The Testing section's four scenarios (desktop lock, reduced-motion, mobile-unaffected, plus a mid-flight-swallow check implied by "every event during the 700ms transition... is swallowed outright") are all literal tests in Task 2. Out-of-scope items (no mobile change, no other route, no keyboard/touch interception, no hero-peek change) are respected — no task touches any of them.
- **Placeholder scan:** no TBD/TODO markers; every step has literal code, not a description of code.
- **Type consistency:** `DURATION_MS`, `WHEEL_THRESHOLD`, `easeInOutCubic`, `currentSectionIndex`, `nextSectionIndex` are named and typed identically between Task 1's implementation and Task 2's import/usage.
