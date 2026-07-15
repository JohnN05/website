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
  // 'y', not 'y proximity': proximity is the initial strictness value, so it is
  // omitted from the computed value. This still discriminates — no snap rule at
  // all computes to 'none', and mandatory survives serialization (see the mobile
  // test below).
  expect(snapType).toBe('y');
});

test('mobile keeps its mandatory snap untouched', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const snapType = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollSnapType
  );
  expect(snapType).toBe('y mandatory');
});

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
