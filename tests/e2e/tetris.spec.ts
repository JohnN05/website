import { test, expect } from '@playwright/test';

test('desktop: clicking the ambient animation opens a playable overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.click('#tetris-open');
  await expect(page.locator('#tetris-overlay')).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');

  await page.keyboard.press('Escape');
  await expect(page.locator('#tetris-overlay')).toBeHidden();
  await expect(page.locator('#tetris-open')).toBeFocused();
});

test('mobile: the hero widget is hidden entirely', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.locator('.tetris-hero')).toBeHidden();
});

test('desktop: tetris ambient background occupies ~70% of the hero, flush to its right edge', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const hero = await page.locator('.hero').boundingBox();
  const tetrisHero = await page.locator('.tetris-hero').boundingBox();
  expect(hero).not.toBeNull();
  expect(tetrisHero).not.toBeNull();

  const ratio = tetrisHero!.width / hero!.width;
  expect(ratio).toBeGreaterThan(0.65);
  expect(ratio).toBeLessThan(0.75);

  const rightEdgeGap = hero!.x + hero!.width - (tetrisHero!.x + tetrisHero!.width);
  expect(rightEdgeGap).toBeLessThan(2);
});

test('desktop: ambient piece animates from spawn through fall before merging', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // #tetris-piece now wraps two layers (blurred + crisp) for the gradual
  // depth-of-field fade — check the crisp layer specifically, which is the
  // one that's fully opaque and visible across most of the widget.
  const crispLayer = page.locator('#tetris-piece-crisp');
  await expect(crispLayer.locator('.cell')).toHaveCount(4);

  const spawnTop = await crispLayer.locator('.cell').first().evaluate((el) => (el as HTMLElement).style.top);
  await page.waitForTimeout(450); // safely inside the fall phase (300ms turn + up to 220ms fall = 520ms merge point); avoids the 520-720ms window where the piece layers are briefly empty between merge and the next spawn
  const laterTop = await crispLayer.locator('.cell').first().evaluate((el) => (el as HTMLElement).style.top);
  expect(laterTop).not.toBe(spawnTop);
});

test('desktop: ambient piece stays a rigid shape while turning, sliding rather than scrambling into its rotation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const crispLayer = page.locator('#tetris-piece-crisp');
  const cells = crispLayer.locator('.cell');
  await expect(cells).toHaveCount(4);

  const readShape = async () => {
    const positions = await cells.evaluateAll((els) =>
      (els as HTMLElement[]).map((el) => ({
        left: parseFloat((el as HTMLElement).style.left),
        top: parseFloat((el as HTMLElement).style.top),
      }))
    );
    // Relative to the first cell, so the turn phase's intended horizontal
    // slide doesn't itself register as a shape change — only a change in
    // rotation (cells moving relative to each other) should.
    const [origin, ...rest] = positions;
    return rest.map((p) => ({ dLeft: p.left - origin.left, dTop: p.top - origin.top }));
  };

  const earlyShape = await readShape();
  await page.waitForTimeout(250); // still inside the 300ms turn phase
  const lateShape = await readShape();

  expect(lateShape).toEqual(earlyShape);
});

test('desktop: falling-piece overlay is cleared during a line-clear flash, not left stuck on top of it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // The ambient loop builds its stack up before its heuristic rewards line
  // clears, so this waits for whatever the first real clear happens to be
  // rather than assuming a fixed timing.
  await page.waitForSelector('.tetris-ambient-crisp div.flashing', { timeout: 30000 });

  // The locked piece is already baked into the flashing board cells
  // themselves; the separate overlay layer must be empty during the flash,
  // or it sits on top of the grid unaffected by the flash toggle.
  await expect(page.locator('#tetris-piece-crisp .cell')).toHaveCount(0);
  await expect(page.locator('#tetris-piece-soft .cell')).toHaveCount(0);
});
