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
    // A full play is 590ms (90 + 150 + 70 + 130 + 150), so by t=1000 it is over
    // either way. That is the trap this test used to fall into: `revealing` and
    // `data-turned` are TRANSIENT states the play cleans up after itself, so
    // asserting their absence a second later asserts that a play FINISHED, not
    // that none happened. Proven, by deleting the ownership gate: the rail
    // played a complete reveal and this test still passed.
    //
    // data-cycle is the durable evidence — set once a play completes and never
    // cleared — so its absence is the only thing that actually means "this mark
    // never played". Same hook capturePlay below already relies on.
    await page.waitForTimeout(1000);
    await expect(rail).not.toHaveAttribute('data-cycle', /.*/);
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

test.describe('the pieces land on the letters', () => {
  /**
   * Re-measures each letter's ink from the font and checks the rendered box
   * against it. The reveal's original bug was invisible to every other test
   * here: the pieces were placed against the letter *cell* — wider, taller and
   * lower than the glyph — so every assertion about shape and rotation passed
   * while the pieces sat off their letters on screen.
   */
  async function inkVsBox(page: import('@playwright/test').Page) {
    await page.evaluate(() => document.fonts.ready);
    return page.evaluate(() =>
      ['J', 'O'].map((letter) => {
        const ch = document.querySelector<HTMLElement>(`#nameplate .ch[data-piece="${letter}"]`)!;
        const glyph = ch.querySelector<HTMLElement>('.glyph')!;
        const box = ch.querySelector<HTMLElement>('.lattice')!;
        const style = getComputedStyle(glyph);
        const ctx = document.createElement('canvas').getContext('2d')!;
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const m = ctx.measureText(letter);
        const chRect = ch.getBoundingClientRect();
        const glyphRect = glyph.getBoundingClientRect();
        const baseline =
          glyphRect.top -
          chRect.top +
          (glyphRect.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 +
          m.fontBoundingBoxAscent;
        const boxRect = box.getBoundingClientRect();
        const originX = glyphRect.left - chRect.left;
        return {
          letter,
          inkTop: baseline - m.actualBoundingBoxAscent,
          inkBottom: baseline + m.actualBoundingBoxDescent,
          inkLeft: originX - m.actualBoundingBoxLeft,
          inkRight: originX + m.actualBoundingBoxRight,
          boxTop: boxRect.top - chRect.top,
          boxBottom: boxRect.bottom - chRect.top,
          boxLeft: boxRect.left - chRect.left,
          boxRight: boxRect.right - chRect.left,
          boxWidth: boxRect.width,
        };
      })
    );
  }

  test('the turned J covers the letter it replaces, left and right', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    // Horizontal placement had NO test, and that gap hid a real bug: measure()
    // reads the glyph via getBoundingClientRect, which includes transforms, and
    // the J is tipped a quarter-turn at first paint — so the rect came back
    // with width/height swapped and its left edge moved by (w - h) / 2, putting
    // the J's piece ~4px off its letter.
    //
    // Vertical placement cannot catch it, which is worth knowing: the baseline
    // formula reads glyphRect.top + (glyphRect.height - S) / 2, and rotating
    // about the centre shifts top by (h - w) / 2 while height becomes w — the
    // two cancel exactly. Nothing cancels horizontally.
    //
    // What's asserted is the design's real claim — the TURNED piece lands on
    // the letter's ink — not that the lattice box is centred on it. It isn't,
    // deliberately: the box is 3 blocks wide and the turned J occupies 2 of
    // them (cols 2-3), so the box sits half a block off centre by construction.
    // Sampling the cells is what tests the claim rather than the arithmetic.
    const mark = page.locator('#nameplate [data-piece-mark]');
    await expect(mark).toHaveAttribute('data-cycle', '1');

    const result = await page.evaluate(() => {
      const ch = document.querySelector<HTMLElement>('#nameplate .ch[data-piece="J"]')!;
      const glyph = ch.querySelector<HTMLElement>('.glyph')!;
      const nameplate = document.querySelector<HTMLElement>('#nameplate')!;
      const mark = document.querySelector<HTMLElement>('#nameplate [data-piece-mark]')!;

      // Ink of the upright letter, read at rest before the replay. Layout is
      // unaffected by the tip (transforms don't reflow), so this stays the
      // right reference once the piece is mid-play.
      const style = getComputedStyle(glyph);
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const m = ctx.measureText('J');
      const chRect = ch.getBoundingClientRect();
      const g = glyph.getBoundingClientRect();
      const originX = g.left - chRect.left;
      const inkCentre =
        (originX - m.actualBoundingBoxLeft + (originX + m.actualBoundingBoxRight)) / 2;

      return new Promise<{ inkCentre: number; cellsCentre: number }>((resolve, reject) => {
        const observer = new MutationObserver(() => {
          if (mark.dataset.turned !== 'true') return;
          observer.disconnect();
          const cells = Array.from(ch.querySelectorAll<HTMLElement>('.lattice b'));
          const rects = cells.map((el) => el.getBoundingClientRect());
          const left = Math.min(...rects.map((r) => r.left)) - chRect.left;
          const right = Math.max(...rects.map((r) => r.right)) - chRect.left;
          resolve({ inkCentre, cellsCentre: (left + right) / 2 });
        });
        observer.observe(mark, { attributes: true });
        setTimeout(() => {
          observer.disconnect();
          reject(new Error('the mark never played'));
        }, 5000);
        nameplate.click();
      });
    });

    expect(Math.abs(result.cellsCentre - result.inkCentre)).toBeLessThan(1.5);
  });

  test("each piece's box is its letter's ink, top and bottom", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    for (const p of await inkVsBox(page)) {
      expect(Math.abs(p.boxBottom - p.inkBottom), `${p.letter} sits on its ink`).toBeLessThan(1.5);
      expect(Math.abs(p.boxTop - p.inkTop), `${p.letter} reaches its ink's top`).toBeLessThan(1.5);
    }
  });

  test("the O's blocks are bigger than the J's — each piece is scaled to its own letter", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const [j, o] = await inkVsBox(page);
    // Both boxes cover a cap-height letter, but the J divides its into 3 and
    // the O into 2. That difference is the deliberate trade for every letter
    // fully becoming its piece — if these ever come out equal, the pieces are
    // back on a shared grid and the O no longer covers its letter.
    expect(o.boxWidth / 2).toBeGreaterThan(j.boxWidth / 3);
  });

  test('a resize re-measures, so the pieces stay on the letters', async ({ page }) => {
    // The hero's mark is sized in vw, so its ink moves with the viewport.
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');
    await page.setViewportSize({ width: 900, height: 800 });
    await page.waitForTimeout(400); // debounce is 150ms

    for (const p of await inkVsBox(page)) {
      expect(Math.abs(p.boxBottom - p.inkBottom), `${p.letter} after resize`).toBeLessThan(1.5);
    }
  });
});

