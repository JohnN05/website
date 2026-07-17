# Design Review — Next Steps

_Working doc, 2026-07-16. Tracks the remaining items from
`docs/2026-07-16-design-review.md`. Items 1–7 done across four passes (commits
`5bb3352`/`7010fe9`, `fbf0898`, the article-header pass, and the bio-portrait
pass below); 8 and the per-page cleanups remain. Not a spec — each visual item
still gets its own
Artifact mock approved before any component change, per the repo's mock-first
workflow._

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

## Done (third pass — article-header)

Review item 6, the "most neglected surface":

6. **Article page header.** `ArticleLayout.astro` gained a split header echoing
   the site's own Bio/contact two-column: mono meta line, a larger Bricolage
   title (`clamp(2.4rem, 5vw, 3.6rem)` — bigger than /projects' 2.8rem, which
   also covers item 8's one bold scale moment; Bricolage loads at 600 only, so
   impact is size + tracking, not weight), a Source Serif **dek** from the
   project's `summary`, and a 4:3 cover frame with an accent hairline + inset
   top-edge. The cover shows a real photo when `cover` is set, else a
   **server-rendered generated fallback** — a frozen tetromino stack in the
   article's own accent — with a white piece marker at top-right (fallback
   only; a real photo stays clean). **The first-letter-glyph direction the
   review suggested was mocked and rejected** by the owner (too thin on a
   low-content page); the header is image-led instead, since real cover photos
   are planned. `ACCENT_VAR` + `PIECE_CELLS` were lifted from `ProjectCard`'s
   local consts into `lib/tags.ts`; both components import them, so the card's
   hover piece and the article's fallback marker are the same shape for a tag
   by construction. `[slug].astro` passes `summary` + `cover`; prose column
   (70ch Source Serif) untouched. Verified: typecheck, 92/92 unit, clean build,
   76/76 e2e + axe (the sweep covers `/projects/portfolio-site-rewrite`, now
   rendering the new header). See CLAUDE.md Status for the full rationale.

---

## Done (fourth pass — bio portrait)

Review item 7, the "most generic possible frame":

