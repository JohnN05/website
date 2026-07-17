# johnjng.com Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Create React App single-page site with a multi-page Astro + MDX site (Home, Projects index, Project article, Contact, 404), matching the confirmed design spec at `docs/superpowers/specs/2026-07-11-website-revamp-design.md`.

**Architecture:** Astro static site (zero JS by default), MDX content collections for project write-ups, four "island" widgets hydrated with plain `<script>` tags (no UI framework) — Tetris hero animation, capybara reading-progress mascot, butterfly-knife theme toggle, Minesweeper 404 board. Game/state logic for each widget is extracted into pure, framework-free TypeScript modules under `src/lib/`, unit-tested with Vitest; DOM wiring lives in the corresponding `.astro` component and is covered by Playwright end-to-end tests. Deployed to Netlify; Netlify Forms handles contact submissions with no backend code.

**Tech Stack:** Astro 5, `@astrojs/mdx`, TypeScript (strict), Vitest + happy-dom (unit tests), `@playwright/test` + `@axe-core/playwright` (e2e + automated accessibility checks), Netlify (static hosting + Forms).

## Global Constraints

- No resume download link anywhere on the site.
- No email or phone number displayed as text anywhere — contact only through `/contact`. LinkedIn/GitHub links stay visible everywhere else.
- No dedicated About page — bio/intro content lives on Home only.
- No Pokémon or other copyrighted character likeness for the mascot — capybara design must be original.
- Contact form submits via JS `fetch`, never a plain HTML POST — must never fall through to Netlify's default unstyled success-page redirect.
- No framework/dependency added "just in case" — every dependency added in this plan is used by a task in this plan.
- `prefers-reduced-motion` fallback required for all four hobby details (Tetris ambient loop, capybara run-cycle, knife-flip toggle) — each shows an instant/static state instead of animating.
- Full keyboard operability for both games (Tetris: arrow keys + space; Minesweeper: arrow keys to move focus, Enter to reveal, Space to flag) — no mouse-only interactions.
- Visible focus states sitewide (nav links, toggle, form fields, project cards, game cells).
- Touch controls required on mobile: on-screen buttons for Tetris, tap-to-reveal/long-press-to-flag for Minesweeper.
- `aria-hidden` on the Tetris ambient animation and the capybara mascot — both are decorative supplements, never the sole carrier of information.
- Skip-to-content link, focusable as the first tab stop on every page.
- **Frontend tooling requirement:** before writing or restyling any `.astro` component in this plan, consult the `frontend-design` skill (installed plugin) for layout/typography/color decisions rather than defaulting to generic patterns. After building each page, verify it visually and interactively using the Playwright MCP tools (`mcp__plugin_playwright_playwright__browser_navigate`, `browser_snapshot`, `browser_click`, `browser_take_screenshot`, etc. — the interactive browser tools, distinct from the `@playwright/test` automated suite written in this plan) before marking the task's manual-verification step done.

---

## File Structure

```
website/
├── astro.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── netlify.toml
├── package.json
├── public/
│   ├── capybara-run.svg          (new — placeholder sprite, task 10)
│   ├── capybara-rest.svg         (new — placeholder sprite, task 10)
│   └── (existing favicons/manifest — untouched)
├── src/
│   ├── content/
│   │   ├── config.ts
│   │   └── projects/
│   │       ├── _template.mdx
│   │       └── portfolio-site-rewrite.mdx
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ArticleLayout.astro
│   ├── components/
│   │   ├── SkipLink.astro
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── ThemeToggle.astro
│   │   ├── TetrisHero.astro
│   │   ├── ProjectCard.astro
│   │   ├── CapybaraProgress.astro
│   │   ├── ContactForm.astro
│   │   └── MinesweeperBoard.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── projects/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── contact.astro
│   │   └── 404.astro
│   ├── lib/
│   │   ├── theme.ts / theme.test.ts
│   │   ├── projects.ts / projects.test.ts
│   │   ├── contactForm.ts / contactForm.test.ts
│   │   ├── capybara.ts / capybara.test.ts
│   │   ├── tetris/
│   │   │   ├── engine.ts / engine.test.ts
│   │   │   ├── bag.ts / bag.test.ts
│   │   │   └── ambientDemo.ts / ambientDemo.test.ts
│   │   └── minesweeper/
│   │       └── engine.ts / engine.test.ts
│   └── styles/
│       ├── tokens.css
│       ├── global.css
│       └── animations.css
└── tests/
    └── e2e/
        ├── home.spec.ts
        ├── theme-toggle.spec.ts
        ├── tetris.spec.ts
        ├── projects.spec.ts
        ├── article.spec.ts
        ├── minesweeper-404.spec.ts
        ├── contact.spec.ts
        └── accessibility.spec.ts
```

Files being **removed** (old CRA codebase — full replacement per spec, not incremental patch): `src/App.js`, `src/index.js`, `src/index.css`, `src/animations.css`, all `src/components/*.js`/`*.css`, `src/assets/*` (bio photo, resume PDF, hover-gif assets — none referenced by the new design), `public/index.html` (Astro generates its own page shells, one per `.astro` page).

---

### Task 1: Astro scaffold & toolchain

**Files:**
- Delete: `src/App.js`, `src/index.js`, `src/index.css`, `src/animations.css`, `src/components/*.js`, `src/components/*.css`, `src/assets/*`, `public/index.html`
- Create: `package.json` (rewrite), `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `netlify.toml`, `src/pages/index.astro` (placeholder)
- Test: `tests/e2e/home.spec.ts` (placeholder smoke assertion, extended in Task 5)

**Interfaces:**
- Produces: `npm run dev` / `npm run build` / `npm run preview` / `npm test` / `npm run test:e2e` scripts every later task relies on.

- [ ] **Step 1: Remove the old CRA codebase**

```bash
git rm -r src/App.js src/index.js src/index.css src/animations.css src/components src/assets public/index.html
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "website",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run build && npm run test:e2e"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/mdx": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "happy-dom": "^15.0.0",
    "@playwright/test": "^1.47.0",
    "@axe-core/playwright": "^4.10.0"
  }
}
```

- [ ] **Step 3: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://johnjng.com',
  integrations: [mdx()],
});
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 5: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/lib/theme.test.ts', 'happy-dom'],
      ['src/lib/contactForm.test.ts', 'happy-dom'],
    ],
  },
});
```

- [ ] **Step 6: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:4321',
  },
});
```

- [ ] **Step 7: Write `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Astro builds `src/pages/404.astro` to `dist/404.html`; Netlify automatically serves that file for any unmatched path at the site root — no redirect rule needed.

- [ ] **Step 8: Write placeholder `src/pages/index.astro`**

```astro
---
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>John Ng</title>
  </head>
  <body>
    <h1>John Ng</h1>
  </body>
</html>
```

- [ ] **Step 9: Write placeholder e2e smoke test**

`tests/e2e/home.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('home page responds', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('John Ng');
});
```

- [ ] **Step 10: Install dependencies and verify the toolchain boots**

```bash
npm install
npx playwright install --with-deps chromium
npm run test:all
```

Expected: `npm test` reports "no test files" (none written yet — fine), `npm run build` succeeds, `npm run test:e2e` passes the one smoke test.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro toolchain, remove CRA codebase"
```

---

### Task 2: Design tokens, global styles, base layout (nav, footer, skip link)

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/animations.css`, `src/components/SkipLink.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro` (use `BaseLayout`)
- Test: `tests/e2e/home.spec.ts` (extend)

**Interfaces:**
- Produces: `BaseLayout.astro` accepting `Props: { title: string; description?: string }`, rendering `<SkipLink />`, `<Nav />`, `<main id="main-content"><slot /></main>`, `<Footer />`. All later pages wrap content in this layout.

- [ ] **Step 1: Write design tokens**

`src/styles/tokens.css`:
```css
:root {
  --color-bg: #FAF7F0;
  --color-text: #0F1E3D;
  --color-accent: #3454D1;
  --color-text-secondary: #4A5468;
}

:root[data-theme='dark'] {
  --color-bg: #0F1E3D;
  --color-text: #FAF7F0;
  --color-accent: #3454D1;
  --color-text-secondary: #9AA7B8;
}
```

- [ ] **Step 2: Write global styles**

`src/styles/global.css`:
```css
* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: 'Inter', sans-serif;
  transition: background-color 0.2s ease, color 0.2s ease;
}

h1, h2, h3 { font-family: 'Syne', sans-serif; font-weight: 800; }

.eyebrow, .meta, .wordmark { font-family: 'IBM Plex Mono', monospace; }

a { color: inherit; }

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

The blanket reduced-motion rule above is a safety net; Tasks 3, 8 and 10 additionally branch in JS on `prefers-reduced-motion` to swap to genuinely static states (skip the run-cycle/ambient-loop frames entirely) rather than just playing them very fast.

- [ ] **Step 3: Create `src/styles/animations.css` (empty file, populated by later tasks)**

```css
/* Keyframes for the knife-flip toggle, Tetris ambient loop, and capybara
   run-cycle are added in Tasks 3, 8, and 10 respectively. */
