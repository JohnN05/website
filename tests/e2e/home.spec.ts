import { test, expect } from '@playwright/test';

test('home page renders hero and featured projects', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('peace of mind');
  await expect(page.locator('.project-card')).toHaveCount(3); // featured: true entries (echtralex, movement-map, terp-rater)
});

test('headings use the Archivo display face, body copy does not', async ({ page }) => {
  await page.goto('/');
  const h1 = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1).toContain('Archivo');

  // The pairing's load-bearing half: Archivo and Instrument Sans are both
  // grotesks, so they only stay legible as separate roles while the display
  // face and the body face are actually different faces at different weights.
  // Asserting the heading alone would still pass if body copy were switched to
  // Archivo too, which is the specific way this collapses.
  const body = await page
    .locator('.hero-copy .role')
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(body).toContain('Instrument Sans');
  expect(body).not.toContain('Archivo');

  const h1Weight = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontWeight);
  expect(Number(h1Weight)).toBeGreaterThanOrEqual(600);
});

test('featured section shares the hero copy\'s left inset', async ({ page }) => {
  await page.goto('/');
  const heroCopy = await page.locator('.hero-copy').boundingBox();
  const featuredHeading = await page.locator('.featured h2').boundingBox();
  expect(heroCopy).not.toBeNull();
  expect(featuredHeading).not.toBeNull();
  expect(Math.abs(heroCopy!.x - featuredHeading!.x)).toBeLessThan(1);
});

test('project cards share the same left inset as the featured heading', async ({ page }) => {
  await page.goto('/');
  const featuredHeading = await page.locator('.featured h2').boundingBox();
  const projectGrid = await page.locator('.project-grid').boundingBox();
  expect(featuredHeading).not.toBeNull();
  expect(projectGrid).not.toBeNull();
  expect(Math.abs(featuredHeading!.x - projectGrid!.x)).toBeLessThan(1);
});
