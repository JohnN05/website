import { test } from '@playwright/test';
test('PROBE: is a static frame actually rendered under reduced motion?', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const cells = await page.locator('#tetris-ambient-crisp > div').count();
  const html = await page.locator('#tetris-ambient-crisp').innerHTML();
  console.log(`PROBE reduced-motion cellCount=${cells} innerHTMLlen=${html.length}`);
});
