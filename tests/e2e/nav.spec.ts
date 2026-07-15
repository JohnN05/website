import { test, expect } from '@playwright/test';

test('desktop: rail renders fully expanded with both links reachable and labeled', async ({ page }) => {
  // 1440px is past the rail's own ~1149px full-width threshold (--rail-width
  // in global.css), so it's pinned at its 12rem max here rather than the
  // narrower clamped width a viewport below that threshold would produce.
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');

  const rail = page.locator('#nav-rail');
  await expect(rail).toHaveCSS('width', '192px'); // 12rem at the 16px root font size

  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
});

test('desktop: rail narrows toward its floor on a narrower desktop window', async ({ page }) => {
  // Below the rail's ~1149px full-width threshold, --rail-width clamps between
  // a 9rem floor and 12rem — at 900px it should be narrower than 12rem but no
  // narrower than the 9rem (144px) floor, and still above the 769px
  // breakpoint where the rail disappears entirely for the mobile nav.
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/');

  const rail = page.locator('#nav-rail');
  const width = await rail.evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThan(192);
  expect(width).toBeGreaterThanOrEqual(144);

  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
});

test('desktop: wordmark links home', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/projects');
  await page.click('.rail-home');
  await expect(page).toHaveURL('/');
});

test('mobile: rail is hidden, top bar + drawer are used instead', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');

  await expect(page.locator('#nav-rail')).toBeHidden();

  const drawer = page.locator('#mobile-drawer');
  await expect(drawer).toBeHidden();

  await page.click('#mobile-nav-toggle');
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
});
