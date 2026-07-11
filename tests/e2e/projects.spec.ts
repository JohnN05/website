import { test, expect } from '@playwright/test';

test('projects index lists non-draft entries newest first', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('h1')).toHaveText('Projects');
  const cards = page.locator('.project-card');
  await expect(cards).toHaveCount(1); // only the seed article is non-draft so far
  await expect(cards.first()).toContainText('Rebuilding johnjng.com on Astro');
});
