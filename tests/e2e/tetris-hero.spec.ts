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

  test('pieces spawn at the top and only fall — never slide upward mid-flight', async ({ page }) => {
    // Regression guard for the "pieces go up then down" bug: a new piece was
    // animating UPWARD from the previous piece's landing spot to the spawn row
    // before falling, because phase-turn (with its transform transition) was
    // enabled before the spawn transform was set, so the wrapper tweened from
    // the old bottom transform to the new top one. Within a single piece's
    // flight (one data-cycle) the wrapper's translateY must only ever increase
    // (move down) — a decrease means it rose mid-flight.
    await page.goto('/');
    // Sample cycle + wrapper transform ATOMICALLY in one evaluate, so a cycle
    // advance can't land between two reads and mislabel a fresh-spawn transform
    // with the previous cycle's id. Read the COMPUTED transform (getComputedStyle
    // -> a matrix), NOT element.style.transform: the inline style is the target
    // value we set (always the top on spawn), while the visible up-slide is the
    // browser interpolating the previous bottom transform toward it — only the
    // computed matrix reflects that in-flight value.
    const samples: { cycle: string; ty: number }[] = [];
    for (let i = 0; i < 80; i++) {
      const s = await page.evaluate(() => {
        const p = document.getElementById('tetris-piece');
        const w = document.getElementById('tetris-piece-crisp');
        const t = w ? getComputedStyle(w).transform : 'none';
        return { cycle: p?.dataset.cycle ?? null, transform: t };
      });
      // getComputedStyle gives "matrix(a, b, c, d, tx, ty)" (or "none" = identity).
      const m = /matrix\(([^)]+)\)/.exec(s.transform);
      const ty = m ? parseFloat(m[1].split(',')[5]) : 0;
      if (s.cycle) samples.push({ cycle: s.cycle, ty });
      await page.waitForTimeout(30);
    }
    // Must have observed motion across more than one piece.
    expect(new Set(samples.map((s) => s.cycle)).size).toBeGreaterThan(1);
    const byCycle = new Map<string, number[]>();
    for (const s of samples) {
      if (!byCycle.has(s.cycle)) byCycle.set(s.cycle, []);
      byCycle.get(s.cycle)!.push(s.ty);
    }
    for (const [cycle, tys] of byCycle) {
      for (let i = 1; i < tys.length; i++) {
        // 0.5px slack for sub-pixel rounding; a real up-slide is tens of px.
        expect(
          tys[i],
          `cycle ${cycle} moved UP mid-flight: ${tys[i - 1]}px -> ${tys[i]}px`
        ).toBeGreaterThanOrEqual(tys[i - 1] - 0.5);
      }
    }
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
