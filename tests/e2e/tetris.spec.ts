import { test, expect } from '@playwright/test';

test('mobile: the hero widget is hidden entirely', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.locator('.tetris-hero')).toBeHidden();
});

test('mobile: hidden means stopped, not merely invisible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');

  // display: none makes the container 0x0, so the loop was animating a 4x4
  // board (the Math.max floor) with a NEGATIVE cell size, re-rendering every
  // cell and scheduling the next cycle forever — on a phone, on the site's
  // busiest page, for something no one can see. data-cycle is the loop's own
  // per-spawn counter: if it never appears, no cycle ever ran.
  await page.waitForTimeout(1500);
  await expect(page.locator('#tetris-piece')).not.toHaveAttribute('data-cycle', /.*/);
  await expect(page.locator('#tetris-ambient-crisp > div')).toHaveCount(0);
});

test('a board that starts hidden still runs once the window grows', async ({ page }) => {
  // The guard must key off "is it on screen", not "was it on screen at load" —
  // otherwise a visitor who widens a narrow window gets a permanently dead
  // board, trading one silent bug for another.
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.locator('#tetris-piece')).not.toHaveAttribute('data-cycle', /.*/);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('#tetris-piece')).toHaveAttribute('data-cycle', /\d+/, { timeout: 5000 });
  await expect(page.locator('#tetris-ambient-crisp > div').first()).toBeVisible();
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

  // Since the baked-replay rewrite, motion is a transform on the WRAPPER
  // (#tetris-piece-crisp itself), not left/top on each cell — cells are laid
  // out once per spawn at their shape-relative offsets and never touched
  // again during the flight (see layoutPieceCells/originTransform in
  // TetrisHero.astro; the wrapper's blur is rasterized once, so translating
  // it reuses that raster instead of re-blurring every step). Read the
  // wrapper's own transform, which is what actually carries the piece.
  const spawnTransform = await crispLayer.evaluate((el) => (el as HTMLElement).style.transform);
  await page.waitForTimeout(450); // safely inside the fall phase (300ms turn + up to 220ms fall = 520ms merge point); avoids the 520-720ms window where the piece layers are briefly empty between merge and the next spawn
  const laterTransform = await crispLayer.evaluate((el) => (el as HTMLElement).style.transform);
  expect(laterTransform).not.toBe(spawnTransform);
});

test('desktop: ambient piece stays a rigid shape while turning, sliding rather than scrambling into its rotation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const crispLayer = page.locator('#tetris-piece-crisp');
  const cells = crispLayer.locator('.cell');
  await expect(cells).toHaveCount(4);

  // The whole synchronize-then-sample sequence runs inside one
  // page.evaluate so nothing on the critical timing path round-trips
  // through Playwright's CDP connection — that latency alone (both in
  // detecting the phase-turn transition via polling, and in the delay
  // between the two reads) was enough to land samples in the wrong phase
  // or even the next piece's cycle. Synchronizing to the transition via an
  // in-page MutationObserver (not toHaveClass polling from Node) catches
  // the actual moment a fresh turn phase starts with no added latency:
  // waiting for phase-fall first, then for phase-turn to reappear, catches
  // a genuine edge instead of an already-true condition (page.goto() can
  // resolve at an unpredictable point relative to the ambient loop's own
  // cycle clock, e.g. font-load/hydration jitter). data-cycle (bumped once
  // per runAmbientCycle(), see TetrisHero.astro) is then checked as a hard
  // guarantee neither read landed on a different piece.
  const { earlyShape, lateShape, cycleMatch } = await page.evaluate(async () => {
    const piece = document.getElementById('tetris-piece')!;
    const waitForClass = (cls: string) =>
      new Promise<void>((resolve) => {
        if (piece.classList.contains(cls)) {
          resolve();
          return;
        }
        const obs = new MutationObserver(() => {
          if (piece.classList.contains(cls)) {
            obs.disconnect();
            resolve();
          }
        });
        obs.observe(piece, { attributes: true, attributeFilter: ['class'] });
      });
    await waitForClass('phase-fall');
    await waitForClass('phase-turn');

    const cycleAtStart = piece.dataset.cycle;
    const readShape = () => {
      const els = Array.from(document.querySelectorAll('#tetris-piece-crisp .cell')) as HTMLElement[];
      const positions = els.map((el) => ({ left: parseFloat(el.style.left), top: parseFloat(el.style.top) }));
      // Relative to the first cell, so the turn phase's intended horizontal
      // slide doesn't itself register as a shape change — only a change in
      // rotation (cells moving relative to each other) should.
      const [origin, ...rest] = positions;
      return rest.map((p) => ({ dLeft: p.left - origin.left, dTop: p.top - origin.top }));
    };
    const earlyShape = readShape();
    await new Promise((resolve) => setTimeout(resolve, 250)); // still inside the 300ms turn phase
    const lateShape = readShape();
    return { earlyShape, lateShape, cycleMatch: piece.dataset.cycle === cycleAtStart };
  });

  expect(cycleMatch).toBe(true);
  // Not toEqual: the two reads straddle a layout/paint pass, and Chromium
  // reserializes .style.top/.left slightly differently once a value has
  // actually been laid out — the same JS-assigned pixel value can read
  // back as e.g. "44.6667px" pre-layout and "44.66700000000003px"
  // post-layout, an observed ~0.0003px (1 part in 150,000) drift. That's
  // three orders of magnitude below a single pixel and invisible; a real
  // scramble-into-rotation bug would show a difference on the order of a
  // full cell (single digits of px), not fractions of a thousandth of one.
  expect(lateShape.length).toBe(earlyShape.length);
  lateShape.forEach((late, i) => {
    expect(late.dLeft).toBeCloseTo(earlyShape[i].dLeft, 2);
    expect(late.dTop).toBeCloseTo(earlyShape[i].dTop, 2);
  });
});

