import { test, expect } from '@playwright/test';

test.describe('Tetris hero replay', () => {
  test('animates: the piece cycle advances', async ({ page }) => {
    await page.goto('/');
    const piece = page.locator('#tetris-piece');
    await expect(piece).toHaveAttribute('data-cycle', /\d+/);
    const first = await piece.getAttribute('data-cycle');
    await expect
      .poll(async () => piece.getAttribute('data-cycle'), { timeout: 5000 })
      .not.toBe(first);
  });

  test('freezes under reduced motion (static frame, no cycle advance)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const board = page.locator('#tetris-ambient-soft');
    await expect(board).toBeVisible();
    const piece = page.locator('#tetris-piece');
    const cycle = await piece.getAttribute('data-cycle');
    await page.waitForTimeout(1500);
    expect(await piece.getAttribute('data-cycle')).toBe(cycle);
  });

  test('replay keeps advancing and never stalls', async ({ page }) => {
    // Smoke check: the baked loop keeps spawning pieces (no live AI to hang).
    // This does NOT drive the full 124-piece top-out wraparound — that takes
    // ~2min at the fixed cadence, impractical for e2e. The actual restart
    // (index >= REPLAY.length -> reset board+index in TetrisHero.astro) is
    // covered by inspection, not by this test; adding a production DOM hook to
    // a decorative widget purely to time the wraparound was judged
    // disproportionate. What this guards: the loop doesn't stall or crash
    // within the first several pieces.
    await page.goto('/');
    const piece = page.locator('#tetris-piece');
    const a = Number(await piece.getAttribute('data-cycle'));
    await expect
      .poll(async () => Number(await piece.getAttribute('data-cycle')), { timeout: 6000 })
      .toBeGreaterThan(a + 2);
  });
});
