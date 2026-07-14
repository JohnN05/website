# Projects & Contact visual parity — design

## Problem

Home (`index.astro`) carries the site's full visual identity: wash/seam
section backgrounds, an eyebrow+heading rhythm, the Tetris ambient hero,
the JOHN NG nameplate. `/projects` and `/contact` got none of it — each is
just a bare `<h1>` plus a minimally-styled block (a card grid with no
intro band; a raw form with default-browser-chrome inputs). They read as
an unfinished fallback next to Home, not the same site.

This pass brings both up to parity by **reusing existing tokens only** —
`--wash-*`, `--space-*`, `accentForTag`, the `.seam` blur-band pattern,
the project-card hover formula, the nameplate's focus-ring treatment — no
new hues, no new spacing scale, no new color-hashing logic. The goal is
for these two pages to read as the site finishing its sentence, not a
redesign.

## Out of scope

- Tag filtering on `/projects` (`accentForTag` already supports it, but 4
  projects total doesn't justify a filter UI yet — its own later pass once
  the project count grows).
- Real cover-image uploads. No `.mdx` file sets `cover` today and no
  images exist in `public/` for it — this pass designs a **generated**
  cover so the visual upgrade doesn't block on content the user hasn't
  produced yet. Real photos can still slot into the same `cover` field
  later without touching this design.
- Any change to `ContactForm.astro`'s submit logic, ARIA roles
  (`#contact-error[role=alert]`, `#contact-success[role=status]`), or
  hidden-state handling — those are correct today and covered by the
  site's hard constraints (inline success/error, no fallthrough to
  Netlify's default redirect). This pass is a pure restyle of that
  component.
- Duplicating LinkedIn/GitHub links onto the Contact page itself —
  `Footer.astro` already renders them sitewide, satisfying the "no email/
  phone as text, LinkedIn/GitHub stay visible" constraint. Not reproduced
  here to avoid a second maintained copy.

## Projects page (`src/pages/projects/index.astro`)

**Intro band**, above the grid:
- Eyebrow (mono, uppercase, `--color-text-secondary`): "Selected work"
- `h1` at the same scale Home's section headings use (`clamp(1.7rem,
  2.4vw, 2rem)`-class treatment, not the current plain default `h1`)
- One-line lede (draft copy, flagged for the user's edit): *"A running
  log of what I've built — extensions, platforms, research tools — with
  full write-ups landing as I finish them."*
- Background: `var(--wash-featured)` — the same clay tint Home's own
  Featured-projects section already uses. Not a new color choice; this
  literally carries that section's identity onto its own dedicated page.
- One `.seam` (identical mechanism to `index.astro`'s existing seams:
  `position: relative; z-index: 1`, negative top/bottom margins, blurred
  linear-gradient) fades the band to flat `--color-bg` before the grid.

**Grid**: unchanged structural approach (`repeat(auto-fit, minmax(260px,
1fr))`), gap bumped to `--space-6` to match Home's rhythm more closely
than the current `1.5rem` literal.

## ProjectCard cover (`src/components/ProjectCard.astro`)

A new block prepended above the existing meta/title/summary/tags stack:
- Fixed height (~140px), `border-radius` matching the card's own
  top corners (6px, from the existing `.project-card` radius).
- Background: `color-mix(in srgb, var(--color-bg) 88%, var(--accent-color)
  12%)` where `--accent-color` resolves from **`accentForTag(project.tags[0]
  ?? project.title)`** — reusing the existing hash function verbatim, no
  new color logic. Falls back to the title string only for the
  zero-tags case (schema default `[]`), so every card still gets a
  deterministic, stable tint even without tags.
- Motif: the project title's first character, oversized (~4rem), IBM
  Plex Mono, at low opacity, in that same accent color — the same "single
  colored letter as identity" move the Home nameplate already uses for J
  and O, generalized to any title rather than copied from Tetris
  specifically.
- The card's existing hover/border-reveal behavior (deliberately
  "chrome-reduced," decided in the visual-refinement pass — see root
  `CLAUDE.md`) is untouched. The cover is added *content*, not added
  chrome — at-rest chrome stays exactly as minimal as it is today.
- If/when a real `cover` image is later set on a project, that image
  should simply replace this generated block for that card — not designed
  in this pass (no project has one yet), but the generated block's fixed
  height/radius are chosen so a future `<img>` swap-in wouldn't need
  layout changes.

## Contact page (`src/pages/contact.astro`) — split two-column, Bio-style

- **Left column**: eyebrow ("Get in touch") + `h1` (same scale as
  Projects' intro `h1` above) + one lede line. Draft copy, flagged for
  the user's edit: *"Have a project, a role, or just a question? Send a
  message below — I read every one."*
- **Right column**: the form, presented as a distinct card — background
  `color-mix(in srgb, var(--color-text) 4%, var(--color-bg))` (the exact
  formula `ProjectCard`'s hover state already uses, reused rather than
  invented), 6px radius, `--space-5`/`--space-6` internal padding.
- Section background: `var(--wash-hero)` (cobalt = `--color-accent`, the
  site's primary-action color — a deliberate pick for a page whose only
  job is a call to action), with one `.seam` fading it to flat
  `--color-bg` before `Footer.astro` — the same fade-before-footer
  mechanic as Home's teaching→footer seam.
- Below 860px: collapses to a single column (form under copy), same
  breakpoint Home's `.bio-inner` already uses for its own two-column
  collapse — reused, not a new breakpoint.

## ContactForm restyle (`src/components/ContactForm.astro`)

Pure visual pass — markup structure, ARIA, and the `<script>` block's
submit logic are unchanged.
- Inputs/textarea: `border-radius: 6px`, `border-color: var(--line)`
  (replacing the current raw `var(--color-text-secondary)`, matching the
  hairline convention used everywhere else), `padding` on the `--space-*`
  scale instead of the current `0.5rem` literal.
- Real `:focus-visible` ring: `2px solid var(--color-accent)`, `outline-
  offset: 2px` — the same treatment the nameplate button already defines,
  reused rather than invented.
- Labels switch from unstyled defaults to `Inter` at a small, deliberate
  size — Inter is already this site's assigned face for UI/interface
  copy, so this is applying an existing role assignment that the form
  simply never picked up.
- Button: keeps its current accent-filled look at rest, gains a
  `color-mix`-darkened hover state and the same focus-visible ring as the
  inputs above. `border-radius: 6px` to match the card it lives in.
- `#contact-success` / `#contact-error`: restyled to sit inside the same
  card rhythm (spacing, radius) — no change to their `hidden`/role
  attributes or the JS that toggles them.

## Copy note

Both ledes above are draft placeholders written for this spec, marked
explicitly for the user to edit or approve before/at implementation —
consistent with how other stub copy in this codebase (e.g. the "full
write-up in progress" project bodies) is handled: real content isn't
blocked on this design landing.