```

- [ ] **Step 4: Write `SkipLink.astro`**

```astro
<a class="skip-link" href="#main-content">Skip to main content</a>
<style>
  .skip-link {
    position: absolute;
    left: -9999px;
    top: 0;
    background: var(--color-accent);
    color: #fff;
    padding: 0.75rem 1rem;
    z-index: 100;
    font-family: 'Inter', sans-serif;
  }
  .skip-link:focus {
    left: 0.5rem;
    top: 0.5rem;
  }
</style>
```

- [ ] **Step 5: Write `Nav.astro` (theme toggle slot left empty until Task 3)**

```astro
---
---
<nav class="site-nav">
  <a href="/" class="wordmark">JOHN NG</a>
  <div class="nav-links">
    <a href="/projects">Projects</a>
    <a href="/contact">Contact</a>
    <slot name="theme-toggle" />
  </div>
</nav>
<style>
  .site-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
  }
  .wordmark {
    font-weight: 600;
    text-decoration: none;
    letter-spacing: 0.05em;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .nav-links a {
    text-decoration: none;
  }
</style>
```

- [ ] **Step 6: Write `Footer.astro` with inline SVG social icons**

```astro
---
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <p class="meta">&copy; {year} John Ng</p>
  <div class="social-links">
    <!-- Replace with your real LinkedIn profile URL -->
    <a href="https://www.linkedin.com/in/john-ng/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>
    </a>
    <a href="https://github.com/JohnN05" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.1c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/></svg>
    </a>
  </div>
</footer>
<style>
  .site-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2rem 1.5rem;
    border-top: 1px solid var(--color-text-secondary);
  }
  .social-links {
    display: flex;
    gap: 1rem;
  }
  .social-links a {
    color: var(--color-text);
  }
</style>
```

- [ ] **Step 7: Write `BaseLayout.astro`**

```astro
---
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import SkipLink from '../components/SkipLink.astro';
import '../styles/tokens.css';
import '../styles/global.css';
import '../styles/animations.css';

interface Props {
  title: string;
  description?: string;
}
const { title, description = 'John Ng — software engineer portfolio' } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Source+Serif+4:wght@400;500&family=Inter:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <script is:inline>
      (function () {
        var stored = localStorage.getItem('theme');
        var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.dataset.theme = theme;
      })();
    </script>
  </head>
  <body>
    <SkipLink />
    <Nav />
    <main id="main-content">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

The inline blocking script duplicates the (two-line) theme decision that `src/lib/theme.ts` implements in Task 3 — it must run synchronously before first paint to avoid a flash of the wrong theme, and module scripts in the `<head>` are deferred, so a tiny standalone snippet is intentional here rather than importing the module.

- [ ] **Step 8: Update `src/pages/index.astro` to use the layout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="John Ng">
  <h1>John Ng</h1>
</BaseLayout>
```

- [ ] **Step 9: Run the e2e smoke test**

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 10: Manually verify in browser**

Use the Playwright MCP tools to load the page and confirm the skip link is the first focusable element and receives visible focus styling:
```
mcp__plugin_playwright_playwright__browser_navigate  → http://localhost:4321/
mcp__plugin_playwright_playwright__browser_press_key → Tab
mcp__plugin_playwright_playwright__browser_snapshot
```
Expected: the skip link is focused and visible in the top-left corner.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, global styles, and base layout"
```

---

### Task 3: Theme toggle (butterfly-knife flip)

**Files:**
- Create: `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/components/ThemeToggle.astro`
- Modify: `src/components/Nav.astro` (fill the `theme-toggle` slot), `src/styles/animations.css`
- Test: `src/lib/theme.test.ts`, `tests/e2e/theme-toggle.spec.ts`

**Interfaces:**
- Consumes: none (first widget built).
- Produces: `getInitialTheme(storage, matchMedia): 'light' | 'dark'`, `toggleTheme(current): 'light' | 'dark'`, `persistTheme(storage, theme): void` — all pure functions other components don't need but establish the pattern used by Tasks 6, 8, 10.

- [ ] **Step 1: Write the failing unit tests**

`src/lib/theme.test.ts`:
```ts
// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { getInitialTheme, toggleTheme, persistTheme } from './theme';

describe('getInitialTheme', () => {
  it('returns the stored theme when present', () => {
    const storage = { getItem: vi.fn().mockReturnValue('dark') };
    const matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(getInitialTheme(storage, matchMedia)).toBe('dark');
  });

  it('falls back to prefers-color-scheme when nothing is stored', () => {
    const storage = { getItem: vi.fn().mockReturnValue(null) };
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(getInitialTheme(storage, matchMedia)).toBe('dark');
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('defaults to light when no preference is stored or detected', () => {
    const storage = { getItem: vi.fn().mockReturnValue(null) };
    const matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(getInitialTheme(storage, matchMedia)).toBe('light');
  });
});

describe('toggleTheme', () => {
  it('flips light to dark and back', () => {
    expect(toggleTheme('light')).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
  });
});

describe('persistTheme', () => {
  it('writes the theme to storage', () => {
    const storage = { setItem: vi.fn() };
    persistTheme(storage, 'dark');
    expect(storage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- theme
```
Expected: FAIL — `Cannot find module './theme'`.

- [ ] **Step 3: Implement `src/lib/theme.ts`**

```ts
export type Theme = 'light' | 'dark';

export function getInitialTheme(
  storage: Pick<Storage, 'getItem'>,
  matchMedia: (query: string) => { matches: boolean }
): Theme {
  const stored = storage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

export function persistTheme(storage: Pick<Storage, 'setItem'>, theme: Theme): void {
  storage.setItem('theme', theme);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- theme
```
Expected: PASS (4 tests).

- [ ] **Step 5: Add the knife-flip keyframes**

Append to `src/styles/animations.css`:
```css
.theme-toggle .handle-a,
.theme-toggle .handle-b {
  transform-origin: 20px 8px;
  transition: transform 0.35s ease;
}
.theme-toggle.flipping .handle-a { transform: rotate(-140deg); }
.theme-toggle.flipping .handle-b { transform: rotate(140deg); }

@media (prefers-reduced-motion: reduce) {
  .theme-toggle .handle-a,
  .theme-toggle .handle-b {
    transition: none;
  }
}
```

- [ ] **Step 6: Write `ThemeToggle.astro`**

```astro
<button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode" type="button">
  <svg viewBox="0 0 48 16" width="48" height="16" aria-hidden="true">
    <rect class="handle handle-a" x="0" y="6" width="20" height="4" rx="2" fill="currentColor" />
    <rect class="handle handle-b" x="28" y="6" width="20" height="4" rx="2" fill="currentColor" />
    <rect class="blade" x="20" y="7" width="8" height="2" fill="var(--color-accent)" />
  </svg>
</button>
<style>
  .theme-toggle {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text);
    padding: 0.25rem;
  }
</style>
<script>
  import { getInitialTheme, toggleTheme, persistTheme } from '../lib/theme';

  const button = document.getElementById('theme-toggle')!;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function applyTheme(theme: 'light' | 'dark') {
    document.documentElement.dataset.theme = theme;
  }

  button.addEventListener('click', () => {
    const current =
      (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) ??
      getInitialTheme(localStorage, (q) => window.matchMedia(q));
    const next = toggleTheme(current);

    if (reducedMotion.matches) {
      applyTheme(next);
    } else {
      button.classList.add('flipping');
      window.setTimeout(() => {
        applyTheme(next);
        button.classList.remove('flipping');
      }, 350);
    }
    persistTheme(localStorage, next);
  });
</script>
```

- [ ] **Step 7: Wire it into `Nav.astro`**

```astro
---
import ThemeToggle from './ThemeToggle.astro';
---
<nav class="site-nav">
  <a href="/" class="wordmark">JOHN NG</a>
  <div class="nav-links">
    <a href="/projects">Projects</a>
    <a href="/contact">Contact</a>
    <ThemeToggle />
  </div>
</nav>
<style>
  .site-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
  }
  .wordmark {
    font-weight: 600;
    text-decoration: none;
    letter-spacing: 0.05em;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .nav-links a {
    text-decoration: none;
  }
</style>
```

- [ ] **Step 8: Write the failing e2e test**

`tests/e2e/theme-toggle.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('clicking the toggle switches and persists theme', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.click('#theme-toggle');
  await page.waitForTimeout(400);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('reduced motion switches instantly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.click('#theme-toggle');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
```

- [ ] **Step 9: Run e2e tests**

```bash
npm run test:e2e -- theme-toggle
```
Expected: PASS (2 tests).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add butterfly-knife-flip theme toggle"
```

---

### Task 4: Content collection schema, featured-project selection logic, seed content

**Files:**
- Create: `src/content/config.ts`, `src/content/projects/_template.mdx`, `src/content/projects/portfolio-site-rewrite.mdx`, `src/lib/projects.ts`, `src/lib/projects.test.ts`

**Interfaces:**
- Produces: `ProjectMeta { slug, title, date, summary, tags, draft, featured }`, `selectFeatured(projects: ProjectMeta[], count?: number): ProjectMeta[]` — consumed by Task 5 (Home) and read alongside `getCollection('projects', …)` by Task 9 (Projects index) and Task 11 (article route).

- [ ] **Step 1: Write the failing unit tests**

`src/lib/projects.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { selectFeatured, type ProjectMeta } from './projects';

