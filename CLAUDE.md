# johnjng.com — Personal Website

## Purpose

John Ng's personal site. Intro + portfolio, revamped (2026) from a single-page
CRA SPA into a professional/minimal, multi-page site with dedicated space for
project write-ups and a couple of subtle hobby-inspired interactive details
(tetris, minesweeper, butterfly-knife-flip toggle, capybara mascot).

Full design rationale: `docs/superpowers/specs/2026-07-11-website-revamp-design.md`.
Read that file for the "why" behind anything below.

## Stack

- **Astro** — static-first site generator. Zero JS by default; only hydrate
  islands that need interactivity (Tetris widget, light/dark toggle, capybara
  mascot, Minesweeper board).
- **MDX content collections** — each project article is one `.mdx` file under
  `src/content/projects/`. Astro derives the route slug from the filename.
  Adding a new project = add one file, no code changes.
- Deployed on Netlify (same domain as before). Contact form uses Netlify's
  built-in static form handling — no backend/serverless functions anywhere in
  this stack.
- Previous stack was Create React App (deprecated upstream) — fully replaced,
  not incrementally patched. Old repo history kept for content reference only.

## Site map

`/` (home, hero + featured-projects preview) · `/projects` (index) ·
`/projects/[slug]` (article) · `/contact` (Netlify Forms) · `/404`
(Minesweeper board).

## Content collection schema

```ts
// src/content/config.ts
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
```

Home's featured-projects preview shows `featured: true` entries; if none are
flagged, falls back to latest N by date. `draft: true` hides an entry from
`/projects` and Home without deleting it — that's how `_template.mdx` stays
in the repo as a non-live "copy this file" starting point.

## Visual design tokens

| Role | Light | Dark |
|---|---|---|
| Background | `#FAF7F0` (ivory) | `#0F1E3D` (navy) |
| Text primary | `#0F1E3D` (navy) | `#FAF7F0` (ivory) |
| Accent | `#3454D1` (cobalt — Tetris J-piece blue) | same |
| Text secondary | `#4A5468` (slate) | `#9AA7B8` |

Typography: **Syne** (headlines) · **Source Serif 4** (article prose body
text only) · **Inter** (UI/interface copy — nav, buttons, forms) · **IBM Plex
Mono** (small labels: nav wordmark, eyebrows, article meta line).

## Hobby details — priority order

**Primary (most polish):** Tetris (ambient hero-corner animation, hidden
click-to-play overlay, hidden below mobile breakpoint) and the capybara
mascot (article reading-progress indicator, speed scales with scroll,
collapses to resting pose at 100%).

**Lower priority (simpler first pass is fine):** Minesweeper (the `/404`
page, needs its context line — see spec) and the butterfly-knife-flip
light/dark toggle.

All four use standard smooth CSS easing — a "stepped/frame-based" motion
language was tried and explicitly rejected as janky.

## Hard constraints (don't reintroduce these)

- No resume download link anywhere.
- No email/phone displayed as text anywhere — contact goes through `/contact`
  only. LinkedIn/GitHub links stay visible (public profile links, not private
  contact info).
- No dedicated About page — bio lives on Home.
- No Pokémon or other copyrighted character likeness for the mascot —
  raised and ruled out during design (IP risk). Capybara is original.
- Contact form must show an inline success message via JS `fetch` submit —
  do not let it fall through to Netlify's default unstyled success-page
  redirect.

## Accessibility (see spec for full list)

`prefers-reduced-motion` fallbacks for all four hobby details, full keyboard
operability for both games, visible focus states sitewide, skip-to-content
link, and `aria-hidden` on the two purely-decorative details (Tetris ambient
animation, capybara mascot — the capybara is a supplement to reading
progress, never the only way it's conveyed).

## Repo history

Old CRA site's commit history is preserved — useful for content reference
(bio copy, past repo list) even after the rewrite.
