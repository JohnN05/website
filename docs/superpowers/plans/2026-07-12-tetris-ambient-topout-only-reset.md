# Tetris Ambient Demo: Top-Out-Only Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Tetris hero's ambient demo currently resets on either a real
top-out or a heuristic "unfavorable" hole-heavy position past 50% stack
height. Remove the heuristic reset so the demo only restarts on a genuine
top-out.

**Architecture:** `stepAmbientDemo` (`src/lib/tetris/ambientDemo.ts`) drops
its `tall`/`holes`/`unfavorable` computation — its reset condition becomes
`result.gameOver` alone. The `isBuildingUp`/`BUILD_UP_HEIGHT_RATIO` weighting
that existed only to feed that heuristic is removed too, so
`chooseBestPlacement` always uses its existing default line-clear weight.
`TetrisHero.astro`'s `runAmbientCycle` mirrors the simplified call so its
animated landing spot still matches what `stepAmbientDemo` commits.

**Tech Stack:** TypeScript, Vitest (unit), Astro (`TetrisHero.astro`'s
`<script>` block, DOM-wiring only — no unit test coverage for that layer per
this repo's architecture pattern).

## Global Constraints

- Reset condition must be exactly `result.gameOver` — no other trigger.
- `chooseBestPlacement`'s default weighting (`WEIGHT_LINES_CLEARED = 6` in
  `src/lib/tetris/autoplay.ts`) must apply unconditionally; no per-call
  override remains anywhere in the ambient loop.
- `TetrisHero.astro`'s `runAmbientCycle` and `ambientDemo.ts`'s
  `stepAmbientDemo` must keep calling `chooseBestPlacement` identically
  (same args) so the animated landing spot and the committed landing spot
  never diverge.
- No change to wall kicks, T-spin scoring, flash-before-clear, board sizing,
  or the real click-to-play board's behavior.

---

### Task 1: Simplify `ambientDemo.ts`'s reset logic

**Files:**
- Modify: `src/lib/tetris/ambientDemo.ts`
- Test: `src/lib/tetris/ambientDemo.test.ts`

**Interfaces:**
- Consumes: `chooseBestPlacement(state, config?)` from `./autoplay`, where
  `config.linesClearedWeight` defaults to `WEIGHT_LINES_CLEARED` (6) when
  omitted (`src/lib/tetris/autoplay.ts:68`).
- Produces: `stepAmbientDemo(state: GameState, stepIndex: number):
  AmbientStepResult` (signature unchanged) — `createAmbientDemo` unchanged.
  `isBuildingUp` is deleted; `TetrisHero.astro` (Task 2) must stop importing
  it.

- [ ] **Step 1: Update the test file to match the new behavior**

