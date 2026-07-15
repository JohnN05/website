import { test, expect } from '@playwright/test';

test.describe('ownership: exactly one JOHN NG performs per page', () => {
  test('home: the hero owns the reveal and the rail stays quiet', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    await expect(page.locator('#nameplate [data-piece-mark]')).toHaveAttribute('data-owns', 'true');
    await expect(page.locator('.rail-wordmark')).toHaveAttribute('data-owns', 'false');
  });

  test('projects: the rail is the only name, so it owns the reveal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/projects');

    await expect(page.locator('.rail-wordmark')).toHaveAttribute('data-owns', 'true');
    await expect(page.locator('#nameplate')).toHaveCount(0);
  });

  test('a rail mark that does not own the reveal never plays', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const rail = page.locator('.rail-wordmark');
    await rail.hover();
    // Long enough for a full play (225 + 140 + 220 + 220) to have finished if
    // the ownership gate were broken.
    await page.waitForTimeout(1000);
    await expect(rail).not.toHaveClass(/revealing/);
    await expect(rail).not.toHaveAttribute('data-turned', 'true');
  });
});

test.describe('the mark itself', () => {
  test('the rail mark stacks JOHN over NG', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/projects');

    const lines = page.locator('.rail-wordmark .line');
    await expect(lines).toHaveCount(2);

    const boxes = await lines.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().top)
    );
    // Stacked, not side by side: the second line starts below the first.
    expect(boxes[1]).toBeGreaterThan(boxes[0]);
  });

  test('only J and O carry pieces', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/projects');

    const pieces = await page.locator('.rail-wordmark .ch[data-piece]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-piece'))
    );
    // "JOHN NG" — H, N, N and G name no tetromino, so they carry nothing.
    expect(pieces).toEqual(['J', 'O']);
  });

  test('the mobile bar keeps its accessible name a real "JOHN NG"', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/');

    // Guards against this DOM shape's real failure mode: `.line` is
    // `display: flex`, which blockifies its `.ch` letter children, so
    // without `.line`'s `aria-label` the accessible name would come out
    // per-letter-spaced as "J O H N N G" rather than the literal visible
    // text.
    await expect(page.getByRole('link', { name: 'JOHN NG', exact: true })).toBeVisible();
  });
});

test.describe('the turn', () => {
  test('the J snaps between rotation states and returns to spawn', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const jBlocks = page.locator('#nameplate .ch[data-piece="J"] .lattice b');
    const mark = page.locator('#nameplate [data-piece-mark]');

    // Replay on demand rather than racing the load-triggered play.
    await page.locator('#nameplate').click();

    // Turned state: J's spawn (2,1)(3,1)(3,2)(3,3) rotates to
    // (1,2)(1,1)(2,1)(3,1) — see rotateCw in src/lib/nameplate.ts. The blocks
    // keep their DOM order, so block 0 lands at row 1, col 2.
    await expect(mark).toHaveAttribute('data-turned', 'true');
    const turned = await jBlocks.evaluateAll((els) =>
      els.map((el) => [el.style.gridRow, el.style.gridColumn])
    );
    expect(turned).toEqual([
      ['1', '2'],
      ['1', '1'],
      ['2', '1'],
      ['3', '1'],
    ]);

    // ...then back to spawn once the reveal finishes.
    await expect(mark).not.toHaveAttribute('data-turned', 'true');
    const spawn = await jBlocks.evaluateAll((els) =>
      els.map((el) => [el.style.gridRow, el.style.gridColumn])
    );
    expect(spawn).toEqual([
      ['2', '1'],
      ['3', '1'],
      ['3', '2'],
      ['3', '3'],
    ]);
  });

  test('the O holds still — a rotation does nothing to it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const oBlocks = page.locator('#nameplate .ch[data-piece="O"] .lattice b');
    const mark = page.locator('#nameplate [data-piece-mark]');

    await page.locator('#nameplate').click();
    await expect(mark).toHaveAttribute('data-turned', 'true');

    // Blocks are a set, not a sequence — the same convention the unit tests
    // use. rotateCw permutes which block lands in which cell of the O's
    // square, so an ordered comparison here would assert an implementation
    // detail of that mapping rather than the thing that actually matters.
    const turned = await oBlocks.evaluateAll((els) =>
      els.map((el) => [el.style.gridRow, el.style.gridColumn]).sort()
    );
    // Same four cells as its spawn placement, resting on the same floor
    // (row 3) as the J's bottom row — a rotation moves the O's blocks around
    // within the square but leaves the square itself exactly where it was.
    expect(turned).toEqual([
      ['2', '1'],
      ['2', '2'],
      ['3', '1'],
      ['3', '2'],
    ]);
  });

  test('the turn never tweens — grid placement is not transitionable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const block = page.locator('#nameplate .ch[data-piece="J"] .lattice b').first();
    // Only opacity may transition. A transition-property covering grid
    // placement (or a rotate transform appearing here) would mean the piece
    // can be caught at an angle no tetromino occupies.
    const property = await block.evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(property).toBe('opacity');
    const transform = await block.evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe('none');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the mark renders at rest and never reveals', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');
    await page.waitForTimeout(1000);

    await expect(mark).not.toHaveClass(/revealing/);
    await expect(mark).not.toHaveAttribute('data-turned', 'true');
    // The letters are the mark; they must be readable with no script at all.
    await expect(page.locator('#nameplate .glyph').first()).toBeVisible();
  });
});
