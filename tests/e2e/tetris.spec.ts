import { test, expect } from '@playwright/test';

test('desktop: clicking the ambient animation opens a playable overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.click('#tetris-open');
  await expect(page.locator('#tetris-overlay')).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');

  await page.keyboard.press('Escape');
  await expect(page.locator('#tetris-overlay')).toBeHidden();
  await expect(page.locator('#tetris-open')).toBeFocused();
});

test('mobile: the hero widget is hidden entirely', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.locator('.tetris-hero')).toBeHidden();
});
