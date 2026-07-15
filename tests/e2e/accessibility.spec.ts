import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/projects', '/projects/portfolio-site-rewrite', '/contact', '/this-page-does-not-exist'];

for (const path of pages) {
  test(`no serious or critical accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);

    // The reveal knocks a letter's color to var(--color-bg) on purpose — the
    // piece shows through where the glyph was. axe alpha-blends a foreground
    // into its background and scores the blend, so a scan landing mid-reveal
    // reports a real contrast failure against a state that lasts ~800ms. Scan
    // the resting state instead: same ruling as the scroll-reveal conflict this
    // repo already settled (see CLAUDE.md) — no exclusions, no rule disabled,
    // just don't scan a transient frame.
    await page.waitForFunction(
      () => !document.querySelector('[data-piece-mark].revealing'),
      undefined,
      { timeout: 5000 }
    );
    // The class check above only proves the .revealing class was removed —
    // it says nothing about whether the .glyph color transition it drove
    // (transition: color 120ms steps(2, end)) has actually finished
    // repainting. axe scores what's rendered, not what's classed, so a scan
    // landing in that ~120ms gap can still see a knocked-out glyph and
    // report the same contrast failure this wait exists to prevent. Same
    // fix this repo already used for the identical shape of bug in the
    // scroll-motion pass (see CLAUDE.md): poll the actual computed state
    // axe measures, not the class that starts the transition toward it. At
    // rest a .glyph inherits its .ch's color, so the two are equal; mid-
    // reveal `.revealing .ch[data-piece] .glyph { color: var(--color-bg) }`
    // overrides the glyph only, so they differ. Equal-again is exactly
    // "finished repainting."
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.ch[data-piece]')).every((ch) => {
          const glyph = ch.querySelector('.glyph');
          if (!glyph) return true;
          return getComputedStyle(ch).color === getComputedStyle(glyph).color;
        }),
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
