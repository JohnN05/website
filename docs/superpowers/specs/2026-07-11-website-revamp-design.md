# johnjng.com Revamp — Design Spec

## Overview

Revamp John Ng's personal website from a single-page Create React App SPA into a
professional, minimal, multi-page site with dedicated space for writing about
projects (easy to extend with new articles) and a handful of subtle,
personality-driven interactive details tied to hobbies. Deployed on Netlify at
the existing custom domain, replacing the current CRA deployment (not an
incremental patch).

## Goals

- Read as professional and sleek first; personality touches are secondary and
  must never get in the way of that.
- Adding a new project write-up later should require creating one content file
  — no code changes, no new components.
- A small set of hobby-inspired interactive details (tetris, minesweeper,
  butterfly knife flipping, general fitness) that are discoverable rather than
  in-your-face, and that don't require a caption to make sense.
- Keep the stack as light as the goals allow — no framework/feature added
  "just in case."

## Non-goals

- No dedicated About page — bio/intro lives on the Home page, same scope as
  the current single bio blurb.
- No resume download link anywhere on the site (current site's header CTA is
  removed, not replaced).
- No direct display of email or phone number anywhere on the site.
- No breakdancing or EDM references — considered during design and dropped
  (breakdancing added no value beyond what tetris/capybara already cover;
  an EDM icon read as generic decoration with no clear connection to music at
  all, unlike the other touches which double as functional UI).
- No CMS / dynamic backend. Content is static MDX files, form handling is
  Netlify's built-in static form support — no serverless functions.

## Stack

- **Astro** — static-site generator, ships zero JS by default, hydrates only
  the specific interactive components that need it ("islands"): the Tetris
  widget, the light/dark toggle, the capybara progress mascot, the Minesweeper
  board.
- **MDX content collections** for project articles (see Content Model below).
- Full replacement of the current Create React App codebase. The CRA repo's
  git history is kept for reference (bio copy, resume text, prior repo
  descriptions) but no CRA code is reused directly.
- Deployment: Netlify, same custom domain as today. Netlify Forms handles the
  contact form (see Contact Page below) — no backend code required.

## Site Map

| Route | Purpose |
|---|---|
| `/` | Home: nav, hero (short bio/intro, no separate About page), featured-projects preview, footer. Tetris ambient animation lives in the hero corner. |
| `/projects` | Projects index — every published article as a card (title, summary, date, tags), newest first. |
| `/projects/[slug]` | One project article, full MDX content. Capybara reading-progress mascot appears here. |
| `/contact` | Contact form (Netlify Forms) — no email/phone displayed anywhere. |
| `/404` | Custom not-found page — a fully playable Minesweeper board, plus a link back to Home. |

Hero copy (final, confirmed during design review): **"Coding practical
solutions for people. That's always been the point."** — replaces the
current site's generic "student at UMD studying CS" framing. Deliberately
plainspoken rather than a mission-statement/SaaS-style tagline.

Nav bar (all pages): wordmark "JOHN NG" (typographic, IBM Plex Mono, replacing
the old raster logo image) on the left, links to Projects / Contact on the
right, plus the light/dark toggle.

