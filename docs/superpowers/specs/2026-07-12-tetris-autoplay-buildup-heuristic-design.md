# Tetris autoplay: build up higher before clearing rows

## Problem

The ambient hero demo's autoplay (`chooseBestPlacement` in
`src/lib/tetris/autoplay.ts`) currently rewards line clears the same amount
regardless of stack height, so it tends to clear the first available line
rather than building a visible stack first. A prior "build-up" heuristic
existed (`isBuildingUp`/`BUILD_UP_HEIGHT_RATIO` in `ambientDemo.ts`, 50%
threshold) but was removed alongside the ambient reset simplification
([[2026-07-12-tetris-ambient-topout-only-reset-design]]) because it was
entangled with the reset logic being simplified. Per user ask: bring the
build-up behavior back, at a higher (75%) threshold, but structured so it
can't repeat the divergence bug documented in `CLAUDE.md` — the previous
version required two call sites (`ambientDemo.ts` and `TetrisHero.astro`) to
independently call a shared helper and pass its result through, and once
that discipline slipped the two sites picked different placements for the
same piece.

## Change

Move the build-up decision inside `chooseBestPlacement` itself, so it's
derived from `state.board` at the single call site that already exists in
each caller — no external helper, no second value to thread through.

### `src/lib/tetris/autoplay.ts`

- Add a private constant `BUILD_UP_HEIGHT_RATIO = 0.75` (not exported — no
  other file needs to reference it now that the decision isn't duplicated).
- In `chooseBestPlacement`, replace:
  ```ts
  const linesClearedWeight = config.linesClearedWeight ?? WEIGHT_LINES_CLEARED;
  ```
  with a version that only falls back to `WEIGHT_LINES_CLEARED` once the
  stack is tall enough, computed from `state.board` via the already-exported
  `columnHeights`:
  ```ts
  const tall = Math.max(0, ...columnHeights(state.board)) >= state.board.length * BUILD_UP_HEIGHT_RATIO;
  const linesClearedWeight = config.linesClearedWeight ?? (tall ? WEIGHT_LINES_CLEARED : 0);
  ```
- `AutoplayConfig.linesClearedWeight` keeps working as an explicit override
  (existing tests in `autoplay.test.ts` pass it directly) — the auto
  build-up behavior only applies when a caller omits it, which is what both
  `ambientDemo.ts`'s `stepAmbientDemo` and `TetrisHero.astro`'s
  `runAmbientCycle` already do post-[[2026-07-12-tetris-ambient-topout-only-reset-design]].

### `src/lib/tetris/ambientDemo.ts` / `src/components/TetrisHero.astro`

No changes. Both already call `chooseBestPlacement(state)` with no config
object, so the new build-up-aware default applies automatically and
identically at both sites by construction — there is no second place that
could disagree.

### Tests (`src/lib/tetris/autoplay.test.ts`)

Add a `describe` block covering the threshold directly, using a
single-filled-column board fixture (same shape as the old
`ambientDemo.test.ts` `isBuildingUp` tests) at:
- below 75% height: a placement that avoids clearing a line scores at least
  as well as one that clears it (the heuristic doesn't chase the clear).
- at/above 75% height: a line-clearing placement is chosen when one exists
  (mirrors the existing `'fills a single-column gap to clear the line'` test
  but at a tall starting height, to confirm the auto-weight actually turned
  back on).

### Tests (`src/lib/tetris/ambientDemo.test.ts`)

`'clears at least one line over a full cycle'` currently loops 20 steps.
75% is a taller bar than the old 50% (which needed 80 steps), so this needs
raising further — exact number tuned empirically against the real
implementation during execution (start at 150, adjust if flaky).

### Docs

Update `CLAUDE.md`'s Tetris section to describe the restored build-up
behavior and its new location/threshold, replacing the "resets only on a
genuine top-out" paragraph's implicit "no build-up phase" framing with an
accurate description: reset stays top-out-only, but placement selection
again favors building a stack before clearing, now sourced from a single
internal computation in `chooseBestPlacement` rather than a duplicated
external helper.

## Out of scope

- No change to reset behavior (stays top-out-only, per the prior pass).
- No change to wall kicks, T-spin scoring, flash-before-clear, or the real
  click-to-play board (which doesn't use `chooseBestPlacement` at all).
