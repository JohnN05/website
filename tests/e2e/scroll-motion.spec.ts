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
