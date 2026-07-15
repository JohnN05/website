import { test, expect } from '@playwright/test';

test('article page renders MDX content', async ({ page }) => {
  await page.goto('/projects/portfolio-site-rewrite');
  await expect(page.locator('h1')).toHaveText('Rebuilding johnjng.com on Astro');
  await expect(page.locator('article.prose #overview')).toBeVisible();
});