/**
 * Play once and capture each block's grid placement at the two states that
 * matter, from inside the page.
 *
 * The turned state lasts AFTER_TURN_MS — 130ms — and a Node-side
 * `toHaveClass`/`toHaveAttribute` poll cannot be trusted to land inside a
 * window that narrow: it is level-triggered and pays a Playwright↔browser
 * round-trip per check. That is not a hypothetical here. These two tests
 * really did start failing when the dwell came down from 220ms, and the same
 * fix (a MutationObserver reading the DOM synchronously, in-page, at the
 * instant the attribute flips) is what tetris.spec.ts already uses for the
 * ambient loop's phases, for exactly the same reason.
 */
async function capturePlay(page: import('@playwright/test').Page, letter: string) {
  return page.evaluate((ch) => {
    const mark = document.querySelector<HTMLElement>('#nameplate [data-piece-mark]');
    const nameplate = document.querySelector<HTMLElement>('#nameplate');
    if (!mark || !nameplate) throw new Error('no mark on the page');

    const read = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(`#nameplate .ch[data-piece="${ch}"] .lattice b`)
      ).map((el) => [el.style.gridRow, el.style.gridColumn]);

    // The load play already bumped this. Waiting for the attribute to merely
    // EXIST would resolve on the first mutation of the replay, reading the
    // turned placement back as if it were the spawn — wait for it to change.
    const startCycle = mark.dataset.cycle ?? '0';

    return new Promise<{ turned: string[][]; spawn: string[][] }>((resolve, reject) => {
      let turned: string[][] | null = null;
      const observer = new MutationObserver(() => {
        if (mark.dataset.turned === 'true' && !turned) {
          turned = read();
          return;
        }
        // The spawn reset lands after data-turned is gone, on the same tick as
        // the data-cycle bump — so wait for the bump, not merely for turned to
        // clear, or this reads the placement one statement too early.
        if (turned && mark.dataset.cycle !== startCycle) {
          observer.disconnect();
          resolve({ turned, spawn: read() });
        }
      });
      observer.observe(mark, { attributes: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error('the mark never played'));
      }, 5000);
      nameplate.click();
    });
  }, letter);
}

