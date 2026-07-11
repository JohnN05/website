import { test, expect } from '@playwright/test';

test('home page renders hero and featured projects', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Coding practical solutions');
  await expect(page.locator('.project-card')).toHaveCount(1); // one seed article so far
});
