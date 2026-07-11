import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/projects', '/projects/portfolio-site-rewrite', '/contact', '/this-page-does-not-exist'];

for (const path of pages) {
  test(`no serious or critical accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test(`skip link is the first tab stop on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
  });
}

test('reduced motion: Tetris ambient loop shows a single static frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const before = await page.locator('#tetris-ambient').innerHTML();
  await page.waitForTimeout(2000);
  const after = await page.locator('#tetris-ambient').innerHTML();
  expect(after).toBe(before);
});

test('reduced motion: capybara mascot has no run-cycle animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/projects/portfolio-site-rewrite');
  const animationName = await page.locator('#capybara').evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName === 'none' || animationName === '').toBe(true);
});