Replace the full contents of `src/lib/tetris/ambientDemo.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { createAmbientDemo, stepAmbientDemo } from './ambientDemo';
import { createGame, type GameState, type Cell } from './engine';

describe('ambient demo', () => {
  it('never reaches game over while cycling', () => {
    let state = createAmbientDemo();
    for (let i = 0; i < 50; i++) {
      state = stepAmbientDemo(state, i).state;
      expect(state.gameOver).toBe(false);
    }
  });

  it('clears at least one line over a full cycle', () => {
    let state = createAmbientDemo();
    let maxLinesCleared = 0;
    for (let i = 0; i < 20; i++) {
      state = stepAmbientDemo(state, i).state;
      maxLinesCleared = Math.max(maxLinesCleared, state.linesCleared);
    }
    expect(maxLinesCleared).toBeGreaterThan(0);
  });

  it('is deterministic given the same step sequence', () => {
    let aState = createAmbientDemo();
    let bState = createAmbientDemo();
    let lastA, lastB;
    for (let i = 0; i < 10; i++) {
      lastA = stepAmbientDemo(aState, i);
      lastB = stepAmbientDemo(bState, i);
      aState = lastA.state;
      bState = lastB.state;
    }
    expect(lastA).toEqual(lastB);
  });

  it('stays within bounds on a board wider than the fixed 10-column default', () => {
    let state = createAmbientDemo(24, 20);
    for (let i = 0; i < 30; i++) {
      state = stepAmbientDemo(state, i).state;
      for (const row of state.board) {
        expect(row).toHaveLength(24);
      }
    }
  });

  it('preserves custom board dimensions across a reset', () => {
    let state = createAmbientDemo(24, 6);
    let sawNonDefaultDimensions = false;
    for (let i = 0; i < 200; i++) {
      state = stepAmbientDemo(state, i).state;
      expect(state.board).toHaveLength(6);
      expect(state.board[0]).toHaveLength(24);
      sawNonDefaultDimensions = true;
    }
    expect(sawNonDefaultDimensions).toBe(true);
  });
});

describe('holes never trigger a reset', () => {
  // Builds a solid block occupying the bottom `filledRows` rows, then caps
  // every column but the last one row above the block and hollows out its
  // bottom cell — an unambiguous, exactly-counted hole per capped column.
  // Column `cols - 1` is left uncapped so the cap row is never an
  // accidental complete row sitting in the starting board.
  //
  // Column `cols - 1` is left empty for the *entire* block (not just the
  // cap row): filling it the same as every other column for the solid
  // block rows would make every one of those rows already-complete before
  // stepAmbientDemo ever runs (all `cols` columns filled, nothing missing).
  // clearLines() scans the whole board on any lock, so those accidental
  // complete rows would clear away on the very first placement regardless
  // of where the new piece lands — collapsing the stack back down to a
  // couple of rows and defeating the entire point of this fixture (a
  // stable, hole-heavy stack).
  function makeHoleyBlock(cols: number, rows: number, filledRows: number): Cell[][] {
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    const top = rows - filledRows;
    for (let y = top; y < rows; y++) {
      for (let x = 0; x < cols - 1; x++) board[y][x] = 'O';
    }
    for (let x = 0; x < cols - 1; x++) {
      board[top - 1][x] = 'O';
      board[rows - 1][x] = null;
    }
    return board;
  }

  it('never resets a hole-heavy position, regardless of stack height', () => {
    const cols = 10, rows = 20;
    // filledRows=9 -> capped columns reach height 10 (50%), with 9 genuine
    // holes out of 200 cells (4.5%) — previously enough to trigger the
    // now-removed "unfavorable" heuristic reset.
    const board = makeHoleyBlock(cols, rows, 9);
    const base = createGame('T', cols, rows);
    const state: GameState = { ...base, board, current: { ...base.current, x: 4 } };
    const { state: after } = stepAmbientDemo(state, 0);
    expect(after.board.some((row) => row.some((c) => c !== null))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the updated tests to confirm they fail against the current implementation**

Run: `npm test -- ambientDemo`
Expected: FAIL — `isBuildingUp` import in the old `ambientDemo.ts` doesn't
matter yet, but `'never resets a hole-heavy position, regardless of stack
height'` fails because the current code still resets this exact fixture
(it's the old "resets once unfavorable..." case, now asserting the
opposite).

- [ ] **Step 3: Replace `src/lib/tetris/ambientDemo.ts` with the simplified version**

Replace the full file contents with:

```ts
import {
  createGame, moveLeft, moveRight, rotate, hardDrop, landingRow, boardWithPiece, fullRowIndices,
  COLS, ROWS, type GameState, type PieceType, type Cell,
} from './engine';
import { createBag } from './bag';
import { chooseBestPlacement } from './autoplay';

// A tiny seeded PRNG so piece selection is a pure function of `step` alone
// (not shared mutable state) — two independent `createAmbientDemo()` runs
// stepped with the same indices must produce identical results, which a
// module-level bag counter shared across calls could not guarantee once two
// runs interleave their calls (see ambientDemo.test.ts's determinism test).
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reuses the real 7-bag randomizer (not a reimplementation) seeded per-bag
// so the same (step) always yields the same piece: draw a fresh bag seeded
// by which group of 7 this step falls in, then discard draws until reaching
// this step's position within that bag.
function pieceForStep(step: number): PieceType {
  const bagIndex = Math.floor(step / 7);
  const posInBag = step % 7;
  const draw = createBag(mulberry32(bagIndex + 1));
  let piece: PieceType = 'I';
  for (let i = 0; i <= posInBag; i++) piece = draw();
  return piece;
}

export function createAmbientDemo(cols: number = COLS, rows: number = ROWS): GameState {
  return createGame(pieceForStep(0), cols, rows);
}

export interface AmbientStepResult {
  state: GameState;
  preClearBoard: Cell[][];
  clearedRows: number[];
}

export function stepAmbientDemo(state: GameState, stepIndex: number): AmbientStepResult {
  const cols = state.board[0].length;
  const rows = state.board.length;
  const placement = chooseBestPlacement(state);
  const nextPiece = pieceForStep(stepIndex + 1);

  let next = state;
  for (let i = 0; i < placement.rotation; i++) next = rotate(next);
  for (let i = 0; i < cols; i++) next = moveLeft(next);
  while (next.current.x < placement.x) next = moveRight(next);

  const landingY = landingRow(next.board, next.current);
  const preClearBoard = boardWithPiece(next.board, { ...next.current, y: landingY });
  const clearedRows = fullRowIndices(preClearBoard);

  const result = hardDrop(next, nextPiece);

  // Only reset on a genuine top-out (hardDrop couldn't spawn the next
  // piece) — no heuristic early reset. A random-looking mid-stack restart
  // reads as a bug to a viewer, so hole-heavy or otherwise unfavorable
  // positions are left standing; the demo keeps playing through them.
  const finalState = result.gameOver ? createGame(pieceForStep(stepIndex + 1), cols, rows) : result;
  return { state: finalState, preClearBoard, clearedRows };
}
```