test('desktop: ambient piece finishes its horizontal slide before it starts falling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const crispLayer = page.locator('#tetris-piece-crisp');
  await expect(crispLayer.locator('.cell')).toHaveCount(4);

  // The whole synchronize-then-sample sequence runs inside one
  // page.evaluate, synchronizing to the phase-fall→phase-turn transition
  // via an in-page MutationObserver rather than toHaveClass polling from
  // Node — see the test above for the full reasoning (round-tripping
  // through Playwright's CDP connection was, on its own, enough latency to
  // drift samples into the wrong phase, or even the ~200ms empty-overlay
  // window between one piece locking and the next spawning). Sample deep
  // into the turn phase (300ms) but still before the fall phase begins,
  // then again well into the fall phase — the horizontal (left) position
  // must be identical at both points. If the turn's setTimeout fires
  // before its CSS transition's last steps() jump lands (a race this test
  // guards against), left keeps changing after the phase switch instead of
  // staying put while only top (the fall) moves. data-cycle is checked as
  // a hard guarantee both reads landed on the same piece.
  const { leftNearTurnEnd, leftDuringFall, cycleMatch } = await page.evaluate(async () => {
    const piece = document.getElementById('tetris-piece')!;
    const waitForClass = (cls: string) =>
      new Promise<void>((resolve) => {
        if (piece.classList.contains(cls)) {
          resolve();
          return;
        }
        const obs = new MutationObserver(() => {
          if (piece.classList.contains(cls)) {
            obs.disconnect();
            resolve();
          }
        });
        obs.observe(piece, { attributes: true, attributeFilter: ['class'] });
      });
    await waitForClass('phase-fall');
    await waitForClass('phase-turn');

    const cycleAtStart = piece.dataset.cycle;
    const cell = () => document.querySelector('#tetris-piece-crisp .cell') as HTMLElement | null;
    await new Promise((resolve) => setTimeout(resolve, 290));
    const leftNearTurnEnd = parseFloat(cell()?.style.left ?? 'NaN');
    // 440ms after phase-turn start: turn (300ms) is over, fall (220ms) is
    // ~140ms in — still short of the 520ms lock/pause boundary.
    await new Promise((resolve) => setTimeout(resolve, 150));
    const leftDuringFall = parseFloat(cell()?.style.left ?? 'NaN');
    return { leftNearTurnEnd, leftDuringFall, cycleMatch: piece.dataset.cycle === cycleAtStart };
  });

  expect(cycleMatch).toBe(true);
  // Not toBe: see the "rigid shape" test above for why two reads of the
  // same unchanged pixel value can serialize to slightly different
  // strings across a layout/paint pass (~0.0003px observed) — comparing
  // parsed floats with a tolerance instead of raw strings avoids failing
  // on that sub-pixel noise while still catching a real left-during-fall
  // drift, which would be on the order of a full cell.
  expect(leftDuringFall).toBeCloseTo(leftNearTurnEnd, 2);
});

test('desktop: falling-piece overlay is cleared during a line-clear flash, not left stuck on top of it', async ({ page }) => {
  // 90s, not the 30s default. The wait below got a 60s selector timeout in
  // 1ecbe63, but that alone changed nothing: Playwright's TEST-level timeout
  // (30s default, not overridden in playwright.config.ts) fires first and
  // kills the test mid-wait — exactly how this failed on CI ("Test timeout of
  // 30000ms exceeded"). A generous selector timeout only works if the test
  // itself is allowed to outlive it, with margin for the assertions after.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // The ambient loop builds its stack up before its heuristic rewards line
  // clears, so this waits for whatever the first real clear happens to be
  // rather than assuming a fixed timing.
  // 60s, not 30s. The event itself is deterministic — pieceForStep is seeded
  // and the board's dimensions are pinned by the viewport above, so the first
  // clear always arrives on the same step — but WHEN it arrives is wall-clock,
  // and the loop only cashes in a line once a column reaches 75% of board
  // height, which is dozens of ~800ms cycles away. Under parallel workers this
  // observably overran 30s and failed once; the wait is for something that is
  // definitely coming, so the timeout should be generous rather than tight.
  await page.waitForSelector('.tetris-ambient-crisp div.flashing', { timeout: 60000 });

  // The locked piece is already baked into the flashing board cells
  // themselves; the separate overlay layer must be empty during the flash,
  // or it sits on top of the grid unaffected by the flash toggle.
  await expect(page.locator('#tetris-piece-crisp .cell')).toHaveCount(0);
  await expect(page.locator('#tetris-piece-soft .cell')).toHaveCount(0);
});
