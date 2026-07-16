import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/projects', '/projects/portfolio-site-rewrite', '/contact', '/this-page-does-not-exist'];

for (const path of pages) {
  test(`no serious or critical accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);

    // The reveal fades each piece letter out (opacity) while its piece shows,
    // so there is no longer a frame where a glyph is painted its own
    // background colour — the knock-out that used to put this scan in conflict
    // with axe's contrast rule is gone. Scanning the resting state is still
    // the right thing on principle, and it keeps this suite honest if the
    // reveal ever paints rather than fades again.
    // A load-triggered mark now holds its letters for LOAD_DELAY_MS before it
    // plays, so "nothing is .revealing" is true at goto() and would wave this
    // through *ahead* of the reveal rather than after it. Wait for the play to
    // have actually happened first: data-cycle is only bumped once a play has
    // run to completion.
    await page.waitForFunction(
      () => !document.querySelector('[data-piece-mark][data-trigger="load"][data-owns="true"]:not([data-cycle])'),
      undefined,
      { timeout: 5000 }
    );
    await page.waitForFunction(
      () => !document.querySelector('[data-piece-mark].revealing'),
      undefined,
      { timeout: 5000 }
    );
    // The class check above only proves .revealing was removed — it says
    // nothing about whether the opacity transition it drove (120ms steps(2,
    // end)) has finished repainting. axe scores what's rendered, not what's
    // classed. Same fix this repo already used for the identical shape of bug
    // in the scroll-motion pass (see CLAUDE.md): poll the actual computed
    // state, not the class that starts the transition toward it.
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.ch[data-piece] .glyph')).every(
          (glyph) => getComputedStyle(glyph).opacity === '1'
        ),
      undefined,
      { timeout: 5000 }
    );

    if (path === '/') {
      // axe reads one static snapshot, and Home's unentered [data-reveal]
      // content sits at opacity 0 by design until scrolled to — axe blends
      // that into the background and scores it as a contrast failure. Scan
      // the state a visitor actually sees: every section revealed.
      //
      // Gated on data-motion: the reveal script sets it only when JS ran and
      // motion isn't reduced. Without it no .in class is ever added (content
      // is already at opacity 1 and needs no reveal), and the poll below
      // would hang until timeout instead of passing trivially.
      const motionOn = await page.evaluate(
        () => document.documentElement.dataset.motion === 'on'
      );
      if (motionOn) {
        await page.evaluate(async () => {
          for (const s of document.querySelectorAll('[data-scroll-section]')) {
            // 'instant' matters: html { scroll-behavior: smooth } makes a bare
            // scrollIntoView() animate, which doesn't settle within the 150ms
            // below — the last section's scroll then got cut off by the
            // scrollTo(0, 0) and never tripped its observer.
            s.scrollIntoView({ behavior: 'instant' });
            await new Promise((r) => setTimeout(r, 150));
          }
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
        await expect
          .poll(() => page.locator('[data-scroll-section]:not(.in)').count())
          .toBe(0);

        // .in only marks the reveal as STARTED. The fade runs 520ms plus up to
        // 70ms per staggered child, and axe scores whatever blended opacity it
        // catches — scanning here without waiting reads a mid-fade foreground
        // as a contrast failure. Wait for the state axe actually measures.
        await expect
          .poll(() =>
            page.evaluate(() =>
              Array.from(document.querySelectorAll('[data-reveal]')).every(
                (el) => getComputedStyle(el).opacity === '1'
              )
            )
          )
          .toBe(true);
      }
    }

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test(`skip link is the first tab stop on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
  });
}

test('reduced motion: Tetris ambient loop shows a single static frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const before = await page.locator('#tetris-ambient-crisp').innerHTML();
  await page.waitForTimeout(2000);
  const after = await page.locator('#tetris-ambient-crisp').innerHTML();
  expect(after).toBe(before);
});