- [ ] **Step 4: Run the tests again to confirm they pass**

Run: `npm test -- ambientDemo`
Expected: PASS (all tests in `ambientDemo.test.ts` green).

- [ ] **Step 5: Run the full unit suite to confirm no other file broke**

Run: `npm test`
Expected: PASS. `columnHeights`/`countHoles` (from `./autoplay`) and
`WEIGHT_LINES_CLEARED` are no longer imported by `ambientDemo.ts` — if
`autoplay.test.ts` or anything else imports them directly, that's unaffected
since they're still exported from `autoplay.ts` itself, only this file's
import list shrank.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tetris/ambientDemo.ts src/lib/tetris/ambientDemo.test.ts
git commit -m "fix: reset Tetris ambient demo only on real top-out

Removes the heuristic hole-heavy reset (and the build-up-to-50%
weighting that only existed to feed it) — the demo now restarts
solely when a piece can't spawn, not on a mid-stack heuristic call
that read as a random restart to viewers."
```

---

### Task 2: Update `TetrisHero.astro` and `CLAUDE.md`

**Files:**
- Modify: `src/components/TetrisHero.astro`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `chooseBestPlacement(state)` from `../lib/tetris/autoplay`
  (Task 1's `ambientDemo.ts` already calls it the same way — no config
  object, default weighting).
- Produces: no new exports; DOM-wiring only, verified by build + manual
  check (this layer has no unit test coverage per this repo's architecture
  pattern — Playwright e2e can't run in this sandbox, see `CLAUDE.md`'s
  Playwright/`libnspr4` note).

- [ ] **Step 1: Update the import line**

In `src/components/TetrisHero.astro`, find:

```ts
  import { createAmbientDemo, stepAmbientDemo, isBuildingUp } from '../lib/tetris/ambientDemo';
  import { chooseBestPlacement, WEIGHT_LINES_CLEARED } from '../lib/tetris/autoplay';
```

Replace with:

```ts
  import { createAmbientDemo, stepAmbientDemo } from '../lib/tetris/ambientDemo';
  import { chooseBestPlacement } from '../lib/tetris/autoplay';
