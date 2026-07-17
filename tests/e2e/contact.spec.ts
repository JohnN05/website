import { test, expect } from '@playwright/test';

test('submitting the contact form shows an inline success message without navigating', async ({ page }) => {
  await page.route('/', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 200, body: 'ok' });
    }
    return route.continue();
  });

  await page.goto('/contact');
  await page.fill('#name', 'Ada Lovelace');
  await page.fill('#email', 'ada@example.com');
  await page.fill('#message', 'Loved the Tetris easter egg.');
  const urlBefore = page.url();
  await page.click('#contact-form button[type="submit"]');

  await expect(page.locator('#contact-success')).toBeVisible();
  await expect(page.locator('#contact-form')).toBeHidden();
  expect(page.url()).toBe(urlBefore);
});