Footer (all pages): copyright line, LinkedIn + GitHub icon links (kept
visible — these are public profile links, not private contact info, so they
don't need to route through the contact form).

## Content Model

Project articles live at `src/content/projects/<slug>.mdx`. Astro derives the
route slug from the filename. Frontmatter schema (validated via Astro's
content collections `defineCollection` + Zod):

```ts
// src/content/config.ts
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

- `draft: true` entries are excluded from `/projects` and from Home's
  featured-projects preview, but remain buildable/previewable locally — this
  is how the template article stays in the repo without appearing live.
- Adding a new project = add one `.mdx` file with this frontmatter + body
  content. No component or route code changes needed.
- Launch content: 1–2 real articles authored by John for his best projects,
  plus one `_template.mdx` (`draft: true`) demonstrating the frontmatter shape
  and basic MDX usage (headings, images, code blocks), as the "copy this file"
  starting point for future articles.
- **Home's featured-projects preview selection rule** (added during design
  review): show non-draft entries with `featured: true`, sorted by date. If
  no entries are flagged `featured`, fall back to the latest N non-draft
  entries by date, so Home never renders an empty preview just because
  nothing's been explicitly flagged yet.

## Visual Design

**Palette** (light mode):

| Role | Hex |
|---|---|
| Background | `#FAF7F0` (ivory) |
| Text / UI primary | `#0F1E3D` (deep navy) |
| Accent | `#3454D1` (cobalt blue) |
| Text secondary | `#4A5468` (slate) |

**Palette** (dark mode) — roles invert, accent stays constant so the brand
reads the same in both modes:

| Role | Hex |
|---|---|
| Background | `#0F1E3D` (deep navy) |
| Text / UI primary | `#FAF7F0` (ivory) |
| Accent | `#3454D1` (cobalt blue, unchanged) |
| Text secondary | `#9AA7B8` (lighter slate, tuned for contrast on navy) |

Accent was originally a muted gold; changed to cobalt (the classic Tetris
J-piece blue, deepened for text contrast) during design review — gold read as
a generic "premium/finance" signal rather than anything drawn from the site's
own material, and cobalt directly traces to the Tetris hero animation while
staying close enough in family to the navy base to read as cohesive rather
than a random accent color.

**Typography:**

| Role | Font | Notes |
|---|---|---|
| Headlines | Syne (700/800) | Bold, idiosyncratic geometric shapes — the "unique" signal |
| Article prose | Source Serif 4 (400/500) | Long-form project write-up body text only. Sturdier/more technical-feeling than a typical editorial serif, fits the engineering subject matter, and visually separates "reading an article" from "using the site" |
| UI / interface copy | Inter (400/500) | Nav, buttons, form fields, card summaries — anywhere neutral legibility matters more than personality |
| Small labels / mono accents | IBM Plex Mono (400/500) | Nav wordmark, section eyebrows, article meta line |

All four loaded via Google Fonts.

## Interactive Details (Hobbies)

Each lives in a different corner of the site so nothing clusters, and each
either does real UX work or is genuinely easy to miss — no detail depends on a
caption/label to make sense.

**Priority:** Tetris and the capybara mascot are the primary signature
details and should get the bulk of implementation polish. Minesweeper and the
knife-flip toggle are lower priority — simpler first-pass versions are fine,
and they can slip in the implementation order if time is tight.

All four use standard smooth/eased CSS transitions, consistent with the rest
of the site's UI (button hovers, page transitions, etc). A "everything
animates in discrete stepped frames" unifying motion language was considered
during design review and explicitly rejected — it read as janky rather than
distinctive when demoed.

### 1. Tetris — hero corner ambient animation (primary signature)

- Default state: a small looping animation of tetromino blocks gradually
  filling a mini grid and then clearing, positioned as a quiet graphic accent
  beside the Home hero headline (not full-width, not attention-grabbing).
- Hidden interaction: clicking the animation pauses the ambient loop and
  expands it into an overlay/modal containing a real, fully playable Tetris
  board (arrow keys to move/rotate/soft-drop, space for hard drop). Closing
  the overlay (X button or Escape) returns to the ambient hero-corner loop.
- Rationale for the overlay-on-click approach: the hero-corner space is too
  small for an actually-playable board, so activating play must expand into
  more space rather than trying to cram controls into the small ambient view.
- **Mobile behavior** (added during design review): hidden entirely below the
  tablet/mobile breakpoint. Mobile hero is just headline + copy — avoids any
  risk of the animation cramping or overlapping text at small sizes. Since
  this detail is meant to be easy to miss anyway, not showing it on mobile is
  a low-cost tradeoff, not a loss of core functionality.

### 2. Minesweeper — the 404 page (lower priority)

- Visiting any broken/missing URL shows a classic Minesweeper board (beginner
  difficulty: 9x9 grid, 10 mines) instead of a generic "not found" message.
- Standard left-click-to-reveal / right-click-to-flag interaction, win/lose
  state, a "reset" control, and a clear link back to Home.
- **Context line** (added during design review): a short line of copy above
  the board — *"This page doesn't exist. While you're here, try not to hit a
  mine."* — so a visitor unfamiliar with the joke (e.g. someone following an
  old/broken link) understands this is an intentional 404 rather than a
  broken site.

### 3. Butterfly knife flip — the light/dark toggle (lower priority)

- The light/dark mode switch is not a generic sliding pill toggle. Clicking it
  plays a short balisong (butterfly knife) flip animation — the toggle
  "handle" rotates/flips open or closed — before settling into the new
  theme's on/off position.
- This is the toggle's only job (switching theme); the flip animation is a
  styling choice on an already-necessary control, not a separate feature.

### 4. Capybara mascot — article reading progress (primary signature)