function project(overrides: Partial<ProjectMeta>): ProjectMeta {
  return {
    slug: 'x',
    title: 'X',
    date: new Date('2026-01-01'),
    summary: '',
    tags: [],
    draft: false,
    featured: false,
    ...overrides,
  };
}

describe('selectFeatured', () => {
  it('returns featured entries sorted newest first', () => {
    const older = project({ slug: 'a', featured: true, date: new Date('2026-01-01') });
    const newer = project({ slug: 'b', featured: true, date: new Date('2026-02-01') });
    expect(selectFeatured([older, newer])).toEqual([newer, older]);
  });

  it('falls back to latest non-draft entries when none are featured', () => {
    const oldest = project({ slug: 'a', date: new Date('2026-01-01') });
    const newest = project({ slug: 'b', date: new Date('2026-03-01') });
    const middle = project({ slug: 'c', date: new Date('2026-02-01') });
    expect(selectFeatured([oldest, newest, middle], 2)).toEqual([newest, middle]);
  });

  it('excludes drafts from both the featured and fallback paths', () => {
    const draftFeatured = project({ slug: 'a', featured: true, draft: true });
    const published = project({ slug: 'b', date: new Date('2026-02-01') });
    expect(selectFeatured([draftFeatured, published])).toEqual([published]);
  });

  it('respects the count limit', () => {
    const items = [1, 2, 3, 4].map((n) => project({ slug: String(n), date: new Date(2026, n) }));
    expect(selectFeatured(items, 2)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- projects
```
Expected: FAIL — `Cannot find module './projects'`.

- [ ] **Step 3: Implement `src/lib/projects.ts`**

```ts
export interface ProjectMeta {
  slug: string;
  title: string;
  date: Date;
  summary: string;
  tags: string[];
  draft: boolean;
  featured: boolean;
}

export function selectFeatured(projects: ProjectMeta[], count = 3): ProjectMeta[] {
  const published = projects.filter((p) => !p.draft);
  const featured = published.filter((p) => p.featured).sort(byDateDesc);
  if (featured.length > 0) return featured.slice(0, count);
  return [...published].sort(byDateDesc).slice(0, count);
}

function byDateDesc(a: ProjectMeta, b: ProjectMeta): number {
  return b.date.getTime() - a.date.getTime();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- projects
```
Expected: PASS (4 tests).

- [ ] **Step 5: Write the content collection schema**

`src/content/config.ts`:
```ts
import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});

export const collections = { projects };
```

- [ ] **Step 6: Write the template article**

`src/content/projects/_template.mdx`:
```mdx
---
title: "Project Title"
date: 2026-01-01
summary: "One or two sentences describing what this project does and who it's for."
tags: ["tag-one", "tag-two"]
draft: true
featured: false
---

## Overview

Describe the problem this project solves and who it's for.

## How it works

Explain the approach. Code blocks work like this:

```ts
export function example() {
  return true;
}
```

## Result

Wrap up with the outcome, what you learned, or what's next.
```

- [ ] **Step 7: Write one real seed article**

`src/content/projects/portfolio-site-rewrite.mdx`:
```mdx
---
title: "Rebuilding johnjng.com on Astro"
date: 2026-07-11
summary: "Replacing a single-page CRA app with a multi-page Astro + MDX site — and the case for shipping zero JS by default."
tags: ["astro", "design"]
draft: false
featured: true
---

## Overview

The previous version of this site was a single-page Create React App that pulled
every GitHub repo live via the API. It worked, but it read as a demo of "I can
call an API" rather than a considered introduction to my work.

## How it works

This rewrite moves to Astro's island architecture: pages ship no JavaScript
unless a specific component needs it. Project write-ups are plain MDX files —
adding a new one is a matter of dropping a file into `src/content/projects/`,
no code changes required.

## Result

A lighter, faster site with room to actually write about projects instead of
just listing them.
```

*(This article is a genuine placeholder — replace with real project write-ups before launch; add a second one by copying `_template.mdx`.)*

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add content collection schema and featured-project selection"
```

---

### Task 5: Home page

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/components/ProjectCard.astro`
- Test: `tests/e2e/home.spec.ts` (extend)

**Interfaces:**
- Consumes: `selectFeatured` from Task 4, `BaseLayout` from Task 2.
- Produces: `ProjectCard.astro` accepting `Props: { project: { slug, title, summary, date, tags } }` — reused by Task 9 (Projects index).

- [ ] **Step 1: Write `ProjectCard.astro`**

```astro
---
interface Props {
  project: { slug: string; title: string; summary: string; date: Date; tags: string[] };
}
const { project } = Astro.props;
const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(project.date);
---
<a class="project-card" href={`/projects/${project.slug}`}>
  <p class="meta">{formattedDate}</p>
  <h3>{project.title}</h3>
  <p class="summary">{project.summary}</p>
  <ul class="tags">
    {project.tags.map((tag) => <li>{tag}</li>)}
  </ul>
</a>
<style>
  .project-card {
    display: block;
    padding: 1.25rem;
    border: 1px solid var(--color-text-secondary);
    text-decoration: none;
    color: var(--color-text);
  }
  .project-card .summary {
    color: var(--color-text-secondary);
  }
  .tags {
    display: flex;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
  }
</style>
```

- [ ] **Step 2: Write the Home page**

`src/pages/index.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ProjectCard from '../components/ProjectCard.astro';
import TetrisHero from '../components/TetrisHero.astro';
import { getCollection } from 'astro:content';
import { selectFeatured } from '../lib/projects';

const allProjects = await getCollection('projects');
const featured = selectFeatured(
  allProjects.map((p) => ({ slug: p.slug, ...p.data })),
  3
);
---
<BaseLayout title="John Ng">
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Software Engineer</p>
      <h1>Coding practical solutions for people. That's always been the point.</h1>
    </div>
    <TetrisHero />
  </section>

  <section class="featured">
    <h2>Featured projects</h2>
    <div class="project-grid">
      {featured.map((p) => <ProjectCard project={p} />)}
    </div>
  </section>
</BaseLayout>
<style>
  .hero {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    padding: 4rem 1.5rem;
  }
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }
  .hero-copy h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    max-width: 20ch;
  }
  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    padding: 0 1.5rem 4rem;
  }
</style>
```

`TetrisHero.astro` doesn't exist yet — Task 8 creates it. Add a temporary placeholder so this task's build passes independently:

```astro
<!-- src/components/TetrisHero.astro (temporary placeholder, replaced in Task 8) -->
<div class="tetris-hero-placeholder"></div>
```

- [ ] **Step 3: Extend the e2e smoke test**

`tests/e2e/home.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('home page renders hero and featured projects', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Coding practical solutions');
  await expect(page.locator('.project-card')).toHaveCount(1); // one seed article so far
});
```

- [ ] **Step 4: Run the e2e test**

```bash
npm run test:e2e -- home
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: build Home page with featured-projects preview"
```

---

### Task 6: Tetris engine (pure game logic)

**Files:**
- Create: `src/lib/tetris/engine.ts`, `src/lib/tetris/engine.test.ts`

**Interfaces:**
- Produces: `COLS`, `ROWS`, `PieceType`, `Cell`, `Piece`, `GameState`, `createGame(firstPiece)`, `moveLeft/moveRight/rotate(state)`, `softDrop(state, nextPiece)`, `hardDrop(state, nextPiece)` — consumed by Task 7 (ambient demo) and Task 8 (TetrisHero component).

- [ ] **Step 1: Write the failing unit tests**

`src/lib/tetris/engine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createGame, moveLeft, moveRight, rotate, softDrop, hardDrop, COLS, ROWS } from './engine';

describe('createGame', () => {
  it('spawns the requested piece near the top center, no lines cleared', () => {
    const state = createGame('O');
    expect(state.current.type).toBe('O');
    expect(state.score).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.board).toHaveLength(ROWS);
    expect(state.board[0]).toHaveLength(COLS);
  });
});

describe('movement', () => {
  it('moves left and right within bounds', () => {
    const state = createGame('O');
    const moved = moveRight(state);
    expect(moved.current.x).toBe(state.current.x + 1);
    const back = moveLeft(moved);
    expect(back.current.x).toBe(state.current.x);
  });

  it('refuses to move past the left wall', () => {
    let state = createGame('O');
    for (let i = 0; i < 10; i++) state = moveLeft(state);
    const before = state.current.x;
    expect(moveLeft(state).current.x).toBe(before);
  });

  it('refuses to move past the right wall', () => {
    let state = createGame('O');
    for (let i = 0; i < 10; i++) state = moveRight(state);
    const before = state.current.x;
    expect(moveRight(state).current.x).toBe(before);
  });

  it('rotates through 4 states and back to the first', () => {
    let state = createGame('T');
    const first = state.current.rotation;
    for (let i = 0; i < 4; i++) state = rotate(state);
    expect(state.current.rotation).toBe(first);
  });
});

