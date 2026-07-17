import { test, expect } from '@playwright/test';

// The Home scroll-well is a fixed bottom-right overlay. The footer sits at the
// bottom of the page with z-index: 2 and its own capybara caption; the well
// must not sit over it. Two guarantees, both checked here: pointer-events:none
// (never steals a footer click) and a fade-out while the footer is on screen
// (no visual overlap). This repo has already shipped three separate
// footer-overlap bugs (see CLAUDE.md), so this behavior gets a test.

test('desktop: the well never intercepts clicks and clears the footer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const well = page.locator('.tetris-well');
  await expect(well).toBeVisible();
  // Decorative: it can never win hit-testing over the footer (or anything).
  await expect(well).toHaveCSS('pointer-events', 'none');

  // At the top the footer is off-screen, so the well is shown.
  await expect(well).not.toHaveClass(/near-footer/);
  await expect(well).toHaveCSS('opacity', '1');

  // Scroll to the very bottom — the footer enters the viewport. `instant`
  // because html { scroll-behavior: smooth } would otherwise animate and the
  // assertion could sample mid-scroll (a repeat trap in this codebase).
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
  );

  await expect(well).toHaveClass(/near-footer/);
  await expect(well).toHaveCSS('opacity', '0');
});

test('desktop: pieces drop in order — jumping past the middle sections never clears on nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // Jump straight to the bottom, skipping bio + featured entirely — the shape
  // of a refresh whose scroll position restores mid-page. The teaching I-bar
  // must NOT drop (its predecessors never entered), so the well must never
  // reach its cleared state. Before the ordering gate, this dropped the bar on
  // an empty board and fired the clear.
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
  );
  await page.waitForTimeout(2500); // longer than a full drop + clear would take

  const well = page.locator('.tetris-well');
  await expect(well).not.toHaveClass(/cleared/);
  // The sequence never completed, so not all four pieces are down.
  expect(await page.locator('.tetris-well .piece.dropped').count()).toBeLessThan(4);
});

test('mobile: the well is not rendered below the desktop breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.locator('.tetris-well')).toBeHidden();
});