- Replaces a conventional progress bar on project article pages (`/projects/[slug]`).
- Sits under the nav, same position a reading-progress bar would occupy.
- A small capybara silhouette runs along a horizontal track; horizontal
  position corresponds to scroll percentage through the article body.
- Run-cycle animation speed scales with scroll position (light jog early,
  sprinting as the reader approaches the end).
- At 100% scrolled, the capybara swaps to a flat "resting on the ground" pose
  and stays there; scrolling back up resumes the running pose at the
  corresponding position (purely a function of current scroll %, no
  persisted state).
- No Pokémon or other copyrighted character likeness is used anywhere in this
  or any other detail — this was raised and explicitly ruled out during
  design (IP risk + conflicts with the professional positioning), original
  capybara design used instead.

## Accessibility & Motion

Added during design review — the design leans heavily on animation (four
separate interactive/motion details), so this needs to be an explicit
requirement, not an afterthought:

- **`prefers-reduced-motion` fallbacks** for all four hobby details: the
  Tetris ambient loop shows a single static filled-grid frame instead of
  animating; the capybara mascot jumps directly between running/resting pose
  without an animated run-cycle; the knife-flip toggle switches state
  instantly instead of playing the flip animation. None of the four should
  force motion on a visitor who's opted out.
- **Keyboard operability:** the Tetris overlay must be fully playable via
  keyboard (arrow keys + space, as already specified) with no mouse-only
  interactions. Minesweeper needs a keyboard path for both reveal and flag —
  e.g. arrow keys to move a focus cursor between cells, Enter to reveal,
  Space to flag — since flagging is normally a right-click/mouse-only
  gesture.
- **Visible focus states** sitewide, not just on the two games — nav links,
  the light/dark toggle, contact form fields, and project cards all need a
  visible keyboard focus indicator.
- **Touch controls for mobile:** on-screen move/rotate/drop buttons for
  Tetris, tap-to-reveal and long-press-to-flag for Minesweeper.
- **Decorative/ARIA treatment** (added during design review): the Tetris
  ambient hero animation and the capybara reading-progress mascot are both
  purely visual flourishes — mark both `aria-hidden` so screen readers don't
  announce confusing filler. The capybara is a supplement to reading
  progress, not the only way it's conveyed — nothing essential depends on
  seeing it, and normal semantic document structure (headings, landmarks)
  still carries the real navigation information for assistive tech.
- **Skip-to-content link** (added during design review): a visually-hidden
  "Skip to main content" link, focusable as the first tab stop on every page,
  jumping past the nav straight to page content — standard baseline for a
  multi-page site with a persistent nav bar.

## Contact Page

- `/contact` presents a form (name, email, message) using Netlify's built-in
  static form handling (`<form name="contact" data-netlify="true">` plus the
  required hidden-field detection Netlify forms need). Submissions land in
  the Netlify dashboard and can optionally trigger an email notification to
  John — configured in Netlify's settings, not exposed anywhere in the site's
  code or markup.
- No email address or phone number is displayed as text anywhere on the site.
  LinkedIn and GitHub remain as visible icon links in the footer/nav since
  they're already-public profile links, not private contact details.
- **Submission confirmation** (added during design review): the form submits
  via JS (`fetch`) rather than a plain HTML POST, so the page never navigates
  away. On success, the form area swaps in place to a short inline
  confirmation message. This avoids Netlify Forms' default behavior of
  redirecting to Netlify's own generic, unstyled success page, which would be
  an off-brand break at the exact moment someone reaches out.

## Migration Notes

- Existing bio copy (`src/components/BioSection.js` in the old repo) is the
  starting point for the new Home hero copy — edit down/rewrite for tone, but
  it doesn't need to be reinvented from scratch.
- The dynamic "pull every GitHub repo via the API" section is retired
  entirely. Its replacement is the curated MDX Projects index — quality over
  completeness.
- The existing raster logo (`site_logo-no-background.png`) is retired in
  favor of the typographic "JOHN NG" wordmark used throughout the mockups.
- `LICENSE` (GNU GPL-3.0) and the README's authorship note carry forward
  unchanged.

## Open Items for the Implementation Plan

None outstanding — all decisions above were confirmed during design. The
implementation plan should still make its own call on lower-level details not
worth deciding at the design level (exact Tetris scoring rules, exact
Minesweeper flag-count display, precise animation easing curves) as long as
they don't contradict anything specified above.
