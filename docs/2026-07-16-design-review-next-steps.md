# Design Review — Next Steps

_Working doc, 2026-07-16. Tracks the remaining items from
`docs/2026-07-16-design-review.md`. Items 1–5 done across two passes (commits
`5bb3352`/`7010fe9` and `fbf0898`); 6, 7, 8 and the per-page cleanups remain.
Not a spec — each visual item still gets its own Artifact mock approved before
any component change, per the repo's mock-first workflow._

---

## Done (this pass — commits `5bb3352`, `7010fe9`)

Review items 1–3, the "will change how the site *feels* more than any amount of
parallax" tier:

1. **Butterfly-knife toggle** — rebuilt as a legible balisong (shaped handles,
   pivot pins, Mako clip-point blade). State encoded in the silhouette
   (closed=light / blade-out=dark), CSS-driven off `html[data-theme]` so it's
   flash-free and correct with no JS; sun/moon + mode label for discoverability;
   reduced-motion still swaps the resting silhouette.
2. **Featured cards on Home** — covers turned on (`showCover`), real resting
   hairline, accent top-edge + lift on hover, and an accent-driven tetromino
   that drops into the cover and white-flashes clear on leave.
3. **Teaching → impact row** — `60+ / 3 / 2` mono-labelled, counts up on entry;
   final values ship in markup so reduced-motion/no-JS render them correct.

A side effect worth noting for the items below: the card resting-edge fix in
item 2 lives in `ProjectCard.astro`, so **`/projects` cards already got their
real resting edge too** — the review's "near-invisible resting state (same as
Home) hurts more here" note is now largely addressed. What remains on
`/projects` is hierarchy, not chrome (see below).

---

## Done (second pass — commit `fbf0898`)

Review items 4 and 5, done together because item 5 gates item 4:

5. **Washes — committed at 18%** (from 12%). `tokens.css` `--wash-mix: 18%`, and
   each `--wash-*` remixed from a new `--piece-*` token so the section's ground
   matches the piece dropped into it.
4. **Section through-line — the scroll-well.** `TetrisWell.astro`: a Home-only
   fixed bottom-right Tetris well that fills one tetromino per section as you
   scroll (J/L/O/I), the I-bar clearing four lines at the bottom, replaying on
   scroll-to-top. Piece colour == section wash colour (canonical Tetris hues, I
   is teal not green). Footer-safe (pointer-events:none + fade-during-footer,
   deferred past the clear); ordered drops so a mid-page refresh never plays on
   an empty board; desktop-only, aria-hidden, reduced-motion off. New
   `tests/e2e/tetris-well.spec.ts`; 76/76 e2e green. See CLAUDE.md for the full
   rationale and the load-bearing decisions.

---

## Remaining items

Effort is rough (S/M/L). "Mock-first" means an approved Artifact mock before
touching components. Every visual item here is mock-first. Items 1–5 are done
(see the two Done sections above); **6, 7, 8 and the per-page cleanups remain.**

### 6. Article page header · M · mock-first
`/projects/[slug]` is the review's "most neglected surface and the one that
matters most for a portfolio" — currently `meta → h1 → prose` at 70ch with no
visual tie to the card the visitor clicked. Carry the card's cover accent +
glyph into the article header so the jump from a colored card to the article
isn't jarring.
- Reuse what item 2 already built: `accentForTag` → accent, the cover glyph,
  the tetromino. `ArticleLayout.astro` is the file.
- High portfolio value; second-most-impactful remaining item after the
  through-line.

### 7. Bio portrait frame · S–M · mock-first
The portrait is a plain 20px-radius rounded square — "the most generic possible
frame." Mask it into a tetromino silhouette (S or T footprint) or seat it in a
grid cell echoing the board.
- CSS `mask-image` / `clip-path`; watch the mask-image gotcha this repo already
  hit once (the capybara's `currentColor` went inert under `background-image` —
  see the visual-refinement note). Optional micro-interaction on the frame only.

### 8. Typography contrast · S · partly done
The page reads mostly in two faces at a narrow heading scale. The review wants
one genuinely bold scale moment against small mono labels, and mono doing more
than eyebrows.
- **Item 3's impact row already delivered the bold-number-vs-mono-label
  moment.** What's left is smaller: audit whether any other heading wants the
  contrast, and lean on IBM Plex Mono for project meta / section markers (which
  overlaps item 4). Largely a cleanup, not a build.

---

## Per-page cleanups (lower stakes)

- **`/404` context line · XS** — confirm the Minesweeper 404 has the context
  line the spec calls for and uses the same tokens/type, so it doesn't read as a
  one-off. Quick check, possibly already fine.
- **`/contact` on-brand touch · S** — the form card is a plain tinted rectangle.
  One touch (a grid line, a corner tetromino) to tie it in. Note the parity pass
  already gave `ContactForm` an accent `:focus-visible` ring, so the review's
  focus-ring suggestion is done; this is just the resting card.
- **`/projects` hierarchy · M** — as the project count grows, the flat
  `auto-fit` grid will read as a spreadsheet. Let the newest project span wider
  (a featured row) for hierarchy. Not urgent at 4 projects; revisit when it
  grows.

---

## Recommended sequence (remaining)

Items 1–5 shipped. What's left, ordered by ratio of impact to risk:

1. **Item 8 (typography)** — mostly a small audit; item 3 did the hard part.
2. **Item 7 (bio portrait)** — self-contained, visible, low risk.
3. **Item 6 (article header)** — highest remaining portfolio value.
4. **Page cleanups** (`/404`, `/contact`, `/projects` hierarchy) — as they come
   up; none block the above.

Each visual step: Artifact mock → approval → live dev-server pass → port into
`.astro` → run the `test:all` gate before commit.