```

- [ ] **Step 2: Simplify the `runAmbientCycle` placement call**

Find:

```ts
  function runAmbientCycle() {
    // Must resolve the lines-cleared weight exactly the way stepAmbientDemo
    // will when it commits this same placement below, or the two calls can
    // rank placements differently and the piece will animate toward one
    // column but lock into another.
    const placement = chooseBestPlacement(ambientState, {
      linesClearedWeight: isBuildingUp(ambientState.board) ? WEIGHT_LINES_CLEARED : 0,
    });
```

Replace with:

```ts
  function runAmbientCycle() {
    // Must call chooseBestPlacement identically to how stepAmbientDemo will
    // below when it commits this same placement, or the two calls can rank
    // placements differently and the piece will animate toward one column
    // but lock into another. Neither call overrides the default weighting
    // anymore, so this is trivially true, but keep the calls symmetric.
    const placement = chooseBestPlacement(ambientState);
```

- [ ] **Step 3: Update the stale comment inside the second `setTimeout`**

Find (inside `runAmbientCycle`, in the commit/flash callback):

```ts
          // stepAmbientDemo recomputes chooseBestPlacement itself and
          // commits via hardDrop. It locks the piece in exactly the spot
          // just animated to because both calls resolve
          // chooseBestPlacement's lines-cleared weight through the same
          // isBuildingUp(board) helper above, not just because they see
          // the same state — the state alone was previously assumed to be
          // enough and wasn't (see ambientDemo.ts's isBuildingUp doc
          // comment). If the commit would have caused game over,
          // stepAmbientDemo silently resets to a fresh empty board
          // instead (see ambientDemo.ts) rather than surfacing it — a
          // rare, purely cosmetic edge case where this animation's
          // predicted landing spot is replaced by an empty board right as
          // it lands, accepted as-is since this is a decorative
          // background loop, not gameplay.
```

Replace with:

```ts
          // stepAmbientDemo recomputes chooseBestPlacement itself and
          // commits via hardDrop. It locks the piece in exactly the spot
          // just animated to because both calls resolve
          // chooseBestPlacement identically (same args, same default
          // weighting) — not just because they see the same state, which
          // was previously assumed to be enough and wasn't (see
          // ambientDemo.ts's stepAmbientDemo). If the commit would have
          // caused a real top-out, stepAmbientDemo silently resets to a
          // fresh empty board instead (see ambientDemo.ts) rather than
          // surfacing it — a rare, purely cosmetic edge case where this
          // animation's predicted landing spot is replaced by an empty
          // board right as it lands, accepted as-is since this is a
          // decorative background loop, not gameplay.
```

- [ ] **Step 4: Build to confirm no TypeScript/import errors**

Run: `npm run build`
Expected: PASS, clean build. This is the only automated check available for
this file in this sandbox (no Playwright/`libnspr4`, per `CLAUDE.md`).

- [ ] **Step 5: Update `CLAUDE.md`'s Tetris description**

In the "Hobby details — priority order" section, find this paragraph:

```
The ambient loop also plays real wall kicks and awards a T-spin score bonus
(`isTSpin` in `engine.ts`, gated on `GameState.lastMoveWasRotation`), builds
its stack up to at least 50% of board height before its heuristic starts
rewarding line clears (`BUILD_UP_HEIGHT_RATIO` in `ambientDemo.ts`), and
never resets below that same 50% floor even in a hole-heavy ("unfavorable")
position — resets only trigger at or above it. Cleared rows flash a few
times before disappearing (`stepAmbientDemo`'s `clearedRows`/`preClearBoard`,
consumed in `TetrisHero.astro`'s `runAmbientCycle`).
```

Replace with:

```
The ambient loop also plays real wall kicks and awards a T-spin score bonus
(`isTSpin` in `engine.ts`, gated on `GameState.lastMoveWasRotation`). It
resets only on a genuine top-out (`stepAmbientDemo`'s `result.gameOver` in
`ambientDemo.ts`) — an earlier heuristic reset for hole-heavy positions past
a 50%-height floor was tried and removed because it read as a random
mid-stack restart to a viewer rather than a real game over; hole-heavy
positions are now left standing indefinitely. Cleared rows flash a few times
before disappearing (`stepAmbientDemo`'s `clearedRows`/`preClearBoard`,
consumed in `TetrisHero.astro`'s `runAmbientCycle`).
```

Also update the **Status** paragraph at the top of `CLAUDE.md`: after the
sentence ending "...each only reproducible by watching the live animation,
not by unit tests", add a new sentence:

```
 A follow-up one-off fix (no plan doc beyond this
one) then removed the ambient demo's heuristic hole-heavy reset entirely,
per user report that it read as a random mid-stack restart — it now resets
only on a genuine top-out.
```

(Read the exact current wording of both spots in the live file before
editing — this plan was written against the file as it stood when the plan
was authored, and the surrounding sentence may have shifted slightly.)

- [ ] **Step 6: Commit**

```bash
git add src/components/TetrisHero.astro CLAUDE.md
git commit -m "docs: reflect top-out-only ambient reset in TetrisHero and CLAUDE.md

TetrisHero.astro's runAmbientCycle no longer overrides
chooseBestPlacement's default weighting, matching ambientDemo.ts's
Task 1 change. CLAUDE.md's Tetris section and Status paragraph
updated to describe the new reset behavior instead of the removed
50%-height/unfavorable-hole heuristic."
```

- [ ] **Step 7: Run the full test-all gate**

Run: `npm run test:all`
Expected: unit tests PASS, build PASSes, e2e fails/skips only with the known
`libnspr4` environment signature (not a real regression) — per `CLAUDE.md`'s
workflow preferences, get a real-environment Playwright run before merging
to `main`.
