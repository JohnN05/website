import { test, expect } from '@playwright/test';

test('home page renders hero and featured projects', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Coding practical solutions');
  await expect(page.locator('.project-card')).toHaveCount(1); // one seed article so far
});

test('headings use the Bricolage Grotesque display face', async ({ page }) => {
  await page.goto('/');
  const fontFamily = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontFamily).toContain('Bricolage Grotesque');
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