test.describe('the turn', () => {
  test('the J snaps between rotation states and returns to spawn', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');

    // Replay on demand rather than racing the load-triggered play — and let
    // that play finish first, or the click lands mid-play and the component
    // correctly ignores it.
    await expect(mark).toHaveAttribute('data-cycle', '1');
    const { turned, spawn } = await capturePlay(page, 'J');

    // Turned state: J's spawn (2,1)(3,1)(3,2)(3,3) rotates to
    // (3,2)(3,3)(2,3)(1,3) — see rotateCcw in src/lib/nameplate.ts. The blocks
    // keep their DOM order, so block 0 lands at row 3, col 2. Those four cells
    // draw
    //   . . X
    //   . . X
    //   . X X
    // which is the letter J. Landing on any other shape is the bug this
    // replaced: clockwise put it on a mirrored hook.
    expect(turned).toEqual([
      ['3', '2'],
      ['3', '3'],
      ['2', '3'],
      ['1', '3'],
    ]);

    // ...then back to spawn once the reveal finishes.
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

    const mark = page.locator('#nameplate [data-piece-mark]');

    await expect(mark).toHaveAttribute('data-cycle', '1');
    // Blocks are a set, not a sequence — the same convention the unit tests
    // use. rotateCcw permutes which block lands in which cell of the O's
    // square, so an ordered comparison here would assert an implementation
    // detail of that mapping rather than the thing that actually matters.
    const turned = (await capturePlay(page, 'O')).turned.sort();
    // Every cell of its own 2x2 box, exactly as it spawned. The O's box is its
    // own — it is not packed into a corner of the J's — so a turn moves its
    // blocks around within the square and leaves the square where it was.
    expect(turned).toEqual([
      ['1', '1'],
      ['1', '2'],
      ['2', '1'],
      ['2', '2'],
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

  test('the J tips to the piece spawn orientation, and the O has nothing to tip to', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');
    // Let the load play finish, then drive the tip state directly. What's worth
    // asserting is the rule's own output: that a tipped J is rotated a
    // quarter-turn CLOCKWISE. Counter-clockwise is an equally legal move that
    // lands on a mirrored hook — the exact class of bug that already shipped
    // once here (see rotateCcw's own comment), and one no test catches unless
    // it asserts the direction rather than merely that something rotated.
    await expect(mark).toHaveAttribute('data-cycle', '1');
    await mark.evaluate((el) => el.setAttribute('data-tipped', 'true'));

    const read = (letter: string) =>
      page
        .locator(`#nameplate .ch[data-piece="${letter}"] .glyph`)
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform));

    // rotate(90deg) clockwise in screen coordinates: a=0, b=1, c=-1, d=0. Read
    // once, not polled: the tip has no transition, so it is fully applied on
    // the next style recalculation or the snap-by-construction claim is false.
    const j = await read('J');
    expect(j.a).toBeCloseTo(0, 5);
    expect(j.b).toBeCloseTo(1, 5);
    expect(j.c).toBeCloseTo(-1, 5);
    expect(j.d).toBeCloseTo(0, 5);

    // The O spawns as its own letter's orientation — its rotation is a no-op —
    // so tipping it would be motion with nothing behind it.
    const o = await read('O');
    expect(o.a).toBeCloseTo(1, 5);
    expect(o.b).toBeCloseTo(0, 5);
  });

  test('the J is already lying down at first paint, before anything plays', async ({ page }) => {
    // Hold the reveal at the gate rather than racing LOAD_DELAY_MS to read the
    // pre-play state: nothing plays until document.fonts.ready resolves, so a
    // promise that never resolves freezes the mark exactly where a visitor
    // first sees it. Deterministic, and it doubles as proof that the tip is
    // real CSS applied at paint rather than something the module does after.
    await page.addInitScript(() => {
      Object.defineProperty(document.fonts, 'ready', {
        get: () => new Promise(() => {}),
      });
    });
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');
    await expect(mark).not.toHaveAttribute('data-cycle', /.*/);

    const j = await page
      .locator('#nameplate .ch[data-piece="J"] .glyph')
      .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform));
    expect(j.a).toBeCloseTo(0, 5);
    expect(j.b).toBeCloseTo(1, 5);

    // The blocks are the piece's, not the letter's — they carry no rotation of
    // their own. If this ever picks up the tip, the piece is being rotated
    // twice and its spawn is no longer the spawn.
    const block = await page
      .locator('#nameplate .ch[data-piece="J"] .lattice b')
      .first()
      .evaluate((el) => getComputedStyle(el).transform);
    expect(block).toBe('none');
  });

  test('the letter is upright again once the reveal is over', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');
    const glyph = page.locator('#nameplate .ch[data-piece="J"] .glyph');

    // The tip is a loan, not a new resting state: the name reads normally
    // between plays. Nothing else asserts this, and a stuck data-tipped would
    // leave a sideways J on the page with no error.
    await expect(mark).toHaveAttribute('data-cycle', '1');
    await expect(mark).not.toHaveAttribute('data-tipped', /.*/);
    expect(await glyph.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    // ...and it stays upright across a replay.
    await page.locator('#nameplate').click();
    await expect(mark).toHaveAttribute('data-cycle', '2');
    expect(await glyph.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});

test.describe('the replay loop', () => {
  test('the reveal replays on a slow cadence with no interaction', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');
    await expect(mark).toHaveAttribute('data-cycle', '1');
    // No click, no hover — the second play can only have come from the loop,
    // scheduled REPLAY_INTERVAL_MS (10s) after the first play completed. This
    // is the whole point of the loop: a visitor who never touches the page
    // still sees the reveal.
    await expect(mark).toHaveAttribute('data-cycle', '2', { timeout: 20_000 });
  });

  test('the loop pauses while the hero is off-screen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');
    await expect(mark).toHaveAttribute('data-cycle', '1');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(mark).not.toBeInViewport();

    // Well past when the cadence would have fired the second play
    // (REPLAY_INTERVAL_MS after the first completed). Motion nobody can see is
    // just a timer running, and it would also steal the "welcome back" play
    // from the moment the hero scrolls back into view.
    await page.waitForTimeout(12_000);
    await expect(mark).not.toHaveAttribute('data-cycle', '2');
  });
});

