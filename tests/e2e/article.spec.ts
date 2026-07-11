import { test, expect } from '@playwright/test';

test('article page renders MDX content and the capybara mascot', async ({ page }) => {
  await page.goto('/projects/portfolio-site-rewrite');
  await expect(page.locator('h1')).toHaveText('Rebuilding johnjng.com on Astro');
  await expect(page.locator('#capybara')).toHaveCount(1);
  await expect(page.locator('article.prose #overview')).toBeVisible();
});

test('capybara position tracks scroll and reaches resting pose at the bottom', async ({ page }) => {
  await page.goto('/projects/portfolio-site-rewrite');
  await page.mouse.wheel(0, 100000); // scroll to bottom
  await page.waitForTimeout(100);
  await expect(page.locator('#capybara')).toHaveClass(/resting/);
});
