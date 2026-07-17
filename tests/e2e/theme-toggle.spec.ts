import { test, expect } from '@playwright/test';

// Scoped to the rail rather than a bare '.theme-toggle': the toggle is mounted
// twice (rail + drawer) and the strict Locator API throws on an ambiguous
// match, which is the point. The old tests used page.click('#theme-toggle') —
// the legacy non-strict API — and silently resolved to whichever mount came
// first, which is how a completely dead mobile toggle passed CI.
const railToggle = (page: import('@playwright/test').Page) =>
  page.locator('#nav-rail .theme-toggle');

test('clicking the toggle switches and persists theme', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await railToggle(page).click();
  await page.waitForTimeout(400);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('reduced motion switches instantly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await railToggle(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the drawer toggle works on a phone', async ({ page }) => {
  // ThemeToggle is mounted twice — the desktop rail and the mobile drawer —
  // but Astro bundles a component's <script> once per PAGE, not once per
  // instance. Both mounts emitted id="theme-toggle" and the single
  // getElementById bound only the first in DOM order (the rail's), which is
  // display: none on a phone. Dark mode was unreachable for every mobile
  // visitor.
  //
  // The old tests missed it because page.click('#theme-toggle') uses the
  // legacy non-strict selector API, which silently takes the first match —
  // the rail's button — at a desktop viewport, the one case that worked.
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.locator('#mobile-nav-toggle').click();
  await page.locator('#mobile-drawer .theme-toggle').click();
  await page.waitForTimeout(400);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('no id is duplicated across the two toggle mounts', async ({ page }) => {
  // Two elements sharing an id is what made the bug above invisible: the DOM
  // stays "valid enough" to render, getElementById quietly picks one, and the
  // other is inert with no error anywhere.
  await page.goto('/');
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[id]')).map((el) => el.id)
  );
  expect(ids.length).toBe(new Set(ids).size);
});
