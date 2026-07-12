import { test, expect } from '@playwright/test';

test('desktop: rail renders fully expanded with both links reachable and labeled', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const rail = page.locator('#nav-rail');
  await expect(rail).toHaveCSS('width', '224px'); // 14rem at the 16px root font size

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
