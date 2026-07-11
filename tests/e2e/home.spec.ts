import { test, expect } from '@playwright/test';

test('home page responds', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('John Ng');
});
