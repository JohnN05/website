# Tetris ambient demo: reset only on real top-out

## Problem

The ambient hero demo (`src/lib/tetris/ambientDemo.ts`) currently resets the
board in two cases: a real game-over (piece can't spawn — top-out), or a
heuristic "unfavorable" trigger once the stack passes 50% height and holes
exceed 3% of all cells (`UNFAVORABLE_HOLE_RATIO`). The heuristic reset makes
the demo restart at moments that don't read as a natural game-over to a
viewer — it just looks like the board randomly clears itself mid-stack. Per
user ask: the demo should only restart when a piece genuinely tops out.

## Change

Remove the hole-heavy heuristic reset entirely. The board resets if and only
if `stepAmbientDemo`'s `hardDrop` reports `gameOver`.

This also removes the reason the build-up-before-clearing weighting existed
(`isBuildingUp`/`BUILD_UP_HEIGHT_RATIO`, which delayed favoring line clears
until the stack hit 50% height) — that phase was there to build a taller,
more hole-prone stack before the heuristic reset had a chance to fire. With
the heuristic reset gone, `chooseBestPlacement` can weigh line clears the
same way from the start (its existing default, `WEIGHT_LINES_CLEARED`), so
this weighting distinction is removed too rather than left as now-pointless
special-casing.

### `src/lib/tetris/ambientDemo.ts`

- Delete `isBuildingUp`, `BUILD_UP_HEIGHT_RATIO`, `maxHeight`,
  `UNFAVORABLE_HOLE_RATIO`.
- `stepAmbientDemo`: drop the `tall`/`holes`/`unfavorable` computation and
  the now-unused `countHoles` import. Call `chooseBestPlacement(state)` with
  no `linesClearedWeight` override (the default already applies it). Reset
  condition becomes `result.gameOver` only.

### `src/components/TetrisHero.astro`

- Drop the `isBuildingUp` import.
- `runAmbientCycle`'s `chooseBestPlacement(ambientState)` call drops its
  `linesClearedWeight` override, matching the simplified call in
  `stepAmbientDemo`. The existing "both call sites must resolve the weight
  identically" invariant still holds — it's just trivially true now since
  neither site overrides the default.

### Tests (`src/lib/tetris/ambientDemo.test.ts`)

- Delete the `describe('isBuildingUp', ...)` block.
- Delete the `'resets once an unfavorable, hole-heavy position reaches 50%
  stack height'` test — that behavior is being removed.
- Keep a "holes never trigger a reset" case at low stack height (repurpose
  the surviving `'never resets below 50% stack height...'` test, dropping
  the height-floor framing — the invariant is now just "hole-heavy positions
  never reset, full stop").
- Revert the `'clears at least one line over a full cycle'` test's step
  count and comment back toward the pre-build-up baseline — there's no
  artificial delay before the heuristic starts rewarding clears anymore.

### Docs

- Update `CLAUDE.md`'s Tetris section: remove the build-up-to-50%/
  unfavorable-reset-floor description, replace with "resets only on a real
  top-out."

## Out of scope

- No change to wall kicks, T-spin scoring, flash-before-clear, or any other
  ambient-loop behavior.
- No change to the real click-to-play board (already only resets via normal
  game-over, this only affects the ambient demo's own reset path).
