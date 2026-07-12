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

test('desktop: tetris ambient background occupies ~70% of the hero, flush to its right edge', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const hero = await page.locator('.hero').boundingBox();
  const tetrisHero = await page.locator('.tetris-hero').boundingBox();
  expect(hero).not.toBeNull();
  expect(tetrisHero).not.toBeNull();

  const ratio = tetrisHero!.width / hero!.width;
  expect(ratio).toBeGreaterThan(0.65);
  expect(ratio).toBeLessThan(0.75);

  const rightEdgeGap = hero!.x + hero!.width - (tetrisHero!.x + tetrisHero!.width);
  expect(rightEdgeGap).toBeLessThan(2);
});

test('desktop: ambient piece animates from spawn through fall before merging', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const piece = page.locator('#tetris-piece');
  await expect(piece.locator('.cell')).toHaveCount(4);

  const spawnTop = await piece.locator('.cell').first().evaluate((el) => (el as HTMLElement).style.top);
  await page.waitForTimeout(900); // past the 350ms turn + 450ms fall
  const laterTop = await piece.locator('.cell').first().evaluate((el) => (el as HTMLElement).style.top);
  expect(laterTop).not.toBe(spawnTop);
});
