import { test, expect } from '@playwright/test';

test('projects index lists non-draft entries newest first', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('h1')).toHaveText('Projects');
  const cards = page.locator('.project-card');
  await expect(cards).toHaveCount(9); // 10 project files exist; _template.mdx is draft: true
  await expect(cards.first()).toContainText('DoodleSum'); // newest by date (2026-08-13)
});
