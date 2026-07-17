# Tetris hero: baked AI-replay player

**Date:** 2026-07-17
**Status:** approved design, pre-implementation

## Problem

`TetrisHero.astro`'s ambient board is decorative (no interactivity) yet runs a
live loop every ~1s that:

1. Re-runs the heuristic AI (`chooseBestPlacement`) every cycle.
2. Rebuilds the entire board DOM via `innerHTML='' + createElement` on **both**
   the soft and crisp layers, up to 4 `renderBoard` calls per cycle.
3. Re-rasterizes the `filter: blur(4px)` soft layers on every one of those DOM
   mutations — a 70%-viewport-wide blurred surface reblurred 2–4×/sec.
4. Animates the falling piece via `left`/`top` (layout-triggering), inside a
   blurred layer, so each step relayouts + reblurs.
5. Never pauses — no `visibilitychange`, no on-screen guard, so it keeps
   rebuilding + reblurring when the tab is backgrounded or the hero is scrolled
   past.

A developer reviewer flagged it: "is the Tetris interactive? it probably
shouldn't be rendered dynamically if it isn't." Correct — the ongoing GPU cost
(large-surface reblur) is the reported lag on a weaker browser, and it buys
nothing for a decorative element.

## Goal

Keep real-AI-looking falling motion, but drive it from a **pre-recorded** game
instead of live computation, and eliminate the repeated large-surface reblur.
No live `chooseBestPlacement`, no per-cycle full-board rebuild, no reblur during
piece motion.

## Non-goals

- No change to gameplay/engine logic (`engine.ts`, `autoplay.ts`, `bag.ts`,
  `ambientDemo.ts` stay as-is — the recorder *uses* them).
- No visual redesign: the soft/crisp depth-of-field look is preserved.
- Mobile behavior unchanged (hero is `display:none` below 769px).

## Decisions (locked in brainstorming)

- **Recording length:** one full game, start to genuine top-out. Seed/grid
  chosen so the game runs ~60–120 pieces with visible line-clears (not the
  295-piece canonical 10×20 run). Actual count reported once recorded.
- **Grid:** fixed logical grid `COLS_H × ROWS_H` (constant), cells scale to fill
  the hero via `1fr`. Wider window = bigger blocks, same count — recorded
  coordinates stay valid at every width. Dimensions chosen to preserve current
  visual cell density (~current cell size at a reference desktop width), not the
  illustrative "10 wide".
- **Replay mechanism:** data-replay player (chosen over pure-CSS `@keyframes` so
  a full game with its top-out/reset fits without tens of KB of generated CSS).

## Architecture

Three units, each independently understandable and testable:

### 1. Recorder (offline, not shipped at runtime)

A script (kept in-repo, documented, runnable on demand — not run at build) that:

- Runs the real `createAmbientDemo` + `stepAmbientDemo` at the fixed grid.
- Steps until `stepAmbientDemo` produces a genuine top-out reset (the first time
  the board resets to near-empty from a tall state).
- Records, per piece: `{ type, rotation, x, landingY, clearedRows }` — the
  minimum for the player to reconstruct spawn→turn→fall and the flash/clear,
  exactly as the live code derives them today.
- Emits `src/lib/tetris/heroReplay.ts`: a checked-in generated data module
  exporting the grid dims and the recorded piece array, with a header comment
  documenting the generating command (same spirit as the contact-form baked
  T-spin coordinate sequence).

### 2. Fixed-grid setup (pure-ish, in `.astro` script)

`setupAmbientBoard()` stops deriving cols/rows from the container box. Grid is
the constant `COLS_H × ROWS_H` from `heroReplay.ts`; `grid-template-columns:
repeat(COLS_H, 1fr)` and implicit rows fill the hero. Resize only re-scales cell
size (CSS handles it) — no board rebuild, no sizing generation counter. The
on-screen guard (skip when `clientWidth/Height === 0`, i.e. mobile) is kept.

### 3. Replay player (DOM wiring, in `.astro` script)

Walks the recorded array on a `setTimeout` chain at the current cadence
(`TURN_MS`/`FALL_MS`/`PAUSE_MS`/flash). Per recorded piece:

- Position the 4 falling-piece cells for spawn rotation, run the existing
  `phase-turn` then `phase-fall` transitions to `x`/`landingY`.
- On lock: update the settled board (targeted cell mutation for the locked
  piece, not a full `innerHTML` rebuild), flash the recorded `clearedRows`, then
  clear them.
- After the last recorded piece (the top-out): reset the settled board to empty,
  then loop back to index 0.

No `chooseBestPlacement`, no `renderBoard` of the whole board per cycle.

## The cost fix (the point of the change)

- **Falling piece:** pre-blurred **once** in a small wrapper; moved by
  `transform: translate()` rather than moving children's `left`/`top`. A cached
  blur raster reused under a composite transform does not re-rasterize — the
  per-step reblur disappears entirely. (Today: reblur every step + `left`/`top`
  layout animation.)
- **Settled board:** reblurs only when a piece locks or a line clears (~1×/piece)
  via targeted cell updates — not 2–4× per cycle via `innerHTML` rebuild.
- **Pause guards:** an `IntersectionObserver` on `#tetris-hero` plus a
  `visibilitychange` listener freeze the replay when the hero is scrolled out of
  view or the tab is backgrounded, and resume on return. (Today: runs forever.)

## Preserved / constraints

- Soft (blurred) + crisp (sharp) masked depth-of-field layers, and the hand-tuned
  `--tetris-mask-*` gradient stops (width-relative, unaffected by grid count).
- `prefers-reduced-motion: reduce` → freeze on a static first frame, no loop
  (existing `accessibility.spec.ts` check must still pass).
- The `#tetris-piece` `data-cycle` e2e hook (incremented per spawned piece).
- Mobile `display:none` gate derived from the container box, not a second
  hardcoded breakpoint.
- Repo two-layer rule: pure logic (recorder + any coordinate reconstruction) in
  `src/lib/`, DOM wiring in the component `<script>`. Runtime-created cells still
  need `:global()` scoping.

## Testing

- **Unit (`src/lib/`):** recorder produces a non-empty array; the recorded game
  ends on a genuine top-out; every recorded entry is a structurally valid piece
  event (type, rotation in range, `x`/`landingY` on-board, `clearedRows` sorted
  and in range). `heroReplay.ts` data matches the recorder's output for the
  committed seed/grid (guards against a hand-edited data file drifting from the
  generator).
- **E2E:** keep the reduced-motion freeze check; keep the `data-cycle` presence
  check; add one asserting the loop restarts at the recorded end (piece index
  wraps) with no live-AI dependency. Verify no console errors on Home load.
- **Gate:** `npm run test:all` (typecheck + unit + build + e2e/axe).

## Risks

- Chosen seed/grid yields an unpleasant game (few clears, awkward stacking) —
  mitigated by scanning a handful of seeds offline and eyeballing before baking.
- Fixed grid changes cell size at extreme widths — accepted (design decision);
  cells scaling is the intended responsive behavior.
- Blur-transform trick must keep the piece visually inside the DOF mask — the
  wrapper is masked the same way the current piece layers are; verify live.