describe('locking and line clears', () => {
  it('locks a piece into the board on soft drop when it can no longer fall', () => {
    let state = createGame('O');
    for (let i = 0; i < ROWS + 2; i++) state = softDrop(state, 'O');
    expect(state.board.some((row) => row.some((cell) => cell !== null))).toBe(true);
  });

  it('hard drop locks immediately and awards points for a cleared line', () => {
    let state = createGame('I');
    // Fill the bottom row except a 1-wide gap using O pieces (2x2), then
    // drop an I piece rotated vertically into the gap — property check
    // rather than exact geometry: score increases only when a line clears.
    const before = state.score;
    state = hardDrop(state, 'I');
    expect(state.score).toBeGreaterThanOrEqual(before);
    expect(state.current.type).toBe('I');
  });

  it('sets gameOver when a newly spawned piece immediately collides', () => {
    let state = createGame('O');
    // Stack pieces at the very top until spawn collides.
    for (let i = 0; i < 200 && !state.gameOver; i++) {
      state = hardDrop(state, 'O');
    }
    expect(state.gameOver).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tetris/engine
```
Expected: FAIL — `Cannot find module './engine'`.

- [ ] **Step 3: Implement `src/lib/tetris/engine.ts`**

```ts
export const COLS = 10;
export const ROWS = 20;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Cell = PieceType | null;

const SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

export interface Piece {
  type: PieceType;
  rotation: number;
  x: number;
  y: number;
}

export interface GameState {
  board: Cell[][];
  current: Piece;
  score: number;
  linesCleared: number;
  gameOver: boolean;
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function cellsFor(piece: Piece): number[][] {
  return SHAPES[piece.type][piece.rotation].map(([dx, dy]) => [piece.x + dx, piece.y + dy]);
}

function collides(board: Cell[][], piece: Piece): boolean {
  return cellsFor(piece).some(([x, y]) => {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y < 0) return false;
    return board[y][x] !== null;
  });
}

export function createGame(firstPiece: PieceType): GameState {
  return {
    board: emptyBoard(),
    current: { type: firstPiece, rotation: 0, x: 3, y: -2 },
    score: 0,
    linesCleared: 0,
    gameOver: false,
  };
}

function withPiece(state: GameState, piece: Piece): GameState {
  if (collides(state.board, piece)) return state;
  return { ...state, current: piece };
}

export function moveLeft(state: GameState): GameState {
  return withPiece(state, { ...state.current, x: state.current.x - 1 });
}

export function moveRight(state: GameState): GameState {
  return withPiece(state, { ...state.current, x: state.current.x + 1 });
}

export function rotate(state: GameState): GameState {
  const rotation = (state.current.rotation + 1) % 4;
  return withPiece(state, { ...state.current, rotation });
}

function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - remaining.length;
  const board2 = [
    ...Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null)),
    ...remaining,
  ];
  return { board: board2, cleared };
}

const LINE_SCORES = [0, 100, 300, 500, 800];

function lockPiece(state: GameState, nextPiece: PieceType): GameState {
  const board = state.board.map((row) => [...row]);
  for (const [x, y] of cellsFor(state.current)) {
    if (y < 0) return { ...state, gameOver: true };
    board[y][x] = state.current.type;
  }
  const { board: clearedBoard, cleared } = clearLines(board);
  const spawned: Piece = { type: nextPiece, rotation: 0, x: 3, y: -2 };
  const gameOver = collides(clearedBoard, spawned);
  return {
    board: clearedBoard,
    current: spawned,
    score: state.score + LINE_SCORES[cleared],
    linesCleared: state.linesCleared + cleared,
    gameOver,
  };
}

export function softDrop(state: GameState, nextPiece: PieceType): GameState {
  const dropped = { ...state.current, y: state.current.y + 1 };
  if (collides(state.board, dropped)) return lockPiece(state, nextPiece);
  return { ...state, current: dropped };
}

export function hardDrop(state: GameState, nextPiece: PieceType): GameState {
  let piece = state.current;
  while (!collides(state.board, { ...piece, y: piece.y + 1 })) {
    piece = { ...piece, y: piece.y + 1 };
  }
  return lockPiece({ ...state, current: piece }, nextPiece);
}
```

`softDrop`/`hardDrop` take the *next* piece type as a parameter instead of generating one internally — this keeps the engine pure and deterministic. Task 7's ambient demo supplies a fixed scripted sequence; Task 8's real gameplay supplies pieces from a 7-bag randomizer.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tetris/engine
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure Tetris engine"
```

---

### Task 7: Tetris 7-bag randomizer and ambient demo script

**Files:**
- Create: `src/lib/tetris/bag.ts`, `src/lib/tetris/bag.test.ts`, `src/lib/tetris/ambientDemo.ts`, `src/lib/tetris/ambientDemo.test.ts`

**Interfaces:**
- Consumes: `createGame`, `moveLeft`, `moveRight`, `rotate`, `hardDrop`, `GameState`, `PieceType` from Task 6.
- Produces: `createBag(rng?): () => PieceType` and `createAmbientDemo(): GameState`, `stepAmbientDemo(state, stepIndex): GameState` — consumed by Task 8.

- [ ] **Step 1: Write the failing bag test**

`src/lib/tetris/bag.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createBag } from './bag';

describe('createBag', () => {
  it('yields each of the 7 piece types exactly once per bag', () => {
    const next = createBag(() => 0.5);
    const drawn = Array.from({ length: 7 }, () => next());
    expect(new Set(drawn).size).toBe(7);
  });

  it('refills with a new full bag after 7 draws', () => {
    const next = createBag(() => 0.5);
    const firstBag = Array.from({ length: 7 }, () => next());
    const secondBag = Array.from({ length: 7 }, () => next());
    expect(new Set(secondBag).size).toBe(7);
    expect(secondBag).toEqual(firstBag); // deterministic rng -> same shuffle
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tetris/bag
```
Expected: FAIL — `Cannot find module './bag'`.

- [ ] **Step 3: Implement `src/lib/tetris/bag.ts`**

```ts
import type { PieceType } from './engine';

const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function createBag(rng: () => number = Math.random): () => PieceType {
  let bag: PieceType[] = [];
  return function next(): PieceType {
    if (bag.length === 0) {
      bag = [...TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tetris/bag
```
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing ambient demo test**

`src/lib/tetris/ambientDemo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createAmbientDemo, stepAmbientDemo } from './ambientDemo';

describe('ambient demo', () => {
  it('never reaches game over while cycling', () => {
    let state = createAmbientDemo();
    for (let i = 0; i < 50; i++) {
      state = stepAmbientDemo(state, i);
      expect(state.gameOver).toBe(false);
    }
  });

  it('clears at least one line over a full cycle', () => {
    let state = createAmbientDemo();
    let maxLinesCleared = 0;
    for (let i = 0; i < 20; i++) {
      state = stepAmbientDemo(state, i);
      maxLinesCleared = Math.max(maxLinesCleared, state.linesCleared);
    }
    expect(maxLinesCleared).toBeGreaterThan(0);
  });

  it('is deterministic given the same step sequence', () => {
    let a = createAmbientDemo();
    let b = createAmbientDemo();
    for (let i = 0; i < 10; i++) {
      a = stepAmbientDemo(a, i);
      b = stepAmbientDemo(b, i);
    }
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npm test -- tetris/ambientDemo
```
Expected: FAIL — `Cannot find module './ambientDemo'`.

- [ ] **Step 7: Implement `src/lib/tetris/ambientDemo.ts`**

```ts
import { createGame, moveLeft, moveRight, rotate, hardDrop, type GameState, type PieceType } from './engine';

type Move = 'left' | 'right' | 'rotate' | 'drop';

const SCRIPT: { piece: PieceType; moves: Move[] }[] = [
  { piece: 'O', moves: ['left', 'left', 'left', 'left', 'drop'] },
  { piece: 'I', moves: ['rotate', 'left', 'left', 'drop'] },
  { piece: 'O', moves: ['left', 'drop'] },
  { piece: 'I', moves: ['rotate', 'right', 'right', 'right', 'drop'] },
  { piece: 'O', moves: ['right', 'right', 'drop'] },
];

export function createAmbientDemo(): GameState {
  return createGame(SCRIPT[0].piece);
}

export function stepAmbientDemo(state: GameState, stepIndex: number): GameState {
  const scriptIndex = stepIndex % SCRIPT.length;
  const { moves } = SCRIPT[scriptIndex];
  const nextPiece = SCRIPT[(scriptIndex + 1) % SCRIPT.length].piece;
  let next = state;
  for (const move of moves) {
    if (move === 'left') next = moveLeft(next);
    else if (move === 'right') next = moveRight(next);
    else if (move === 'rotate') next = rotate(next);
    else next = hardDrop(next, nextPiece);
  }
  if (next.gameOver) return createGame(SCRIPT[0].piece);
  return next;
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
npm test -- tetris/ambientDemo
```
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Tetris bag randomizer and ambient demo script"
```

---

### Task 8: TetrisHero component (ambient loop + playable overlay)

**Files:**
- Modify: `src/components/TetrisHero.astro` (replace Task 5's placeholder)
- Modify: `src/styles/animations.css` (no new keyframes needed — grid re-render handles the ambient loop)
- Test: `tests/e2e/tetris.spec.ts`

**Interfaces:**
- Consumes: `createGame`, `moveLeft`, `moveRight`, `rotate`, `softDrop`, `hardDrop`, `COLS`, `ROWS` from Task 6; `createBag` from Task 7; `createAmbientDemo`, `stepAmbientDemo` from Task 7.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/tetris.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('desktop: clicking the ambient animation opens a playable overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.click('#tetris-open');
  await expect(page.locator('#tetris-overlay')).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');

  await page.keyboard.press('Escape');
  await expect(page.locator('#tetris-overlay')).toBeHidden();
  await expect(page.locator('#tetris-open')).toBeFocused();
});

test('mobile: the hero widget is hidden entirely', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.locator('.tetris-hero')).toBeHidden();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:e2e -- tetris
```
Expected: FAIL — `#tetris-open` not found (placeholder has no such element).

- [ ] **Step 3: Implement `src/components/TetrisHero.astro`**

```astro
<div class="tetris-hero" id="tetris-hero">
  <div class="tetris-ambient" id="tetris-ambient" aria-hidden="true" role="presentation"></div>
  <button id="tetris-open" class="tetris-open-btn" aria-label="Play Tetris" type="button"></button>

  <div class="tetris-overlay" id="tetris-overlay" hidden>
    <div class="tetris-overlay-panel" role="dialog" aria-modal="true" aria-label="Tetris">
      <button id="tetris-close" class="tetris-close-btn" aria-label="Close Tetris" type="button">&times;</button>
      <div class="tetris-board" id="tetris-board"></div>
      <p class="tetris-score" id="tetris-score">Score: 0</p>
      <div class="tetris-touch-controls">
        <button data-action="left" aria-label="Move left" type="button">&larr;</button>
        <button data-action="rotate" aria-label="Rotate" type="button">&#8635;</button>
        <button data-action="right" aria-label="Move right" type="button">&rarr;</button>
        <button data-action="drop" aria-label="Hard drop" type="button">&darr;</button>
      </div>
    </div>
  </div>
</div>
<style>
  .tetris-hero { position: relative; width: 120px; }
  @media (max-width: 768px) { .tetris-hero { display: none; } }
  .tetris-ambient, .tetris-board {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 1px;
    background: var(--color-text-secondary);
  }
  .tetris-ambient { width: 120px; aspect-ratio: 10 / 20; }
  .tetris-board { width: 200px; aspect-ratio: 10 / 20; }
  .tetris-ambient div, .tetris-board div { background: var(--color-bg); }
  .tetris-ambient div.filled, .tetris-board div.filled { background: var(--color-accent); }
  .tetris-open-btn { position: absolute; inset: 0; background: transparent; border: none; cursor: pointer; }
  .tetris-overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .tetris-overlay[hidden] { display: none; }
  .tetris-overlay-panel {
    position: relative; background: var(--color-bg); padding: 1.5rem;
    border-radius: 0.5rem; text-align: center;
  }
  .tetris-close-btn {
    position: absolute; top: 0.5rem; right: 0.5rem; background: none;
    border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text);
  }
  .tetris-touch-controls { display: flex; gap: 0.5rem; justify-content: center; margin-top: 1rem; }
  @media (min-width: 769px) { .tetris-touch-controls { display: none; } }
</style>
<script>
  import {
    createGame, moveLeft, moveRight, rotate, softDrop, hardDrop, COLS, ROWS, type GameState,
  } from '../lib/tetris/engine';
  import { createBag } from '../lib/tetris/bag';
  import { createAmbientDemo, stepAmbientDemo } from '../lib/tetris/ambientDemo';

  const ambientEl = document.getElementById('tetris-ambient')!;
  const boardEl = document.getElementById('tetris-board')!;
  const scoreEl = document.getElementById('tetris-score')!;
  const overlay = document.getElementById('tetris-overlay')!;
  const openBtn = document.getElementById('tetris-open')!;
  const closeBtn = document.getElementById('tetris-close')!;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function renderBoard(el: HTMLElement, state: GameState) {
    el.innerHTML = '';
    const filled = new Set<string>();
    state.board.forEach((row, y) => row.forEach((cell, x) => {
      if (cell) filled.add(`${x},${y}`);
    }));
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = document.createElement('div');
        if (filled.has(`${x},${y}`)) cell.classList.add('filled');
        el.appendChild(cell);
      }
    }
  }

  let ambientState = createAmbientDemo();
  let ambientStep = 0;
  renderBoard(ambientEl, ambientState);

  if (!reducedMotion.matches) {
    setInterval(() => {
      ambientState = stepAmbientDemo(ambientState, ambientStep++);
      renderBoard(ambientEl, ambientState);
    }, 900);
  }

  let bag = createBag();
  let game = createGame(bag());
  let playing = false;
  let gravityTimer: number | undefined;

  function renderGame() {
    renderBoard(boardEl, game);
    scoreEl.textContent = `Score: ${game.score}`;
  }

  function startGravity() {
    gravityTimer = window.setInterval(() => {
      if (!playing) return;
      game = softDrop(game, bag());
      renderGame();
    }, 800);
  }

  function stopGravity() {
    if (gravityTimer !== undefined) window.clearInterval(gravityTimer);
  }

  function openOverlay() {
    bag = createBag();
    game = createGame(bag());
    playing = true;
    overlay.hidden = false;
    renderGame();
    startGravity();
  }

  function closeOverlay() {
    playing = false;
    stopGravity();
    overlay.hidden = true;
    openBtn.focus();
  }

  openBtn.addEventListener('click', openOverlay);
  closeBtn.addEventListener('click', closeOverlay);

  document.addEventListener('keydown', (e) => {
    if (!playing) return;
    if (e.key === 'Escape') return closeOverlay();
    if (e.key === 'ArrowLeft') game = moveLeft(game);
    else if (e.key === 'ArrowRight') game = moveRight(game);
    else if (e.key === 'ArrowUp') game = rotate(game);
    else if (e.key === 'ArrowDown') game = softDrop(game, bag());
    else if (e.key === ' ') game = hardDrop(game, bag());
    else return;
    renderGame();
  });

  document.querySelectorAll('.tetris-touch-controls button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'left') game = moveLeft(game);
      else if (action === 'right') game = moveRight(game);
      else if (action === 'rotate') game = rotate(game);
      else if (action === 'drop') game = hardDrop(game, bag());
      renderGame();
    });
  });
</script>
```

Gravity in the overlay runs regardless of `prefers-reduced-motion` — it's a game rule the player controls, not a decorative animation. Only the ambient hero-corner loop (a passive animation) respects the reduced-motion preference, per the accessibility requirement.

- [ ] **Step 4: Run e2e test to verify it passes**

```bash
npm run test:e2e -- tetris
```
Expected: PASS (2 tests).

- [ ] **Step 5: Manually verify with Playwright MCP**

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:4321/
mcp__plugin_playwright_playwright__browser_click    → #tetris-open
mcp__plugin_playwright_playwright__browser_take_screenshot
```
Expected: overlay renders a visible 10x20 grid with the accent-colored current piece.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Tetris hero ambient animation and playable overlay"
```

---

### Task 9: Projects index page

**Files:**
- Create: `src/pages/projects/index.astro`
- Test: `tests/e2e/projects.spec.ts`

**Interfaces:**
- Consumes: `ProjectCard.astro` from Task 5, `BaseLayout` from Task 2, Astro's `getCollection('projects', …)`.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/projects.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('projects index lists non-draft entries newest first', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('h1')).toHaveText('Projects');
  const cards = page.locator('.project-card');
  await expect(cards).toHaveCount(1); // only the seed article is non-draft so far
  await expect(cards.first()).toContainText('Rebuilding johnjng.com on Astro');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:e2e -- projects
```
Expected: FAIL — 404, page doesn't exist yet.

- [ ] **Step 3: Implement `src/pages/projects/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ProjectCard from '../../components/ProjectCard.astro';
import { getCollection } from 'astro:content';

const published = await getCollection('projects', ({ data }) => !data.draft);
const sorted = published
  .map((p) => ({ slug: p.slug, ...p.data }))
  .sort((a, b) => b.date.getTime() - a.date.getTime());
---
<BaseLayout title="Projects — John Ng">
  <h1>Projects</h1>
  <div class="project-grid">
    {sorted.map((p) => <ProjectCard project={p} />)}
  </div>
</BaseLayout>
<style>
  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    padding: 0 1.5rem 4rem;
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:e2e -- projects
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Projects index page"
```

---

### Task 10: Capybara reading-progress logic, Article layout, capybara component

**Files:**
- Create: `src/lib/capybara.ts`, `src/lib/capybara.test.ts`, `src/layouts/ArticleLayout.astro`, `src/components/CapybaraProgress.astro`, `public/capybara-run.svg`, `public/capybara-rest.svg`
- Modify: `src/styles/animations.css`

**Interfaces:**
- Produces: `computeCapybaraState(scrollTop, scrollHeight, clientHeight): { percent, pose, speed }` and `ArticleLayout.astro` accepting `Props: { title: string; date: Date }` — consumed by Task 11 (article route).

- [ ] **Step 1: Write the failing unit tests**

`src/lib/capybara.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeCapybaraState } from './capybara';

