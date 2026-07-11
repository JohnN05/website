import { test, expect } from '@playwright/test';

test('desktop: rail is collapsed by default, expands on toggle, and pins across reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const toggle = page.locator('#rail-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await page.reload();
  await expect(page.locator('#rail-toggle')).toHaveAttribute('aria-expanded', 'true');
});

test('desktop: rail links have accessible names even while collapsed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
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
