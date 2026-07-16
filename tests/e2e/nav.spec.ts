import { test, expect } from '@playwright/test';

test('desktop: rail renders fully expanded with both links reachable and labeled', async ({ page }) => {
  // 1440px is past the rail's own ~1149px full-width threshold (--rail-width
  // in global.css), so it's pinned at its 12rem max here rather than the
  // narrower clamped width a viewport below that threshold would produce.
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');

  const rail = page.locator('#nav-rail');
  await expect(rail).toHaveCSS('width', '192px'); // 12rem at the 16px root font size

  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
});

test('desktop: rail narrows toward its floor on a narrower desktop window', async ({ page }) => {
  // Below the rail's ~1149px full-width threshold, --rail-width clamps between
  // a 9rem floor and 12rem — at 900px it should be narrower than 12rem but no
  // narrower than the 9rem (144px) floor, and still above the 769px
  // breakpoint where the rail disappears entirely for the mobile nav.
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/');

  const rail = page.locator('#nav-rail');
  const width = await rail.evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThan(192);
  expect(width).toBeGreaterThanOrEqual(144);

  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();
});

test('desktop: wordmark links home', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/projects');
  await page.click('.rail-home');
  await expect(page).toHaveURL('/');
});

test('mobile: rail is hidden, top bar + drawer are used instead', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');

  await expect(page.locator('#nav-rail')).toBeHidden();

  const drawer = page.locator('#mobile-drawer');
  await expect(drawer).toBeHidden();

  await page.click('#mobile-nav-toggle');
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
});

test.describe('mobile: every route scrolls', () => {
  // html { scroll-snap-type: y mandatory } applied sitewide below 769px, but
  // only Home authors section snap targets. On every other route the sole snap
  // area was .mobile-nav's own scroll-snap-align: start at document position 0
  // — so mandatory snapping pinned the viewport there and the page could not be
  // scrolled at all. /contact's Send button was unreachable, which is the site's
  // only contact channel; 3 of 4 project cards were unreachable.
  //
  // The suite missed it because its one mobile test visited '/', the single
  // route with real snap targets and therefore the only one where this is
  // invisible.
  for (const path of ['/contact', '/projects', '/projects/terp-rater', '/this-page-does-not-exist']) {
    test(`${path} scrolls on a phone`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 664 });
      await page.goto(path);

      const scrollable = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight
      );
      expect(scrollable).toBeGreaterThan(50);

      // behavior: 'instant' — scroll-behavior: smooth is a repeat offender in
      // this codebase and will animate (and lose) an unqualified scroll call.
      await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });
  }
});

test.describe('desktop: the rail is not buried by the footer', () => {
  // Footer.astro carries position: relative; z-index: 2 so its own content
  // paints above index.astro's blurred .seam band. But BaseLayout renders
  // <Footer> as a SIBLING of #main-content, so unlike main it gets no
  // margin-left and spans the full viewport width — straight under the fixed
  // rail. z-index: 2 then beats the rail's z-index: auto, so at the bottom of
  // any page the footer's own (transparent) box wins hit-testing over the
  // rail's controls: a visitor sees the theme toggle, clicks it, nothing
  // happens. Keyboard Enter still worked, which is what pins this on hit
  // testing rather than the handler.
  test('the rail theme toggle is clickable at the bottom of the page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/contact');
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
    );
    await page.waitForTimeout(200);

    const toggle = page.locator('#nav-rail .theme-toggle');
    const box = await toggle.boundingBox();
    expect(box).not.toBeNull();

    // What is actually on top at the toggle's own centre point? Asked as
    // "is this the toggle, or inside it" rather than by reading className:
    // the hit at that point is the button's inner <svg>, whose className is an
    // SVGAnimatedString, not a string.
    const hit = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return 'nothing';
        return el.closest('.theme-toggle') ? 'the toggle' : `${el.tagName}.${String((el as HTMLElement).className)}`;
      },
      [box!.x + box!.width / 2, box!.y + box!.height / 2]
    );
    expect(hit).toBe('the toggle');

    // And a real click must land on it.
    await toggle.click();
    await page.waitForTimeout(400);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the footer does not draw underneath the rail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/contact');

    const rail = await page.locator('#nav-rail').boundingBox();
    const footer = await page.locator('.site-footer').boundingBox();
    expect(rail).not.toBeNull();
    expect(footer).not.toBeNull();
    // The footer's border-top drew a hairline straight across the rail column,
    // and the copyright line rendered inside it.
    expect(footer!.x).toBeGreaterThanOrEqual(rail!.width - 1);
  });
});