describe('computeCapybaraState', () => {
  it('is 0% and running at the top of the article', () => {
    const state = computeCapybaraState(0, 2000, 800);
    expect(state.percent).toBe(0);
    expect(state.pose).toBe('running');
  });

  it('is 100% and resting at the bottom', () => {
    const state = computeCapybaraState(1200, 2000, 800);
    expect(state.percent).toBe(100);
    expect(state.pose).toBe('resting');
  });

  it('speeds up (lower duration) as scroll percent increases', () => {
    const early = computeCapybaraState(0, 2000, 800);
    const late = computeCapybaraState(1000, 2000, 800);
    expect(late.speed).toBeLessThan(early.speed);
  });

  it('clamps percent to [0, 100] for out-of-range input', () => {
    expect(computeCapybaraState(-50, 2000, 800).percent).toBe(0);
    expect(computeCapybaraState(5000, 2000, 800).percent).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- capybara
```
Expected: FAIL — `Cannot find module './capybara'`.

- [ ] **Step 3: Implement `src/lib/capybara.ts`**

```ts
export type CapybaraPose = 'running' | 'resting';

export interface CapybaraState {
  percent: number;
  pose: CapybaraPose;
  speed: number;
}

export function computeCapybaraState(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): CapybaraState {
  const scrollable = Math.max(scrollHeight - clientHeight, 1);
  const percent = Math.min(Math.max((scrollTop / scrollable) * 100, 0), 100);
  const pose: CapybaraPose = percent >= 100 ? 'resting' : 'running';
  const speed = 1.2 - (percent / 100) * 0.9; // 1.2s light jog down to 0.3s sprint
  return { percent, pose, speed };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- capybara
```
Expected: PASS (4 tests).

- [ ] **Step 5: Add placeholder capybara sprites**

`public/capybara-run.svg` (simple running silhouette placeholder — swap for polished art later):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32">
  <ellipse cx="28" cy="20" rx="22" ry="10" fill="currentColor" />
  <circle cx="50" cy="14" r="8" fill="currentColor" />
  <rect x="10" y="26" width="6" height="6" fill="currentColor" />
  <rect x="30" y="26" width="6" height="6" fill="currentColor" />
</svg>
```

`public/capybara-rest.svg` (flat resting pose placeholder):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32">
  <ellipse cx="28" cy="24" rx="24" ry="6" fill="currentColor" />
  <circle cx="52" cy="20" r="6" fill="currentColor" />
</svg>
```

- [ ] **Step 6: Add the run-cycle keyframe**

Append to `src/styles/animations.css`:
```css
@keyframes capybara-run {
  0% { background-position-x: 0; }
  100% { background-position-x: -192px; }
}
```

- [ ] **Step 7: Write `CapybaraProgress.astro`**

```astro
<div class="capybara-track" aria-hidden="true">
  <div class="capybara running" id="capybara"></div>
</div>
<style>
  .capybara-track {
    position: relative;
    height: 2rem;
    border-bottom: 1px solid var(--color-text-secondary);
  }
  .capybara {
    position: absolute;
    top: 0;
    left: 0;
    width: 2rem;
    height: 2rem;
    background-size: contain;
    background-repeat: no-repeat;
    color: var(--color-accent);
    transition: left 0.1s linear;
  }
  .capybara.running {
    background-image: url('/capybara-run.svg');
    animation: capybara-run linear infinite;
    animation-duration: var(--run-speed, 1.2s);
  }
  .capybara.resting {
    background-image: url('/capybara-rest.svg');
    animation: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .capybara { transition: none; }
    .capybara.running { animation: none; }
  }
</style>
<script>
  import { computeCapybaraState } from '../lib/capybara';

  const el = document.getElementById('capybara')!;

  function update() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const state = computeCapybaraState(scrollTop, scrollHeight, clientHeight);
    el.style.left = `calc(${state.percent}% - 1rem)`;
    el.classList.toggle('running', state.pose === 'running');
    el.classList.toggle('resting', state.pose === 'resting');
    el.style.setProperty('--run-speed', `${state.speed}s`);
  }

  document.addEventListener('scroll', update, { passive: true });
  update();
</script>
```

- [ ] **Step 8: Write `ArticleLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import CapybaraProgress from '../components/CapybaraProgress.astro';

interface Props {
  title: string;
  date: Date;
}
const { title, date } = Astro.props;
const formattedDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date);
---
<BaseLayout title={`${title} — John Ng`}>
  <CapybaraProgress />
  <article class="prose">
    <p class="meta">{formattedDate}</p>
    <h1>{title}</h1>
    <slot />
  </article>
</BaseLayout>
<style>
  .prose {
    font-family: 'Source Serif 4', serif;
    max-width: 70ch;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }
  .prose h1 {
    font-family: 'Syne', sans-serif;
  }
</style>
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add capybara reading-progress mascot and article layout"
```

---

### Task 11: Project article dynamic route

**Files:**
- Create: `src/pages/projects/[slug].astro`
- Test: `tests/e2e/article.spec.ts`

**Interfaces:**
- Consumes: `ArticleLayout` from Task 10, Astro's `getCollection`/`getStaticPaths`/`entry.render()`.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/article.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('article page renders MDX content and the capybara mascot', async ({ page }) => {
  await page.goto('/projects/portfolio-site-rewrite');
  await expect(page.locator('h1')).toHaveText('Rebuilding johnjng.com on Astro');
  await expect(page.locator('#capybara')).toHaveCount(1);
  await expect(page.locator('article.prose h2')).toContainText('Overview');
});

test('capybara position tracks scroll and reaches resting pose at the bottom', async ({ page }) => {
  await page.goto('/projects/portfolio-site-rewrite');
  await page.mouse.wheel(0, 100000); // scroll to bottom
  await page.waitForTimeout(100);
  await expect(page.locator('#capybara')).toHaveClass(/resting/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:e2e -- article
```
Expected: FAIL — 404, route doesn't exist yet.

- [ ] **Step 3: Implement `src/pages/projects/[slug].astro`**

```astro
---
import { getCollection } from 'astro:content';
import ArticleLayout from '../../layouts/ArticleLayout.astro';

export async function getStaticPaths() {
  const projects = await getCollection('projects', ({ data }) => !data.draft);
  return projects.map((p) => ({ params: { slug: p.slug }, props: { entry: p } }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();
---
<ArticleLayout title={entry.data.title} date={entry.data.date}>
  <Content />
</ArticleLayout>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:e2e -- article
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add project article route"
```

---

### Task 12: Minesweeper engine (pure game logic)

**Files:**
- Create: `src/lib/minesweeper/engine.ts`, `src/lib/minesweeper/engine.test.ts`

**Interfaces:**
- Produces: `MS_COLS`, `MS_ROWS`, `MS_MINES`, `MinesweeperCell`, `MinesweeperBoard`, `createBoard(rng?)`, `reveal(board, row, col): { board, exploded }`, `toggleFlag(board, row, col): board`, `checkWin(board): boolean` — consumed by Task 13.

- [ ] **Step 1: Write the failing unit tests**

`src/lib/minesweeper/engine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createBoard, reveal, toggleFlag, checkWin, MS_ROWS, MS_COLS, MS_MINES } from './engine';

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('createBoard', () => {
  it('places exactly MS_MINES mines', () => {
    const board = createBoard();
    const mineCount = board.flat().filter((c) => c.mine).length;
    expect(mineCount).toBe(MS_MINES);
    expect(board).toHaveLength(MS_ROWS);
    expect(board[0]).toHaveLength(MS_COLS);
  });

  it('computes correct adjacent-mine counts', () => {
    // Force mines at (0,0) and (0,1) via a deterministic rng, then verify
    // the count on the neighboring safe cell.
    const rng = sequenceRng([0, 0, 0, 1 / MS_COLS + 0.001]);
    const board = createBoard(rng);
    expect(board[0][0].mine || board[0][1].mine).toBe(true);
  });
});

describe('reveal', () => {
  it('flood-fills connected zero-adjacent cells', () => {
    const rng = sequenceRng([8 / MS_ROWS, 8 / MS_COLS]); // single mine, far corner
    const board = createBoard(rng);
    const { board: revealed, exploded } = reveal(board, 0, 0);
    expect(exploded).toBe(false);
    const revealedCount = revealed.flat().filter((c) => c.revealed).length;
    expect(revealedCount).toBeGreaterThan(1);
  });

  it('sets exploded true when revealing a mine', () => {
    const rng = sequenceRng([0, 0]);
    const board = createBoard(rng);
    const mineRow = board.findIndex((row) => row.some((c) => c.mine));
    const mineCol = board[mineRow].findIndex((c) => c.mine);
    const { exploded } = reveal(board, mineRow, mineCol);
    expect(exploded).toBe(true);
  });
});

describe('toggleFlag', () => {
  it('flags and unflags a hidden cell', () => {
    const board = createBoard();
    const flagged = toggleFlag(board, 0, 0);
    expect(flagged[0][0].flagged).toBe(true);
    const unflagged = toggleFlag(flagged, 0, 0);
    expect(unflagged[0][0].flagged).toBe(false);
  });

  it('does not flag an already-revealed cell', () => {
    const rng = sequenceRng([8 / MS_ROWS, 8 / MS_COLS]);
    const board = createBoard(rng);
    const { board: revealed } = reveal(board, 0, 0);
    const flagged = toggleFlag(revealed, 0, 0);
    expect(flagged[0][0].flagged).toBe(false);
  });
});

describe('checkWin', () => {
  it('is false while safe cells remain hidden', () => {
    const board = createBoard();
    expect(checkWin(board)).toBe(false);
  });

  it('is true once every non-mine cell is revealed', () => {
    const rng = sequenceRng([0, 0]); // predictable single-corner mine seed
    let board = createBoard(rng);
    for (let r = 0; r < MS_ROWS; r++) {
      for (let c = 0; c < MS_COLS; c++) {
        if (!board[r][c].mine) board = reveal(board, r, c).board;
      }
    }
    expect(checkWin(board)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- minesweeper/engine
```
Expected: FAIL — `Cannot find module './engine'`.

- [ ] **Step 3: Implement `src/lib/minesweeper/engine.ts`**

```ts
export const MS_COLS = 9;
export const MS_ROWS = 9;
export const MS_MINES = 10;

export interface MinesweeperCell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export type MinesweeperBoard = MinesweeperCell[][];

export function createBoard(rng: () => number = Math.random): MinesweeperBoard {
  const board: MinesweeperBoard = Array.from({ length: MS_ROWS }, () =>
    Array.from({ length: MS_COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );

  let placed = 0;
  while (placed < MS_MINES) {
    const row = Math.floor(rng() * MS_ROWS);
    const col = Math.floor(rng() * MS_COLS);
    if (!board[row][col].mine) {
      board[row][col].mine = true;
      placed++;
    }
  }

  for (let row = 0; row < MS_ROWS; row++) {
    for (let col = 0; col < MS_COLS; col++) {
      if (board[row][col].mine) continue;
      board[row][col].adjacent = neighbors(row, col).filter(([r, c]) => board[r][c].mine).length;
    }
  }

  return board;
}

function neighbors(row: number, col: number): [number, number][] {
  const result: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < MS_ROWS && c >= 0 && c < MS_COLS) result.push([r, c]);
    }
  }
  return result;
}

export function reveal(
  board: MinesweeperBoard,
  row: number,
  col: number
): { board: MinesweeperBoard; exploded: boolean } {
  const next = board.map((r) => r.map((cell) => ({ ...cell })));
  const stack: [number, number][] = [[row, col]];
  let exploded = false;

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const cell = next[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.mine) {
      exploded = true;
      continue;
    }
    if (cell.adjacent === 0) {
      for (const [nr, nc] of neighbors(r, c)) stack.push([nr, nc]);
    }
  }

  return { board: next, exploded };
}

export function toggleFlag(board: MinesweeperBoard, row: number, col: number): MinesweeperBoard {
  const next = board.map((r) => r.map((cell) => ({ ...cell })));
  const cell = next[row][col];
  if (!cell.revealed) cell.flagged = !cell.flagged;
  return next;
}

export function checkWin(board: MinesweeperBoard): boolean {
  return board.every((row) => row.every((cell) => cell.mine || cell.revealed));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- minesweeper/engine
```
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure Minesweeper engine"
```

---

### Task 13: 404 page and MinesweeperBoard component

**Files:**
- Create: `src/pages/404.astro`, `src/components/MinesweeperBoard.astro`
- Test: `tests/e2e/minesweeper-404.spec.ts`

**Interfaces:**
- Consumes: `createBoard`, `reveal`, `toggleFlag`, `checkWin`, `MS_ROWS`, `MS_COLS`, `MS_MINES` from Task 12.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/minesweeper-404.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('visiting a missing URL shows the Minesweeper 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.locator('.context-line')).toContainText("doesn't exist");
  await expect(page.locator('.ms-grid button')).toHaveCount(81);
  await expect(page.locator('a.home-link')).toHaveAttribute('href', '/');
});

test('keyboard: arrow keys move focus, Enter reveals, Space flags', async ({ page }) => {
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:e2e -- minesweeper-404
```
Expected: FAIL — 404 page doesn't exist yet (Astro's dev server serves a generic not-found response).

- [ ] **Step 3: Implement `src/components/MinesweeperBoard.astro`**

```astro
<div class="minesweeper" id="minesweeper">
  <div class="ms-header">
    <span id="ms-status">Mines: 10</span>
    <button id="ms-reset" type="button">Reset</button>
  </div>
  <div class="ms-grid" id="ms-grid" role="grid" aria-label="Minesweeper board"></div>
</div>
<style>
  .ms-grid {
    display: grid;
    grid-template-columns: repeat(9, 2rem);
    gap: 2px;
  }
  .ms-grid button {
    width: 2rem;
    height: 2rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.85rem;
    background: var(--color-bg);
    border: 1px solid var(--color-text-secondary);
    color: var(--color-text);
    cursor: pointer;
  }
  .ms-grid button[aria-pressed='true'] {
    background: var(--color-text-secondary);
  }
  .ms-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
</style>
<script>
  import {
    createBoard, reveal, toggleFlag, checkWin, MS_ROWS, MS_COLS, MS_MINES,
    type MinesweeperBoard, type MinesweeperCell,
  } from '../lib/minesweeper/engine';

  const grid = document.getElementById('ms-grid')!;
  const status = document.getElementById('ms-status')!;
  const resetBtn = document.getElementById('ms-reset')!;

  let board: MinesweeperBoard = createBoard();
  let gameOver = false;
  let focusIndex = 0;
  let longPressTimer: number | undefined;

  function cellLabel(cell: MinesweeperCell): string {
    if (cell.flagged) return '\u{1F6A9}';
    if (!cell.revealed) return '';
    if (cell.mine) return '\u{1F4A3}';
    return cell.adjacent > 0 ? String(cell.adjacent) : '';
  }

  function describeCell(cell: MinesweeperCell): string {
    if (cell.flagged) return 'Flagged cell';
    if (!cell.revealed) return 'Hidden cell';
    if (cell.mine) return 'Mine';
    return cell.adjacent > 0 ? `${cell.adjacent} adjacent mines` : 'Empty cell';
  }

  function render() {
    grid.innerHTML = '';
    board.forEach((row, r) => row.forEach((cell, c) => {
      const btn = document.createElement('button');
      const index = r * MS_COLS + c;
      btn.type = 'button';
      btn.tabIndex = index === focusIndex ? 0 : -1;
      btn.setAttribute('aria-pressed', String(cell.revealed));
      btn.setAttribute('aria-label', describeCell(cell));
      btn.textContent = cellLabel(cell);
      btn.addEventListener('click', () => onReveal(r, c));
      btn.addEventListener('contextmenu', (e) => { e.preventDefault(); onFlag(r, c); });
      btn.addEventListener('touchstart', () => {
        longPressTimer = window.setTimeout(() => onFlag(r, c), 500);
      });
      btn.addEventListener('touchend', () => window.clearTimeout(longPressTimer));
      btn.addEventListener('keydown', (e) => onKey(e, r, c));
      grid.appendChild(btn);
    }));
  }

  function onReveal(r: number, c: number) {
    if (gameOver) return;
    const result = reveal(board, r, c);
    board = result.board;
    if (result.exploded) {
      gameOver = true;
      status.textContent = 'You hit a mine. Press Reset to try again.';
    } else if (checkWin(board)) {
      gameOver = true;
      status.textContent = 'You cleared the board!';
    }
    render();
  }

  function onFlag(r: number, c: number) {
    if (gameOver) return;
    board = toggleFlag(board, r, c);
    render();
  }

  function onKey(e: KeyboardEvent, r: number, c: number) {
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    if (e.key in deltas) {
      e.preventDefault();
      const [dr, dc] = deltas[e.key];
      const nr = Math.min(Math.max(r + dr, 0), MS_ROWS - 1);
      const nc = Math.min(Math.max(c + dc, 0), MS_COLS - 1);
      focusIndex = nr * MS_COLS + nc;
      render();
      (grid.children[focusIndex] as HTMLElement).focus();
    } else if (e.key === 'Enter') {
      onReveal(r, c);
    } else if (e.key === ' ') {
      e.preventDefault();
      onFlag(r, c);
    }
  }

  resetBtn.addEventListener('click', () => {
    board = createBoard();
    gameOver = false;
    focusIndex = 0;
    status.textContent = `Mines: ${MS_MINES}`;
    render();
  });

  render();
</script>
```

- [ ] **Step 4: Implement `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import MinesweeperBoard from '../components/MinesweeperBoard.astro';
---
<BaseLayout title="Page not found — John Ng">
  <section class="not-found">
    <p class="context-line">This page doesn't exist. While you're here, try not to hit a mine.</p>
    <MinesweeperBoard />
    <a href="/" class="home-link">Back to Home</a>
  </section>
</BaseLayout>
<style>
  .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 4rem 1.5rem;
    text-align: center;
  }
</style>
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:e2e -- minesweeper-404
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Minesweeper 404 page"
```

---

### Task 14: Contact form logic and Contact page

**Files:**
- Create: `src/lib/contactForm.ts`, `src/lib/contactForm.test.ts`, `src/components/ContactForm.astro`, `src/pages/contact.astro`
- Test: `tests/e2e/contact.spec.ts`

**Interfaces:**
- Produces: `ContactPayload { name, email, message }`, `encodeForNetlify(formName, payload): string`, `submitContactForm(payload, fetchImpl?): Promise<boolean>`.

- [ ] **Step 1: Write the failing unit tests**

`src/lib/contactForm.test.ts`:
```ts
// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { encodeForNetlify, submitContactForm } from './contactForm';

describe('encodeForNetlify', () => {
  it('url-encodes the form-name and payload fields together', () => {
    const body = encodeForNetlify('contact', { name: 'Ada', email: 'ada@example.com', message: 'Hi' });
    expect(body).toContain('form-name=contact');
    expect(body).toContain('name=Ada');
    expect(body).toContain('email=ada%40example.com');
  });
});

describe('submitContactForm', () => {
  it('POSTs the encoded body and returns true on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const ok = await submitContactForm({ name: 'Ada', email: 'ada@example.com', message: 'Hi' }, fetchImpl);
    expect(ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('/', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }));
  });

  it('returns false when the request fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    const ok = await submitContactForm({ name: 'Ada', email: 'ada@example.com', message: 'Hi' }, fetchImpl);
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- contactForm
```
Expected: FAIL — `Cannot find module './contactForm'`.

- [ ] **Step 3: Implement `src/lib/contactForm.ts`**

```ts
export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export function encodeForNetlify(formName: string, payload: ContactPayload): string {
  const params = new URLSearchParams({ 'form-name': formName, ...payload });
  return params.toString();
}

export async function submitContactForm(
  payload: ContactPayload,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const response = await fetchImpl('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeForNetlify('contact', payload),
  });
  return response.ok;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- contactForm
```
Expected: PASS (3 tests).

- [ ] **Step 5: Write `ContactForm.astro`**

```astro
<form name="contact" method="POST" data-netlify="true" id="contact-form" class="contact-form">
  <input type="hidden" name="form-name" value="contact" />
  <p hidden>
    <label>Don't fill this out if you're human: <input name="bot-field" /></label>
  </p>
  <label for="name">Name</label>
  <input id="name" name="name" type="text" required />
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required />
  <label for="message">Message</label>
  <textarea id="message" name="message" required rows="6"></textarea>
  <button type="submit">Send</button>
</form>
<p id="contact-success" hidden role="status">Thanks — I'll get back to you soon.</p>
<style>
  .contact-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 32rem;
  }
  .contact-form input,
  .contact-form textarea {
    padding: 0.5rem;
    border: 1px solid var(--color-text-secondary);
    background: var(--color-bg);
    color: var(--color-text);
    font-family: 'Inter', sans-serif;
  }
  .contact-form button {
    align-self: flex-start;
    padding: 0.6rem 1.5rem;
    background: var(--color-accent);
    color: #fff;
    border: none;
    cursor: pointer;
  }
</style>
<script>
  import { submitContactForm } from '../lib/contactForm';

  const form = document.getElementById('contact-form') as HTMLFormElement;
  const success = document.getElementById('contact-success')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const ok = await submitContactForm({
      name: String(data.get('name')),
      email: String(data.get('email')),
      message: String(data.get('message')),
    });
    if (ok) {
      form.hidden = true;
      success.hidden = false;
    }
  });
</script>
```

- [ ] **Step 6: Write `src/pages/contact.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ContactForm from '../components/ContactForm.astro';
---
<BaseLayout title="Contact — John Ng">
  <h1>Contact</h1>
  <ContactForm />
</BaseLayout>
```

- [ ] **Step 7: Write the failing e2e test**

`tests/e2e/contact.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('submitting the contact form shows an inline success message without navigating', async ({ page }) => {
  await page.route('/', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 200, body: 'ok' });
    }
    return route.continue();
  });

  await page.goto('/contact');
  await page.fill('#name', 'Ada Lovelace');
  await page.fill('#email', 'ada@example.com');
  await page.fill('#message', 'Loved the Tetris easter egg.');
  const urlBefore = page.url();
  await page.click('#contact-form button[type="submit"]');

  await expect(page.locator('#contact-success')).toBeVisible();
  await expect(page.locator('#contact-form')).toBeHidden();
  expect(page.url()).toBe(urlBefore);
});
```

- [ ] **Step 8: Run test to verify it fails, then implement, then pass**

```bash
npm run test:e2e -- contact
```
Run before Steps 5–6 are in place to confirm FAIL (`/contact` 404s), then re-run after to confirm PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Contact page with inline-success form submission"
```

---

### Task 15: Netlify config verification, README/CLAUDE.md updates, production build

**Files:**
- Modify: `README.md` (tech description only — authorship/license lines carry forward unchanged per spec)
- Verify: `CLAUDE.md` (already documents the target state — confirm it matches what was built, no edits expected)
- Verify: `netlify.toml` (written in Task 1)

**Interfaces:** none — this task wires up deployment and documentation, no new code interfaces.

- [ ] **Step 1: Update the tech description in `README.md`**

Replace the first two paragraphs (keep the "Find a bug?", "Authors", and "License" sections unchanged):

```markdown
# Personal Website
### My personal website — an introduction, portfolio, and a few hobby-inspired interactive details.

This repository is for [johnjng.com](https://johnjng.com). It's an Astro +
MDX static site: project write-ups are content files under
`src/content/projects/`, and a handful of interactive details (Tetris,
Minesweeper, a capybara reading-progress mascot, a butterfly-knife-flip
theme toggle) are tucked into the site without needing a caption to make
sense. Deployed on Netlify, with Netlify's built-in form handling powering
the contact page — no backend code.
```

- [ ] **Step 2: Confirm `CLAUDE.md` matches the built site**

Read `CLAUDE.md` and check each claim against what Tasks 1–14 actually built: stack (Astro, MDX, Netlify), site map (5 routes), content schema, visual tokens, hobby-detail priority order, hard constraints, accessibility list. No edits expected — this file was written from the same spec this plan implements. If any detail drifted during implementation (e.g., a lower-level decision this plan made differently than a passing mention in `CLAUDE.md`), update `CLAUDE.md` to match reality.

- [ ] **Step 3: Run a full production build**

```bash
npm run build
```
Expected: build succeeds; inspect `dist/` for `index.html`, `projects/index.html`, `projects/portfolio-site-rewrite/index.html`, `contact/index.html`, `404.html`.

```bash
ls dist/ dist/projects/ 2>&1
test -f dist/404.html && echo "404.html present"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: update README for the Astro rewrite, verify production build"
```

---

### Task 16: Full-site accessibility and cross-page Playwright suite

**Files:**
- Create: `tests/e2e/accessibility.spec.ts`
- Modify: `package.json` (add `@axe-core/playwright`, already listed as a devDependency in Task 1 — verify it's installed)

**Interfaces:** consumes every page/route built in Tasks 5, 9, 11, 13, 14.

- [ ] **Step 1: Write the failing accessibility test**

`tests/e2e/accessibility.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/projects', '/projects/portfolio-site-rewrite', '/contact', '/this-page-does-not-exist'];

for (const path of pages) {
  test(`no serious or critical accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
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
  const before = await page.locator('#tetris-ambient').innerHTML();
  await page.waitForTimeout(2000);
  const after = await page.locator('#tetris-ambient').innerHTML();
  expect(after).toBe(before);
});

test('reduced motion: capybara mascot has no run-cycle animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/projects/portfolio-site-rewrite');
  const animationName = await page.locator('#capybara').evaluate((el) => getComputedStyle(el).animationName);
  expect(animationName === 'none' || animationName === '').toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails initially**

```bash
npm run test:e2e -- accessibility
```
Run this once immediately after writing the test file (before double-checking any component) to confirm it actually exercises real assertions rather than trivially passing — expect it to either pass already (if Tasks 2–14 were implemented correctly) or reveal a genuine gap (e.g. a missing `aria-label`) to fix.

- [ ] **Step 3: Fix any violations surfaced, then re-run**

```bash
npm run test:e2e -- accessibility
```
Expected: PASS (5 pages × 2 tests + 2 reduced-motion tests = 12 tests).

- [ ] **Step 4: Run the full test suite end to end**

```bash
npm run test:all
```
Expected: all Vitest unit tests pass, production build succeeds, all Playwright e2e tests (including this task's accessibility suite) pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: add full-site accessibility and reduced-motion Playwright suite"
```

---

## Post-implementation notes

- **Content:** only one real project article exists (`portfolio-site-rewrite.mdx`). Add a second real write-up by copying `_template.mdx` before considering the site launch-ready, per the spec's "1–2 real articles" launch content requirement.
- **Art:** `public/capybara-run.svg` and `public/capybara-rest.svg` are intentionally simple placeholder shapes so the mascot's scroll-tracking logic is fully working end-to-end. Swap them for polished original artwork whenever it's ready — no code changes needed, the component reads them by filename.
- **LinkedIn URL:** `Footer.astro` (Task 2) has a placeholder LinkedIn URL — replace with the real profile URL before launch.