7. **Bio portrait — L-piece dissolve.** _(Superseded — rebuilt as an **O**-piece
   dissolve by the piece-swap follow-up below; bio's piece is the gold O now. The
   L description here is the original build, kept for history.)_ `index.astro`'s
   `.bio-frame` is no longer
   a plain rounded `<img>`. It's a 4×4-grid dissolve: an **L tetromino** (left
   column rows 1–3 + a foot cell) breaks off the bottom-left of the photo, the
   cells colour to `--piece-l` (clay, the bio section's own piece), and the notch
   reveals the section wash behind. On entry the portrait holds whole for ~650ms,
   then breaks; **clicking toggles** whole/apart, and on reassembly the cells fly
   home and **flash white** (the board's `flashRows()` cadence — a class-toggle
   loop, no CSS `@keyframes`) before resolving back to the photo. The tetromino-
   silhouette-mask direction the review suggested was rejected in mocking (a
   jagged mask straight over a face crops the head); reshaping the *break* into a
   piece while the face stays rectangular was the approved answer instead.
   - **Slicing is the sprite technique, not `<img object-fit>`.** A first mock
     used an oversized `<img object-fit:cover>` per cell and it cropped every
     cell to the image *centre* regardless of offset — so the broken pieces all
     showed the face. Switched to `background-image` + `background-size: 400%` +
     per-cell `background-position`, the canonical N×N sprite formula, so each
     cell carries its true region (the top-left foot cell shows the photo's
     bottom-left, etc.) and the notch reveals the wash.
   - **No runtime `createElement`.** All cells are server-rendered markup, so
     ordinary Astro scoping applies — none of the `:global()` grid trap.
   - **The resting whole state needs no JS.** Core (photo clipped to
     square-minus-L) + four photo cells at home = one seamless square, so under
     reduced motion or no-JS the portrait renders as a clean photo and the script
     never attaches. `role="img"`/`aria-label="John Ng"` carries the identity the
     old `<img alt>` did; the click toggle is a decorative enhancement, not an AT
     control. Verified: typecheck, 92/92 unit, clean build, 76/76 e2e + axe (the
     sweep covers Home, now rendering the new frame).

## Done (follow-up — scroll-well piece swap)

A viewer caught the scroll-well's **bio** piece as "two J pieces, one orange":
it wore `--piece-l` (orange) but its silhouette was a **J**, not an L. Not a
typo — geometry. The well packs cols 0–2 and leaves col 3 for the I-bar, and
once hero's blue J sits `X../XXX` on the floor and feat's gold O takes the
top-left 2×2, the only cells left for bio form a J. An exhaustive search
confirmed **only two** genuine `{J, L, O}` tilings of the 3×4 well exist, and
neither is grounded in scroll order (hero→bio→feat) — so "bio drops a real L,
second, without floating" is provably impossible.

Fix (option "Y", mocked in Artifacts first): the one correct-silhouette,
bottom-up-grounded tiling needs drop order **J, O, L**, so **bio drops the gold
O and feat drops the orange L** (swapped). Propagated by the piece==section==wash
rule:

- `TetrisWell.astro` `PIECES` reordered to `j, o, l, i` with new coords — J on
  the floor, O resting on it, L on top; nothing floats, I-bar still clears col 3.
- `index.astro` section `data-band`s: bio `o`, feat `l`.
- `tokens.css`: `--wash-bio` now mixes from `--piece-o` (gold), `--wash-featured`
  from `--piece-l` (orange). The `--piece-*` values are unchanged — only which
  section wears which. Seam gradients reference wash tokens by name, so they
  followed automatically.
- **Bio portrait rebuilt L→O dissolve** (supersedes item 7 above): a gold 2×2
  block breaks off the bottom-left quarter (`clip-path` `…50% 100%, 50% 50%, 0
  50%`, cells `o1`–`o4`, `--piece-o` fill), replacing the L's arm+foot.

Verified: typecheck + unit + clean build + **76/76 e2e + axe** green. No test
asserted piece shape or wash colour, so none needed updating (a future test
pinning bio's well cell to `p-o` / feat's to `p-l` would guard against a silent
re-swap). Committed `d4ec940`.

---

## Done (fifth pass — contact send T-spin + 404 / Minesweeper)

The last two per-page cleanups (`/contact` on-brand touch and `/404`
belong-to-the-system), plus the Minesweeper redesign the 404 review implied.
Mock-first in an Artifact over many rounds.

- **`/contact` — the send is a T-Spin Double.** A first "corner tetromino on the
  card" mock was rejected by the owner as a purposeless Tetris reference. The
  approved direction ties the motif to the one real completion on the page: on a
  successful send the fields fade, a T piece spawns high, drops block-by-block
  down a well, snaps 90° **in place** into the notch (an instant rotation, not a
  tween, like real Tetris), the two completed rows flash and clear, the standing
  blocks drop by gravity, and the reply **rises out of the freed space**. The
  reply is a composed moment — a mono `Message sent` eyebrow over a Bricolage
  headline ("Thanks for the message. I'll talk to you soon!") — not the old
  plain tinted chip. Board coordinates are **verified against `engine.ts`**
  (`scratchpad/tspin-solve.ts` drove the real `rotate()`/`isTSpin`: `isTSpin=true`,
  kick `(0,0)`, 2 rows cleared) and baked as a fixed sequence. The board scales
  to the card. Gated on motion; reduced-motion / no-JS / error keep the plain
  swap, honoring the fetch-submit success/error constraint.
- **`/404` — wash + system type.** Cobalt `--wash-hero` band (the same
  `/contact` uses) with a seam to flat before the footer, a mono `Error 404`
  eyebrow, the spec-matching context line promoted to lede type, token spacing,
  and a `Back to Home` link at full `--color-text` contrast (cobalt was
  unreadable on the cobalt wash, worst in dark) with the accent kept as its
  underline + arrow.
- **Minesweeper redesigned** (`MinesweeperBoard.astro`) — it had fallen behind.
  Now a bordered panel matching the site's card language; unopened tiles read as
  raised, **opened cells recede to flat `--color-bg` so numbers keep full
  `--color-text` contrast in both themes** (the old revealed background was
  `--color-text-secondary` — ivory numbers on a light grey in dark mode, the
  unreadable case). Reset restyled (mono, hairline border, accent-on-hover,
  focus ring); the status no longer collides with it (`min-width:0` wraps, Reset
  `flex-shrink:0`, shorter lose copy) and colors itself on win/lose; a hit mine
  tints its cell; cells are responsive.

Verified by the controller directly: full `test:all` — typecheck, 92 unit,
clean build, **76/76 e2e + axe** green in this sandbox's real browser (the axe
sweep covers `/contact` and `/404`, both redesigned). T-spin timing/scale and
the exact wash/panel values remain open to live eyeball tuning.

---

## Remaining items

Effort is rough (S/M/L). "Mock-first" means an approved Artifact mock before
touching components. Every visual item here is mock-first. Items 1–7 are done
(see the Done sections above); **8 and the per-page cleanups remain.**

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

- ~~**`/404` context line · XS**~~ — **DONE** (fifth pass). Context line already
  matched the spec; the page now carries the wash + system type + a redesigned
  Minesweeper panel, so it no longer reads as a one-off.
- ~~**`/contact` on-brand touch · S**~~ — **DONE** (fifth pass). Landed as the
  send-is-a-T-spin animation rather than a resting-card ornament — the motif is
  tied to the real completion, not bolted on.
- **`/projects` hierarchy · M** — as the project count grows, the flat
  `auto-fit` grid will read as a spreadsheet. Let the newest project span wider
  (a featured row) for hierarchy. Not urgent at 4 projects; revisit when it
  grows.

---

## Recommended sequence (remaining)

Items 1–7 shipped. What's left, ordered by ratio of impact to risk:

1. **Item 8 (typography)** — now largely closed: item 3 gave the impact row and
   item 6 gave the bold article title. What remains is a small audit + leaning
   on IBM Plex Mono where it fits.
2. **Page cleanups** (`/404`, `/contact`, `/projects` hierarchy) — as they come
   up; none block the above.

Each visual step: Artifact mock → approval → live dev-server pass → port into
`.astro` → run the `test:all` gate before commit.
