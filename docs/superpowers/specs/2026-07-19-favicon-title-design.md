# Favicon + page title refresh — design

Date: 2026-07-19

## Problem

- The current favicon is a green "J·n" smiley — green is not in the brand
  palette (`tokens.css`: cobalt `#3454D1`, cream `#FAF7F0`, navy `#0F1E3D`).
- `src/layouts/BaseLayout.astro` declares **no** `<link rel="icon">`, so icon
  loading relies on the browser's default `/favicon.ico` probe; apple-touch and
  manifest icons exist in `public/` but are never linked.
- `public/manifest.json` is a generator leftover named `"App"`.
- Home page title is bare `John Ng`; subpages already use `X — John Ng`.

## Decision

**Icon: J-tetromino.** Alternatives considered: an Unbounded-font "J" monogram
(clean but generic) and a recolored smiley (weak continuity play). The Tetris J
piece is canonically blue — it lands on the cobalt brand accent exactly and ties
the tab icon to the site's Tetris hero. Four squares, same gap rhythm as the
hero board, legible at 16px.

## Design

1. `public/favicon.svg` (new): cobalt J-tetromino on a cream rounded tile.
   `prefers-color-scheme: dark` media query swaps the tile to navy.
2. Regenerate the existing raster set from the SVG in place (same filenames, so
   `browserconfig.xml` keeps working): `favicon-{16,32,96}.png`, `favicon.ico`
   (PNG-in-ICO), `apple-icon*.png`, `android-icon*.png`, `ms-icon*.png`.
3. `BaseLayout.astro`: add `<link rel="icon">` (svg, then 32/16 png fallbacks),
   `<link rel="apple-touch-icon">`, `<link rel="manifest">`.
4. `manifest.json`: `"name": "John Ng"`, theme/background colors from tokens.
5. `src/pages/index.astro`: title `John Ng` → `John Ng — Software Engineer`.
   Subpage `X — John Ng` pattern unchanged.

## Verification

- `npm run build` succeeds; `dist/index.html` contains the new title and icon
  link tags.
- Visually inspect regenerated `favicon-96x96.png` and `favicon.svg`.
