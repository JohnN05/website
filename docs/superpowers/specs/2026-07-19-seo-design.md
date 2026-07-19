# SEO optimization — design

Date: 2026-07-19

## Current gaps

- No canonical URLs, Open Graph, Twitter cards, `theme-color`, or structured
  data anywhere. Only `<title>` and a single default `<meta name="description">`
  that no page overrides.
- Project frontmatter already carries `summary`/`cover` but it never reaches
  `<head>`.
- No sitemap; `robots.txt` declares none. `site: 'https://johnjng.com'` is
  already set in `astro.config.mjs`.
- No OG image asset.

## Decisions

- **Sitemap via `@astrojs/sitemap`** (the one new dependency) over a
  hand-written `sitemap.xml`: the integration regenerates at build and picks up
  new project slugs automatically. A static file would go stale.
- **Centralize social/SEO meta in `BaseLayout.astro`**: every page flows
  through it, so canonical/OG/Twitter land everywhere with per-page overrides
  via props rather than duplicated tag blocks.

## Changes

1. `npm install @astrojs/sitemap`; register `sitemap()` in `astro.config.mjs`.
2. `BaseLayout.astro`:
   - New optional props: `image` (OG image path, default `/og-image.png`),
     `type` (`website` | `article`, default `website`), `robots` (e.g.
     `noindex` for 404).
   - `<link rel="canonical">` from `Astro.site` + pathname.
   - OG: `og:type/title/description/url/image/site_name`; image absolute via
     `Astro.site`.
   - Twitter: `summary_large_image`, title/description/image.
   - `theme-color` (light `#FAF7F0` / dark `#0F1E3D` via media), `author`.
   - Named `<slot name="head" />` for per-page structured data.
3. Home (`index.astro`): real description + JSON-LD `Person`/`WebSite` graph
   via the head slot (name, url, jobTitle, `/headshot.jpg`).
4. `ArticleLayout.astro`: forwards `description={summary}`, `image={cover}`,
   `type="article"` to BaseLayout.
5. `contact.astro`, `projects/index.astro`: page-specific descriptions.
   `404.astro`: `robots="noindex"`.
6. Generate `public/og-image.png` (1200×630, cream ground, cobalt J-tetromino,
   name + tagline) with sharp.
7. `robots.txt`: add `Sitemap: https://johnjng.com/sitemap-index.xml`.

## Verification

- `npm run build`; inspect `dist/index.html`, a project page, and `404.html`
  for canonical/OG/Twitter/robots tags; confirm
  `dist/sitemap-index.xml` + `dist/sitemap-0.xml` exist and `dist/og-image.png`
  is emitted.
