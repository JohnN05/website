import { test, expect } from '@playwright/test';

test('desktop no longer intercepts the wheel — nothing calls preventDefault', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // Mirrors the deleted scroll-lock spec's own logic, inverted. Per the DOM
  // spec, dispatchEvent() returns false when a listener called
  // preventDefault() on a cancelable event. With the lock gone, no listener
  // on Home may cancel a wheel event in any direction.
  const notCancelled = await page.evaluate(() =>
    window.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 400, cancelable: true, bubbles: true })
    )
  );
  expect(notCancelled).toBe(true);
});

test('desktop uses native proximity snap', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const snapType = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollSnapType
  );
  // 'y', not 'y proximity': proximity is the initial strictness value, so it is
  // omitted from the computed value. This still discriminates — no snap rule at
  // all computes to 'none', and mandatory survives serialization (see the mobile
  // test below).
  expect(snapType).toBe('y');
});

test('mobile keeps its mandatory snap untouched', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const snapType = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollSnapType
  );
  expect(snapType).toBe('y mandatory');
});

test('a section reveals its contents on entry', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const bio = page.locator('.bio');
  await expect(bio).not.toHaveClass(/\bin\b/);

  await bio.scrollIntoViewIfNeeded();
  await expect(bio).toHaveClass(/\bin\b/);

  // The reveal must actually resolve to resting, not just flip a class.
  const heading = bio.locator('h2');
  await expect
    .poll(async () => (await heading.evaluate((el) => getComputedStyle(el).opacity)))
    .toBe('1');
});

test('bio still reveals on a viewport where it peeks below the fold', async ({
  page,
}) => {
  // 1920x1080, not the 1280x800 every other test uses: the hero renders ~835px
  // tall, so at 1280x800 bio doesn't peek at all — the one height where this
  // bug is invisible. Home's sections deliberately leave ~10vh of the next one
  // showing, which puts bio ~11% visible here: above zero, but below the
  // observer's 0.15 threshold. A load-time check that marked any section merely
  // touching the viewport as already-entered therefore skipped bio's reveal
  // entirely on the most common desktop resolution.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');

  const bio = page.locator('.bio');
  await expect(bio).not.toHaveClass(/\bin\b/);
  await expect
    .poll(() => bio.locator('h2').evaluate((el) => getComputedStyle(el).opacity))
    .not.toBe('1');

  await bio.scrollIntoViewIfNeeded();
  await expect(bio).toHaveClass(/\bin\b/);
  await expect
    .poll(() => bio.locator('h2').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('the hero never animates in on load', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // The hero is on screen at load by definition, and reveal is an on-ENTRY
  // effect. The hidden state lands before first paint now, too early for any
  // script to mark the hero resting in time — so `in` is authored in the
  // markup. If that class is ever dropped, the hero fades in on every load.
  await expect(page.locator('.hero')).toHaveClass(/\bin\b/);
  const opacity = await page
    .locator('.hero h1')
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe('1');
});

test('reduced motion renders content at rest with no reveal gating', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // The hidden state is gated on html[data-motion='on'], which the inline head
  // script must not set under reduced motion — otherwise content could sit at
  // opacity 0 forever. This is the failure mode worth a test of its own.
  const motion = await page.evaluate(
    () => document.documentElement.dataset.motion
  );
  expect(motion).toBeUndefined();

  const opacity = await page
    .locator('.bio h2')
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe('1');
});

test('the Tetris board drifts against the hero copy as the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const readShift = (selector: string) =>
    page
      .locator(selector)
      .evaluate((el) =>
        parseFloat(getComputedStyle(el).getPropertyValue('--parallax-y')) || 0
      );

  // At rest at the top of the hero, every layer sits at its design position.
  expect(await readShift('#tetris-hero')).toBe(0);

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
  await page.waitForFunction(
    () =>
      parseFloat(
        getComputedStyle(document.querySelector('#tetris-hero')!).getPropertyValue(
          '--parallax-y'
        )
      ) > 0,
    undefined,
    { timeout: 2000 }
  );

  const board = await readShift('#tetris-hero');
  const copy = await readShift('.hero-copy');

  // The effect IS the rate difference — a board that moves identically to the
  // copy is not parallax, so assert separation, not just movement.
  expect(board).toBeGreaterThan(copy);
  expect(Math.abs(board)).toBeLessThanOrEqual(200);

  // Everything above reads --parallax-y, which only proves the PRODUCER ran.
  // getComputedStyle hands back a custom property whether or not any rule
  // consumes it, so dropping [data-depth] from global.css's transform selector
  // — the exact regression that once left this board silently motionless —
  // would keep every assertion above green. The transform matrix is the
  // consumer's own output: its translateY only moves if a rule really read the
  // property. Matrix form is matrix(a, b, c, d, tx, ty).
  const boardTranslateY = await page
    .locator('#tetris-hero')
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).f);
  expect(boardTranslateY).toBeCloseTo(board, 1);
});

test('a depth layer does not drag its own revealed children along with it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));

  // Custom properties inherit by default, and the transform rule matches
  // [data-reveal] children of [data-depth] elements. Unregistered, .hero-copy's
  // --parallax-y also reached its own h1, which re-applied that translate INSIDE
  // the already-shifted parent — rendering the hero text at double its intended
  // depth. @property's inherits:false is what scopes the value to its producer;
  // #tetris-hero is the one depth layer with no revealed children, so the board
  // assertions above cannot catch this.
  const parent = await page
    .locator('.hero-copy')
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).f);
  expect(parent).toBeGreaterThan(0);

  const child = await page
    .locator('.hero-copy h1')
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).f);
  expect(child).toBe(0);
});

test('parallax does not attach below the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
  await page.waitForTimeout(300);

  // The board is display:none under 769px, so its depth layer would animate
  // almost nothing at real cost.
  const shift = await page
    .locator('.hero-copy')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--parallax-y').trim());
  expect(shift === '' || shift === '0px').toBe(true);
});