test.describe('reduced motion', () => {
  test('the mark renders at rest and never reveals', async ({ page }) => {
    // emulateMedia, not test.use({ reducedMotion }) — which this file used
    // until it was probed and found to do nothing at all here: the page still
    // reported matchMedia('(prefers-reduced-motion: reduce)').matches === false
    // and html still carried data-motion="on", so this test spent its whole
    // life asserting that a mark under NORMAL motion happened not to be
    // mid-reveal at the moment it looked. (The unexplained TS2353 on that line
    // was the tell.) Every other spec in this suite already uses emulateMedia;
    // this one was the outlier.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/');

    const mark = page.locator('#nameplate [data-piece-mark]');
    await page.waitForTimeout(1000);

    await expect(mark).not.toHaveClass(/revealing/);
    await expect(mark).not.toHaveAttribute('data-turned', 'true');
    // The letters are the mark; they must be readable with no script at all.
    await expect(page.locator('#nameplate .glyph').first()).toBeVisible();

    // Upright, not lying down. The tip is gated on html[data-motion='on'],
    // which BaseLayout's inline script leaves unset under reduced motion — so
    // this asserts that one shared gate really does reach this component, and
    // that nobody has since given the tip a second way in. A sideways J with
    // no reveal to explain it isn't a subtler animation; it's just a name the
    // visitor can't read.
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', /.*/);
    const j = await page
      .locator('#nameplate .ch[data-piece="J"] .glyph')
      .evaluate((el) => getComputedStyle(el).transform);
    expect(j).toBe('none');
  });
});
