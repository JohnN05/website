import { test, expect } from '@playwright/test';

test('visiting a missing URL shows the Minesweeper 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.locator('.context-line')).toContainText("doesn't exist");
  await expect(page.locator('.ms-grid button')).toHaveCount(81);
  await expect(page.locator('a.home-link')).toHaveAttribute('href', '/');
});

test('keyboard: arrow keys move focus, Enter reveals, Space flags', async ({ page }) => {
  // The engine places mines with unseeded Math.random() (see
  // src/lib/minesweeper/engine.ts, createBoard(rng = Math.random)), and
  // reveal() flood-fills any 0-adjacent-mine cell. Without pinning the
  // board, "ArrowRight then Enter" reveals cell (0,1), which has no
  // adjacent mines roughly 45% of the time — cascading well past 1
  // revealed cell and making this assertion flaky. Seed a deterministic
  // board (same safe mine layout Task 12's engine tests use: a diagonal
  // (0,0)-(8,8) plus (1,7), 10 unique cells) so (0,1) is adjacent to the
  // mines at (0,0) and (1,1) and reveals as a single numbered cell.
  await page.addInitScript(() => {
    const sequence = [0, 0, 0.12, 0.12, 0.24, 0.24, 0.36, 0.36, 0.48, 0.48, 0.60, 0.60, 0.72, 0.72, 0.84, 0.84, 0.96, 0.96, 0.12, 0.84];
    let i = 0;
    Math.random = () => sequence[i++ % sequence.length];
  });
  await page.goto('/this-page-does-not-exist');
  const firstCell = page.locator('.ms-grid button').first();
  await firstCell.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(page.locator('.ms-grid button[aria-pressed="true"]')).toHaveCount(1);
});

test('reset button reinitializes the board', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await page.locator('.ms-grid button').first().click();
  await page.click('#ms-reset');
  await expect(page.locator('#ms-status')).toHaveText('Mines: 10');
});
