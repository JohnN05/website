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

  // Fire a real wheel gesture to start the lock animation toward "bio."
  await page.mouse.wheel(0, 400);

  // Immediately (well inside the 700ms animation window) dispatch a second,
  // synthetic wheel event directly and read back dispatchEvent's own return
  // value: per the DOM spec it's `false` when any listener called
  // preventDefault() on a cancelable event.
  //
  // The second event deliberately reverses direction (deltaY: -400) rather
  // than repeating +400. Reusing +400 doesn't actually discriminate correct
  // swallow behavior from a missing/broken lock: this early in the
  // animation window.scrollY is still inside the "hero" section, so
  // `currentSectionIndex` resolves to 0 regardless of the lock, and
  // `nextSectionIndex(0, 400, count)` resolves to 1 (!== current) — which
  // hits the handler's own unrelated "target !== current" preventDefault()
  // call further down, independent of the `if (locked)` branch, so the
  // event ends up prevented either way. A reversed delta closes that gap:
  // `nextSectionIndex(0, -400, count)` clamps to 0 (== current), so with the
  // lock removed the handler would fall through and return *without* calling
  // preventDefault — only the `if (locked) { event.preventDefault(); return; }`
  // branch, which swallows every event during the lock regardless of
  // direction, can make this assertion pass.
  const secondEventWasSwallowed = await page.evaluate(() => {
    const notCancelled = window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -400, cancelable: true, bubbles: true })
    );
    return notCancelled === false;
  });

  expect(secondEventWasSwallowed).toBe(true);
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
