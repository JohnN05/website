gith# Tetris Hero Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the ambient Tetris hero animation on `/` — gradual (not flat) blur, bigger pieces with no edge-drift/cutoff, a blocky-but-fast motion feel, real wall kicks + T-spin scoring, an ambient AI that builds the stack up before cashing in line clears, a reset floor so resets never happen below 50% stack height, and a flash-in/flash-out animation before cleared rows disappear.

**Architecture:** No new files. Extends the existing pure-logic/DOM-wiring split: engine changes (wall kicks, T-spin detection, board-preview helpers) go in `src/lib/tetris/engine.ts`; heuristic tuning goes in `src/lib/tetris/autoplay.ts`; ambient-loop pacing (build-up, reset floor) goes in `src/lib/tetris/ambientDemo.ts`; all visual/timing/DOM changes go in `src/components/TetrisHero.astro`. The real click-to-play overlay board is untouched throughout — every change here is scoped to the decorative ambient layer and the engine features it exercises.

**Tech Stack:** Astro component script (vanilla TS, no framework), Vitest for `src/lib/`, Playwright (`tests/e2e/tetris.spec.ts`) for the component.

## Global Constraints

- Real click-to-play Tetris overlay (`#tetris-overlay`, keyboard/touch controls) keeps its current feel — none of these changes alter its rules, timing, or scoring.
- `prefers-reduced-motion` must keep freezing the ambient loop on a static frame (existing `if (!reducedMotion.matches) runAmbientCycle();` gate) — don't break that path while restructuring the piece layer.
- `aria-hidden` stays on both ambient layers and the piece overlay — still purely decorative.
- `npm run test:all` (unit + build + e2e) must pass before each task's commit; run it, don't just run the subset you think is affected.
- CLAUDE.md (`/mnt/c/Users/johnn/projects/website/.claude/worktrees/website-revamp/CLAUDE.md`) is the as-built doc for this worktree — Task 7 updates its "standard smooth CSS easing" line; every other task that changes documented Tetris behavior (T-spins, build-up, reset floor) should get a one-line mention there too (folded into Task 7's doc step to keep the doc edit atomic).

---

## Task 1: Engine — wall kicks + T-spin detection

**Files:**
- Modify: `src/lib/tetris/engine.ts`
- Test: `src/lib/tetris/engine.test.ts`

**Interfaces:**
- Consumes: nothing new — works within the existing `GameState`/`Piece`/`Cell` types already in this file.
- Produces: `GameState.lastMoveWasRotation: boolean` (new field — true only immediately after a successful `rotate()`, cleared by any successful `moveLeft`/`moveRight`/`softDrop`). `isTSpin(board: Cell[][], piece: Piece): boolean` (exported). `rotate()` now attempts SRS-style wall kicks instead of only the naive in-place rotation. `lockPiece()` now awards `TSPIN_LINE_SCORES` instead of `LINE_SCORES` when the lock followed a T-spin. Later tasks (3, 4) don't touch this file's kick/T-spin logic at all — Task 2 adds two more exports here.

- [ ] **Step 1: Write the failing tests for wall kicks and T-spin detection**

Add to `src/lib/tetris/engine.test.ts` (after the existing `describe('landingRow', ...)` block, so the file's imports need `cellsFor` and the `Cell`/`GameState`/`Piece` types added):

```ts
import { describe, it, expect } from 'vitest';
import {
  createGame, moveLeft, moveRight, rotate, softDrop, hardDrop, landingRow, cellsFor, isTSpin,
  COLS, ROWS, type GameState, type Piece, type Cell,
} from './engine';
```

(This replaces the existing narrower import line at the top of the file.)

```ts
describe('wall kicks', () => {
  it('kicks the piece away from the left wall when a plain rotation would go out of bounds', () => {
    let state = createGame('T', 6, 10);
    for (let i = 0; i < 10; i++) state = moveLeft(state); // pinned at rotation 0, x = 0
    state = rotate(state); // rotation 0 -> 1, fits at x = 0 without a kick
    for (let i = 0; i < 10; i++) state = moveLeft(state); // pinned at rotation 1, x = -1
    expect(state.current.x).toBe(-1);
    state = rotate(state); // rotation 1 -> 2: naive (0,0) kick goes off-board;
                           // the kick table's next test, (+1, 0), fits and should land
    expect(state.current.rotation).toBe(2);
    expect(state.current.x).toBe(0);
  });

  it('leaves the piece exactly where it was if every wall-kick position collides', () => {
    const cols = 5, rows = 5;
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill('O'));
    const piece: Piece = { type: 'T', rotation: 0, x: 1, y: 1 };
    // Carve out only this piece's own rot0 footprint; every other cell stays
    // filled, so no translated copy of the differently-shaped rot1 footprint
    // can fit anywhere, and every kick test should fail.
    for (const [x, y] of cellsFor(piece)) board[y][x] = null;
    const state: GameState = { ...createGame('T', cols, rows), board, current: piece };
    const result = rotate(state);
    expect(result.current.rotation).toBe(0);
    expect(result.current.x).toBe(1);
    expect(result.current.y).toBe(1);
  });
});

describe('isTSpin', () => {
  it('is true when at least 3 of the 4 diagonal corners around the T center are filled', () => {
    const cols = 5, rows = 6;
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    // T at rotation 0, x=1, y=2 -> center = (x+1, y+1) = (2, 3); corners are
    // (1,2) (3,2) (1,4) (3,4). Fill 3 of them, leave (3,4) open.
    board[2][1] = 'O';
    board[2][3] = 'O';
    board[4][1] = 'O';
    const piece: Piece = { type: 'T', rotation: 0, x: 1, y: 2 };
    expect(isTSpin(board, piece)).toBe(true);
  });

  it('is false when only 2 of the 4 diagonal corners are filled', () => {
    const cols = 5, rows = 6;
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    board[2][1] = 'O';
    board[2][3] = 'O';
    const piece: Piece = { type: 'T', rotation: 0, x: 1, y: 2 };
    expect(isTSpin(board, piece)).toBe(false);
  });

  it('is always false for non-T pieces, even with all 4 corners filled', () => {
    const cols = 5, rows = 6;
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    board[2][1] = 'O'; board[2][3] = 'O'; board[4][1] = 'O'; board[4][3] = 'O';
    const piece: Piece = { type: 'J', rotation: 0, x: 1, y: 2 };
    expect(isTSpin(board, piece)).toBe(false);
  });
});

describe('T-spin scoring requires the last action to be a rotation', () => {
  // Board where a T at rotation 0, x=1, y=3 fits its own 4 body cells into
  // empty squares, can't fall any further (blocked at y=4 by the (1,5)
  // filled cell below), and has 3 of its 4 diagonal corners filled —
  // (1,3), (3,3), (1,5) filled; (3,5) left open. Verified by hand: body
  // cells at (2,3) (1,4) (2,4) (3,4) never overlap (1,3) (3,3) (1,5).
  function boardWithTPocket(): Cell[][] {
    const cols = 5, rows = 6;
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    board[3][1] = 'O';
    board[3][3] = 'O';
    board[5][1] = 'O';
    return board;
  }

  it('awards T-spin points when the piece is rotated immediately before locking', () => {
    let state: GameState = { ...createGame('T', 5, 6), board: boardWithTPocket() };
    state = rotate(state); // sets lastMoveWasRotation = true (open board, trivial rotation)
    state = { ...state, current: { type: 'T', rotation: 0, x: 1, y: 3 } };
    const before = state.score;
    state = hardDrop(state, 'O');
    expect(state.score).toBeGreaterThanOrEqual(before + 400);
  });

  it('does not award T-spin points when a move happened after the last rotation', () => {
    let state: GameState = { ...createGame('T', 5, 6), board: boardWithTPocket() };
    state = rotate(state);   // lastMoveWasRotation = true
    state = moveRight(state); // lastMoveWasRotation = false
    state = moveLeft(state);  // still false
    state = { ...state, current: { type: 'T', rotation: 0, x: 1, y: 3 } };
    const before = state.score;
    state = hardDrop(state, 'O');
    expect(state.score).toBeLessThan(before + 400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- engine.test.ts`
Expected: FAIL — `isTSpin` is not exported, and the wall-kick tests fail because `rotate()` doesn't attempt kicks yet.

- [ ] **Step 3: Implement wall kicks and T-spin detection in `engine.ts`**

Modify `src/lib/tetris/engine.ts`. First, add the `lastMoveWasRotation` field to `GameState` (engine.ts:59-65):

```ts
export interface GameState {
  board: Cell[][];
  current: Piece;
  score: number;
  linesCleared: number;
  gameOver: boolean;
  lastMoveWasRotation: boolean;
}
```

Update `createGame` (engine.ts:85-93) to initialize it:

```ts
export function createGame(firstPiece: PieceType, cols: number = COLS, rows: number = ROWS): GameState {
  return {
    board: emptyBoard(cols, rows),
    current: { type: firstPiece, rotation: 0, x: Math.floor(cols / 2) - 2, y: -2 },
    score: 0,
    linesCleared: 0,
    gameOver: false,
    lastMoveWasRotation: false,
  };
}
```

Update `withPiece` (engine.ts:95-98) so any successful translation clears the flag:

```ts
function withPiece(state: GameState, piece: Piece): GameState {
  if (collides(state.board, piece)) return state;
  return { ...state, current: piece, lastMoveWasRotation: false };
}
```

Replace `rotate()` (engine.ts:108-111) with a kick-aware version. Insert the kick tables just above it (after the `SHAPES` constant is fine, or directly above `rotate`):

```ts
// Simplified SRS-style wall kicks, adapted to this engine's downward-y
// coordinate system (the published guideline tables assume y-up, so every
// dy here is the guideline value negated). JLSTZ pieces share one table;
// O never needs a kick (all 4 rotations are the same shape); I gets a
// deliberately simplified horizontal-only kick set rather than the full
// guideline I-table — this is a decorative ambient/casual-play engine, not
// a competitive one, and the simplified I table still lets I rotate cleanly
// near walls, which is all that's needed here.
const WALL_KICKS_JLSTZ: Record<string, number[][]> = {
  '0>>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};
const WALL_KICKS_I: number[][] = [[0, 0], [1, 0], [-1, 0], [2, 0], [-2, 0]];

export function rotate(state: GameState): GameState {
  const from = state.current.rotation;
  const to = (from + 1) % 4;
  const kicks =
    state.current.type === 'O' ? [[0, 0]] :
    state.current.type === 'I' ? WALL_KICKS_I :
    WALL_KICKS_JLSTZ[`${from}>>${to}`];
  for (const [dx, dy] of kicks) {
    const candidate: Piece = { ...state.current, rotation: to, x: state.current.x + dx, y: state.current.y + dy };
    if (!collides(state.board, candidate)) {
      return { ...state, current: candidate, lastMoveWasRotation: true };
    }
  }
  return state;
}
```

Update `softDrop` (engine.ts:157-161) so a successful gravity step also clears the flag:

```ts
export function softDrop(state: GameState, nextPiece: PieceType): GameState {
  const dropped = { ...state.current, y: state.current.y + 1 };
  if (collides(state.board, dropped)) return lockPiece(state, nextPiece);
  return { ...state, current: dropped, lastMoveWasRotation: false };
}
```

Add `isTSpin` and the T-spin score table, and update `lockPiece` (engine.ts:125-155):

```ts
// Standard 3-corner T-spin rule: of the 4 cells diagonally adjacent to the
// T piece's center (its pivot cell, index (1,1) in every one of its 4
// rotation shapes), at least 3 must be occupied — by a block or by being
// off the board. Deliberately doesn't distinguish "T-Spin" from "T-Spin
// Mini" (the guideline's finer-grained corner-direction rule) — one bonus
// tier is enough for a decorative ambient loop's "feels more real" goal.
export function isTSpin(board: Cell[][], piece: Piece): boolean {
  if (piece.type !== 'T') return false;
  const cols = board[0].length;
  const rows = board.length;
  const cx = piece.x + 1;
  const cy = piece.y + 1;
  const corners = [
    [cx - 1, cy - 1], [cx + 1, cy - 1],
    [cx - 1, cy + 1], [cx + 1, cy + 1],
  ];
  const filled = corners.filter(
    ([x, y]) => x < 0 || x >= cols || y < 0 || y >= rows || board[y][x] !== null
  ).length;
  return filled >= 3;
}

function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const cols = board[0].length;
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = board.length - remaining.length;
  const board2 = [
    ...Array.from({ length: cleared }, () => Array<Cell>(cols).fill(null)),
    ...remaining,
  ];
  return { board: board2, cleared };
}

const LINE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_LINE_SCORES = [400, 800, 1200, 1600];

function lockPiece(state: GameState, nextPiece: PieceType): GameState {
  const cols = state.board[0].length;
  const tspin = state.lastMoveWasRotation && isTSpin(state.board, state.current);
  const board = state.board.map((row) => [...row]);
  for (const [x, y] of cellsFor(state.current)) {
    if (y < 0) return { ...state, gameOver: true };
    board[y][x] = state.current.type;
  }
  const { board: clearedBoard, cleared } = clearLines(board);
  const spawned: Piece = { type: nextPiece, rotation: 0, x: Math.floor(cols / 2) - 2, y: -2 };
  const gameOver = collides(clearedBoard, spawned);
  const scoreGain = tspin ? TSPIN_LINE_SCORES[cleared] : LINE_SCORES[cleared];
  return {
    board: clearedBoard,
    current: spawned,
    score: state.score + scoreGain,
    linesCleared: state.linesCleared + cleared,
    gameOver,
    lastMoveWasRotation: false,
  };
}
```

`hardDrop` (engine.ts:163-166) needs no change — it already passes `state` (carrying whatever `lastMoveWasRotation` it had) straight into `lockPiece` via `{ ...state, current: piece }`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- engine.test.ts`
Expected: PASS — all previous tests plus the new wall-kick, `isTSpin`, and T-spin-scoring tests.

- [ ] **Step 5: Run the full unit suite to check for regressions**

Run: `npm test`
Expected: PASS. (`autoplay.test.ts` and `ambientDemo.test.ts` both call `rotate`/`hardDrop` on open boards, where the first kick test `(0,0)` always succeeds — behavior for those callers is unchanged.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/tetris/engine.ts src/lib/tetris/engine.test.ts
git commit -m "feat(tetris): add SRS-style wall kicks and T-spin scoring to the engine"
```

---

## Task 2: Engine — pre-clear board preview helpers

**Files:**
- Modify: `src/lib/tetris/engine.ts`
- Test: `src/lib/tetris/engine.test.ts`

**Interfaces:**
- Consumes: `Cell`, `Piece`, `cellsFor` (all already in this file).
- Produces: `boardWithPiece(board: Cell[][], piece: Piece): Cell[][]` and `fullRowIndices(board: Cell[][]): number[]`, both exported. Task 4 uses both to compute the "about to be cleared" board and row indices for the flash animation, without needing to touch `lockPiece`'s internals or change its return type.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/tetris/engine.test.ts`:

```ts
describe('boardWithPiece', () => {
  it('stamps the piece cells into a copy without mutating the original board', () => {
    const state = createGame('O', 6, 10);
    const stamped = boardWithPiece(state.board, { ...state.current, y: 5 });
    expect(state.board[5].some((c) => c !== null)).toBe(false);
    expect(stamped[5].some((c) => c === 'O')).toBe(true);
  });

  it('ignores cells above the top of the board (negative y)', () => {
    const state = createGame('O', 6, 10); // spawn y = -2
    const stamped = boardWithPiece(state.board, state.current);
    expect(stamped.every((row) => row.every((c) => c === null || c === 'O'))).toBe(true);
  });
});

describe('fullRowIndices', () => {
  it('returns the indices of fully-filled rows', () => {
    const rows = 4, cols = 3;
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    board[2] = ['O', 'O', 'O'];
    expect(fullRowIndices(board)).toEqual([2]);
  });

  it('returns an empty array when no row is full', () => {
    const board: Cell[][] = Array.from({ length: 3 }, () => Array<Cell>(3).fill(null));
    expect(fullRowIndices(board)).toEqual([]);
  });
});
```

Add `boardWithPiece` and `fullRowIndices` to this test file's import line (extending the one from Task 1):

```ts
import {
  createGame, moveLeft, moveRight, rotate, softDrop, hardDrop, landingRow, cellsFor, isTSpin,
  boardWithPiece, fullRowIndices, COLS, ROWS, type GameState, type Piece, type Cell,
} from './engine';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- engine.test.ts`
Expected: FAIL — `boardWithPiece` and `fullRowIndices` are not exported yet.

- [ ] **Step 3: Implement the helpers**

Add to `src/lib/tetris/engine.ts`, near `cellsFor` (engine.ts:71-73):

```ts
export function boardWithPiece(board: Cell[][], piece: Piece): Cell[][] {
  const copy = board.map((row) => [...row]);
  const rows = copy.length;
  const cols = copy[0].length;
  for (const [x, y] of cellsFor(piece)) {
    if (y >= 0 && y < rows && x >= 0 && x < cols) copy[y][x] = piece.type;
  }
  return copy;
}

export function fullRowIndices(board: Cell[][]): number[] {
  const indices: number[] = [];
  board.forEach((row, i) => {
    if (row.every((cell) => cell !== null)) indices.push(i);
  });
  return indices;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tetris/engine.ts src/lib/tetris/engine.test.ts
git commit -m "feat(tetris): add boardWithPiece/fullRowIndices preview helpers"
```

---

## Task 3: Autoplay — configurable lines-cleared weight + exported board stats

**Files:**
- Modify: `src/lib/tetris/autoplay.ts`
- Test: `src/lib/tetris/autoplay.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Cell` from `engine.ts` (already imported).
- Produces: `chooseBestPlacement(state: GameState, config?: { linesClearedWeight?: number }): Placement` (widened signature, backward compatible — omitting `config` behaves exactly as before). `columnHeights(board: Cell[][]): number[]` and `countHoles(board: Cell[][]): number`, both now exported (previously private). Task 4 imports `columnHeights` and `countHoles` from here instead of re-implementing them.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/tetris/autoplay.test.ts` (this file already has a local `countHoles` helper used only inside its own tests — leave that one alone, these new tests import the module's exported version under a different local name to avoid a collision):

```ts
import { chooseBestPlacement, columnHeights, countHoles as countHolesExported } from './autoplay';
```

(This replaces the existing `import { chooseBestPlacement } from './autoplay';` line.)

```ts
describe('chooseBestPlacement lines-cleared weight', () => {
  it('still finds a line-clearing placement when the weight is high', () => {
    const base = createGame('I');
    const state: GameState = { ...base, board: boardWithBottomRowGapAt(4) };
    const placement = chooseBestPlacement(state, { linesClearedWeight: 20 });
    const result = applyPlacement(state, placement);
    expect(result.linesCleared).toBeGreaterThan(state.linesCleared);
  });

  it('does not throw and still returns an in-bounds placement when the weight is zero', () => {
    const base = createGame('O');
    const state: GameState = { ...base, board: boardWithBottomRowGapAt(4) };
    const placement = chooseBestPlacement(state, { linesClearedWeight: 0 });
    expect(placement.x).toBeGreaterThanOrEqual(0);
    expect(placement.x).toBeLessThan(COLS);
  });
});

describe('columnHeights (exported)', () => {
  it('reports rows-minus-topmost-filled-row per column', () => {
    const rows = 5, cols = 3;
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    board[3][1] = 'O'; // topmost filled row for column 1 is row 3 of 5 -> height 2
    expect(columnHeights(board)).toEqual([0, 2, 0]);
  });
});

describe('countHoles (exported)', () => {
  it('counts empty cells with a filled cell above them in the same column', () => {
    const rows = 4, cols = 2;
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    board[0][0] = 'O';
    board[3][0] = 'O';
    // row 2, column 0 is empty with row 0's block above it -> 1 hole
    expect(countHolesExported(board)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- autoplay.test.ts`
Expected: FAIL — `columnHeights` and `countHoles` aren't exported, and `chooseBestPlacement` doesn't accept a config argument.

- [ ] **Step 3: Implement**

Modify `src/lib/tetris/autoplay.ts`. Export the two stat functions (autoplay.ts:13, 28) by adding `export` to their existing definitions:

```ts
export function columnHeights(board: Cell[][]): number[] {
  const cols = board[0].length;
  const rows = board.length;
  const heights = new Array(cols).fill(0);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (board[y][x] !== null) {
        heights[x] = rows - y;
        break;
      }
    }
  }
  return heights;
}

export function countHoles(board: Cell[][]): number {
  let holes = 0;
  for (let x = 0; x < board[0].length; x++) {
    let seenFilled = false;
    for (let y = 0; y < board.length; y++) {
      if (board[y][x] !== null) seenFilled = true;
      else if (seenFilled) holes++;
    }
  }
  return holes;
}
```

Give `scoreResult` an explicit weight parameter (autoplay.ts:46-56) instead of reading the module constant directly:

```ts
function scoreResult(before: GameState, after: GameState, linesClearedWeight: number): number {
  const heights = columnHeights(after.board);
  const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);
  const linesCleared = after.linesCleared - before.linesCleared;
  return (
    countHoles(after.board) * WEIGHT_HOLES +
    bumpiness(heights) * WEIGHT_BUMPINESS +
    aggregateHeight * WEIGHT_HEIGHT -
    linesCleared * linesClearedWeight
  );
}
```

Widen `chooseBestPlacement`'s signature and pass the resolved weight through (autoplay.ts:63-89):

```ts
export interface AutoplayConfig {
  linesClearedWeight?: number;
}

export function chooseBestPlacement(state: GameState, config: AutoplayConfig = {}): Placement {
  const linesClearedWeight = config.linesClearedWeight ?? WEIGHT_LINES_CLEARED;
  let best: Placement = { rotation: 0, x: state.current.x };
  let bestScore = Infinity;

  for (let r = 0; r < 4; r++) {
    let rotated = state;
    for (let i = 0; i < r; i++) rotated = rotate(rotated);

    let leftmost = rotated;
    for (let i = 0; i < state.board[0].length; i++) leftmost = moveLeft(leftmost);

    let probe = leftmost;
    while (true) {
      const dropped = hardDrop(probe, 'O');
      const score = scoreResult(state, dropped, linesClearedWeight);
      if (score < bestScore) {
        bestScore = score;
        best = { rotation: r, x: probe.current.x };
      }
      const next = moveRight(probe);
      if (next.current.x === probe.current.x) break;
      probe = next;
    }
  }

  return best;
}
```

Also export `WEIGHT_LINES_CLEARED` (autoplay.ts:11) so Task 4 doesn't have to re-declare the same magic number:

```ts
export const WEIGHT_LINES_CLEARED = 6;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- autoplay.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tetris/autoplay.ts src/lib/tetris/autoplay.test.ts
git commit -m "feat(tetris): make chooseBestPlacement's lines-cleared reward configurable"
```

---

## Task 4: Ambient demo — build up before clearing, and a 50%-height reset floor

**Files:**
- Modify: `src/lib/tetris/ambientDemo.ts`
- Modify: `src/components/TetrisHero.astro` (minimal — just adapt to the new return shape; the full flash-animation use of the new fields lands in Task 8)
- Test: `src/lib/tetris/ambientDemo.test.ts`

**Interfaces:**
- Consumes: `columnHeights`, `countHoles`, `WEIGHT_LINES_CLEARED` from `autoplay.ts` (Task 3). `boardWithPiece`, `fullRowIndices`, `landingRow` from `engine.ts` (Task 2 / existing).
- Produces: `stepAmbientDemo(state: GameState, stepIndex: number): AmbientStepResult` where `AmbientStepResult = { state: GameState; preClearBoard: Cell[][]; clearedRows: number[] }` — **this changes the function's return type** from bare `GameState`. Task 8 is the task that actually uses `preClearBoard`/`clearedRows`; this task's `TetrisHero.astro` edit only unwraps `.state` so the site keeps building and passing e2e in the meantime.

- [ ] **Step 1: Update the existing tests for the new return shape, and write new failing tests for build-up/reset-floor behavior**

Replace `src/lib/tetris/ambientDemo.test.ts` in full:

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
    // Raised from 20 to 80 steps: the build-up-before-clearing heuristic
    // (this task) deliberately delays the first clear until the stack
    // reaches 50% height, which takes noticeably longer than the old
    // clear-on-sight behavior did.
    let state = createAmbientDemo();
    let maxLinesCleared = 0;
    for (let i = 0; i < 80; i++) {
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

describe('build-up-before-clearing and the 50%-height reset floor', () => {
  // Builds a solid block occupying the bottom `filledRows` rows, then caps
  // every column but the last one row above the block and hollows out its
  // bottom cell — an unambiguous, exactly-counted hole per capped column.
  // Column `cols - 1` is left uncapped so the cap row is never an
  // accidental complete row sitting in the starting board.
  function makeHoleyBlock(cols: number, rows: number, filledRows: number): Cell[][] {
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    const top = rows - filledRows;
    for (let y = top; y < rows; y++) {
      for (let x = 0; x < cols; x++) board[y][x] = 'O';
    }
    for (let x = 0; x < cols - 1; x++) {
      board[top - 1][x] = 'O';
      board[rows - 1][x] = null;
    }
    return board;
  }

  it('never resets below 50% stack height, however hole-heavy the position', () => {
    const cols = 10, rows = 20;
    // filledRows=8 -> capped columns reach height 9 (8 + the cap row) = 45%
    const board = makeHoleyBlock(cols, rows, 8);
    const base = createGame('T', cols, rows);
    const state: GameState = { ...base, board, current: { ...base.current, x: 4 } };
    const { state: after } = stepAmbientDemo(state, 0);
    expect(after.board.some((row) => row.some((c) => c !== null))).toBe(true);
  });

  it('resets once an unfavorable, hole-heavy position reaches 50% stack height', () => {
    const cols = 10, rows = 20;
    // filledRows=9 -> capped columns reach height 10 (9 + the cap row) = 50%,
    // with 9 genuine holes out of 200 cells (4.5%), comfortably over the
    // "unfavorable" threshold.
    const board = makeHoleyBlock(cols, rows, 9);
    const base = createGame('T', cols, rows);
    const state: GameState = { ...base, board, current: { ...base.current, x: 4 } };
    const { state: after } = stepAmbientDemo(state, 0);
    expect(after.board.every((row) => row.every((c) => c === null))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ambientDemo.test.ts`
Expected: FAIL — `stepAmbientDemo` still returns a bare `GameState`, so `.state` is `undefined`, and the build-up/reset-floor tests don't match current behavior.

- [ ] **Step 3: Implement the new `stepAmbientDemo`**

Replace `src/lib/tetris/ambientDemo.ts` in full:

```ts
import {
  createGame, moveLeft, moveRight, rotate, hardDrop, landingRow, boardWithPiece, fullRowIndices,
  COLS, ROWS, type GameState, type PieceType, type Cell,
} from './engine';
import { createBag } from './bag';
import { chooseBestPlacement, columnHeights, countHoles, WEIGHT_LINES_CLEARED } from './autoplay';

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

function maxHeight(board: Cell[][]): number {
  return Math.max(0, ...columnHeights(board));
}

// Don't start rewarding line clears until the stack reaches this fraction of
// the board's height — makes the ambient loop build a visible stack instead
// of cashing in the first available single-line clear, per design ask.
const BUILD_UP_HEIGHT_RATIO = 0.5;
// Above the build-up floor, a position counts as "unfavorable" (worth
// resetting) once holes make up more than this fraction of all cells.
const UNFAVORABLE_HOLE_RATIO = 0.03;

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
  const tall = maxHeight(state.board) >= rows * BUILD_UP_HEIGHT_RATIO;
  const placement = chooseBestPlacement(state, { linesClearedWeight: tall ? WEIGHT_LINES_CLEARED : 0 });
  const nextPiece = pieceForStep(stepIndex + 1);

  let next = state;
  for (let i = 0; i < placement.rotation; i++) next = rotate(next);
  for (let i = 0; i < cols; i++) next = moveLeft(next);
  while (next.current.x < placement.x) next = moveRight(next);

  const landingY = landingRow(next.board, next.current);
  const preClearBoard = boardWithPiece(next.board, { ...next.current, y: landingY });
  const clearedRows = fullRowIndices(preClearBoard);

  const result = hardDrop(next, nextPiece);

  const holes = countHoles(result.board);
  const unfavorable =
    maxHeight(result.board) >= rows * BUILD_UP_HEIGHT_RATIO &&
    (result.gameOver || holes / (cols * rows) > UNFAVORABLE_HOLE_RATIO);

  const finalState = unfavorable ? createGame(pieceForStep(stepIndex + 1), cols, rows) : result;
  return { state: finalState, preClearBoard, clearedRows };
}
```

- [ ] **Step 4: Adapt `TetrisHero.astro` to the new return shape (minimal — no flash animation yet)**

In `src/components/TetrisHero.astro`, find this line inside the final `window.setTimeout` of `runAmbientCycle()` (currently around line 208):

```ts
      ambientState = stepAmbientDemo(ambientState, ambientStep++);
      renderBoard(ambientEl, ambientState);
```

Replace with:

```ts
      ambientState = stepAmbientDemo(ambientState, ambientStep++).state;
      renderBoard(ambientEl, ambientState);
```

(Task 8 replaces this same spot again to actually use `preClearBoard`/`clearedRows` for the flash animation — this step just keeps the build green in the meantime.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- ambientDemo.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full unit suite and the build**

Run: `npm test && npm run build`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/tetris/ambientDemo.ts src/lib/tetris/ambientDemo.test.ts src/components/TetrisHero.astro
git commit -m "feat(tetris): build the ambient stack up before clearing, add a 50%-height reset floor"
```

---

## Task 5: TetrisHero — exact cell sizing (fixes the edge-drift/cutoff bug) + larger pieces

**Files:**
- Modify: `src/components/TetrisHero.astro`

**Interfaces:**
- Consumes: nothing new.
- Produces: `cellW`/`cellH` (script-local, replacing the single `CELL_SIZE`-based math used for absolute positioning) — Task 6 and Task 8's script edits build on top of this task's variable names.

**Root cause being fixed:** the ambient ﻿grid (`#tetris-ambient`) sizes its columns/rows with fractional `1fr` tracks that stretch to fill the container exactly, but the separate `#tetris-piece` overlay (the animated falling piece) positions its cells using a hardcoded `CELL_SIZE` constant that assumes a cell is exactly that many pixels — it never is, once you account for the container's actual width, the 1px `gap`, and the floor-division leftover. The mismatch compounds cell-by-cell moving right, so pieces increasingly drift out of alignment with the grid, and pieces near the right edge get visually clipped by `.tetris-hero`'s `overflow: hidden`. Bigger pieces (this task's other ask) would make the drift worse, not better, if left unfixed — so this fix has to land first.

- [ ] **Step 1: Locate and replace the cell-sizing block**

In `src/components/TetrisHero.astro`, replace this block (currently lines 133-136):

```ts
  const CELL_SIZE = 30;
  const ambientCols = Math.max(4, Math.floor(ambientEl.clientWidth / CELL_SIZE));
  const ambientRows = Math.max(4, Math.floor(ambientEl.clientHeight / CELL_SIZE));
  ambientEl.style.gridTemplateColumns = `repeat(${ambientCols}, 1fr)`;
```

with:

```ts
  // Target cell size used only to derive how many columns/rows fit — the
  // actual on-screen cell size (cellW/cellH below) is always computed
  // exactly from the container's real box plus the grid's 1px gaps, so the
  // falling-piece overlay never drifts out of alignment with the grid
  // (see this task's plan notes for why that drift/cutoff bug existed).
  const CELL_SIZE = 44;
  const GAP = 1;
  const ambientCols = Math.max(4, Math.floor((ambientEl.clientWidth + GAP) / (CELL_SIZE + GAP)));
  const ambientRows = Math.max(4, Math.floor((ambientEl.clientHeight + GAP) / (CELL_SIZE + GAP)));
  ambientEl.style.gridTemplateColumns = `repeat(${ambientCols}, 1fr)`;
  const cellW = (ambientEl.clientWidth - (ambientCols - 1) * GAP) / ambientCols;
  const cellH = (ambientEl.clientHeight - (ambientRows - 1) * GAP) / ambientRows;
```

- [ ] **Step 2: Update `positionPieceCells` to use the exact cell size**

Replace (currently lines 159-167):

```ts
  function positionPieceCells(coords: number[][]) {
    coords.forEach(([x, y], i) => {
      const cell = pieceCells[i];
      cell.style.width = `${CELL_SIZE}px`;
      cell.style.height = `${CELL_SIZE}px`;
      cell.style.left = `${x * CELL_SIZE}px`;
      cell.style.top = `${y * CELL_SIZE}px`;
    });
  }
```

with:

```ts
  function positionPieceCells(coords: number[][]) {
    coords.forEach(([x, y], i) => {
      const cell = pieceCells[i];
      cell.style.width = `${cellW}px`;
      cell.style.height = `${cellH}px`;
      cell.style.left = `${x * cellW}px`;
      cell.style.top = `${y * cellH}px`;
    });
  }
```

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: PASS (this is a script-only change with no new types, so `astro check`/build should be unaffected).

- [ ] **Step 4: Run the Tetris e2e spec**

Run: `npm run test:e2e -- tetris.spec.ts`
Expected: PASS — none of these 4 tests assert on cell size or count, only on overall widget width ratio and that `#tetris-piece`'s cells move between two points in time, both still true.

- [ ] **Step 5: Manual visual check**

Run: `npm run dev`, open `http://localhost:4321/` at a desktop width (≥769px). Confirm: pieces are visibly larger than before, and — watch several ambient cycles — no piece appears to be sliced off or misaligned with the grid near the right edge of the hero.

- [ ] **Step 6: Commit**

```bash
git add src/components/TetrisHero.astro
git commit -m "fix(tetris): compute ambient cell size exactly, larger pieces without edge drift"
```

---

## Task 6: TetrisHero — gradual (not flat) blur via layered soft/crisp masks

**Files:**
- Modify: `src/components/TetrisHero.astro`
- Modify: `tests/e2e/tetris.spec.ts`

**Interfaces:**
- Consumes: `cellW`/`cellH`, `renderBoard` (Task 5 / existing).
- Produces: two ambient grid layers (`#tetris-ambient-soft`, `#tetris-ambient-crisp`) replacing the single `#tetris-ambient`; two piece layers (`#tetris-piece-soft`, `#tetris-piece-crisp`) nested inside the existing `#tetris-piece` wrapper, replacing the single set of piece cells. Task 7 and Task 8's script edits render/position both layers identically wherever the old code touched the single layer.

**Why layering, not a literal variable-radius blur:** CSS has no per-pixel-variable-blur primitive (`filter: blur()` takes one constant radius for the whole element). The old code applied one flat blur *and* one hard opacity mask across the whole ambient layer — which is exactly why it read as "blur in the middle, too strong": the most visually prominent part (the fully-opaque area, meant to be the clearest) was just as blurred as the fading-out edge. Splitting into two duplicate layers — one blurred+masked to only the near-copy transition zone, one crisp+masked to only the far, fully-visible zone — approximates a gradual depth-of-field falloff: blurry where it's fading in, perfectly sharp where it's fully visible.

- [ ] **Step 1: Replace the ambient/piece markup**

In `src/components/TetrisHero.astro`, replace the top of the template (currently lines 1-4):

```html
<div class="tetris-hero" id="tetris-hero">
  <div class="tetris-ambient" id="tetris-ambient" aria-hidden="true" role="presentation"></div>
  <div class="tetris-piece" id="tetris-piece" aria-hidden="true"></div>
  <button id="tetris-open" class="tetris-open-btn" aria-label="Play Tetris" type="button"></button>
```

with:

```html
<div class="tetris-hero" id="tetris-hero">
  <div class="tetris-ambient-soft" id="tetris-ambient-soft" aria-hidden="true" role="presentation"></div>
  <div class="tetris-ambient-crisp" id="tetris-ambient-crisp" aria-hidden="true" role="presentation"></div>
  <div class="tetris-piece" id="tetris-piece" aria-hidden="true">
    <div class="piece-layer-soft" id="tetris-piece-soft"></div>
    <div class="piece-layer-crisp" id="tetris-piece-crisp"></div>
  </div>
  <button id="tetris-open" class="tetris-open-btn" aria-label="Play Tetris" type="button"></button>
```

- [ ] **Step 2: Replace the ambient/piece CSS**

Replace the `.tetris-board` color-variable block through `.tetris-piece.phase-fall :global(.cell)` (currently lines 34-84) with:

```css
  .tetris-board {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 1px;
    background: var(--color-text-secondary);
    width: 200px;
    aspect-ratio: 10 / 20;
  }
  .tetris-ambient-soft, .tetris-ambient-crisp {
    position: absolute;
    inset: 0;
    display: grid;
    gap: 1px;
    background: var(--color-text-secondary);
  }
  .tetris-ambient-soft {
    filter: blur(4px);
    opacity: 0.85;
    mask-image: linear-gradient(90deg, transparent 0%, transparent 8%, black 45%);
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 8%, black 45%);
  }
  .tetris-ambient-crisp {
    opacity: 0.9;
    mask-image: linear-gradient(90deg, transparent 0%, transparent 40%, black 80%);
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 40%, black 80%);
  }
  /* :global() is required here because the grid cells are created at
     runtime via document.createElement (see the script above), so they
     never receive Astro's scoped data-astro-cid attribute and would
     otherwise not match these rules at all. */
  .tetris-ambient-soft :global(div), .tetris-ambient-crisp :global(div),
  .tetris-board :global(div), .tetris-piece :global(.cell) { background: var(--color-bg); }
  .tetris-ambient-soft :global(div[data-piece='I']), .tetris-ambient-crisp :global(div[data-piece='I']), .tetris-board :global(div[data-piece='I']), .tetris-piece :global(.cell[data-piece='I']) { background: var(--tetris-i); }
  .tetris-ambient-soft :global(div[data-piece='O']), .tetris-ambient-crisp :global(div[data-piece='O']), .tetris-board :global(div[data-piece='O']), .tetris-piece :global(.cell[data-piece='O']) { background: var(--tetris-o); }
  .tetris-ambient-soft :global(div[data-piece='T']), .tetris-ambient-crisp :global(div[data-piece='T']), .tetris-board :global(div[data-piece='T']), .tetris-piece :global(.cell[data-piece='T']) { background: var(--tetris-t); }
  .tetris-ambient-soft :global(div[data-piece='J']), .tetris-ambient-crisp :global(div[data-piece='J']), .tetris-board :global(div[data-piece='J']), .tetris-piece :global(.cell[data-piece='J']) { background: var(--tetris-j); }
  .tetris-ambient-soft :global(div[data-piece='S']), .tetris-ambient-crisp :global(div[data-piece='S']), .tetris-board :global(div[data-piece='S']), .tetris-piece :global(.cell[data-piece='S']) { background: var(--color-accent-moss); }
  .tetris-ambient-soft :global(div[data-piece='Z']), .tetris-ambient-crisp :global(div[data-piece='Z']), .tetris-board :global(div[data-piece='Z']), .tetris-piece :global(.cell[data-piece='Z']) { background: var(--color-accent-maroon); }
  .tetris-ambient-soft :global(div[data-piece='L']), .tetris-ambient-crisp :global(div[data-piece='L']), .tetris-board :global(div[data-piece='L']), .tetris-piece :global(.cell[data-piece='L']) { background: var(--color-accent-clay); }
  .tetris-ambient-soft :global(div.flashing), .tetris-ambient-crisp :global(div.flashing) { background: var(--color-bg) !important; }

  .tetris-piece {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .piece-layer-soft, .piece-layer-crisp {
    position: absolute;
    inset: 0;
  }
  .piece-layer-soft {
    filter: blur(4px);
    opacity: 0.85;
    mask-image: linear-gradient(90deg, transparent 0%, transparent 8%, black 45%);
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 8%, black 45%);
  }
  .piece-layer-crisp {
    opacity: 0.9;
    mask-image: linear-gradient(90deg, transparent 0%, transparent 40%, black 80%);
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 40%, black 80%);
  }
  .piece-layer-soft :global(.cell), .piece-layer-crisp :global(.cell) {
    position: absolute;
    border-radius: 1px;
  }
  .tetris-piece.phase-turn .piece-layer-soft :global(.cell),
  .tetris-piece.phase-turn .piece-layer-crisp :global(.cell) {
    transition: left 0.35s ease, top 0.35s ease;
  }
  .tetris-piece.phase-fall .piece-layer-soft :global(.cell),
  .tetris-piece.phase-fall .piece-layer-crisp :global(.cell) {
    transition: top 0.45s ease-in;
  }
```

(This keeps the existing `ease`/`ease-in` timings for now — Task 7 replaces them with the stepped, blocky timing.)

- [ ] **Step 3: Update the script to drive both ambient layers and both piece layers**

Replace the element lookups near the top of the script (currently lines 111-116):

```ts
  const ambientEl = document.getElementById('tetris-ambient')!;
  const boardEl = document.getElementById('tetris-board')!;
```

with:

```ts
  const ambientSoftEl = document.getElementById('tetris-ambient-soft')!;
  const ambientCrispEl = document.getElementById('tetris-ambient-crisp')!;
  const boardEl = document.getElementById('tetris-board')!;
```

(leave `scoreEl`/`overlay`/`openBtn`/`closeBtn`/`reducedMotion` as they are.)

Update every reference to `ambientEl` for sizing (from Task 5) to use `ambientSoftEl` as the measurement source, and mirror the grid template onto both layers. Replace Task 5's block with:

```ts
  const CELL_SIZE = 44;
  const GAP = 1;
  const ambientCols = Math.max(4, Math.floor((ambientSoftEl.clientWidth + GAP) / (CELL_SIZE + GAP)));
  const ambientRows = Math.max(4, Math.floor((ambientSoftEl.clientHeight + GAP) / (CELL_SIZE + GAP)));
  ambientSoftEl.style.gridTemplateColumns = `repeat(${ambientCols}, 1fr)`;
  ambientCrispEl.style.gridTemplateColumns = `repeat(${ambientCols}, 1fr)`;
  const cellW = (ambientSoftEl.clientWidth - (ambientCols - 1) * GAP) / ambientCols;
  const cellH = (ambientSoftEl.clientHeight - (ambientRows - 1) * GAP) / ambientRows;

  let ambientState = createAmbientDemo(ambientCols, ambientRows);
  let ambientStep = 0;
  renderBoard(ambientSoftEl, ambientState);
  renderBoard(ambientCrispEl, ambientState);
```

Replace the piece-cell setup (currently `const pieceEl = ...` through `positionPieceCells`, lines 142-167) with a two-layer version:

```ts
  const pieceEl = document.getElementById('tetris-piece')!;
  const pieceSoftEl = document.getElementById('tetris-piece-soft')!;
  const pieceCrispEl = document.getElementById('tetris-piece-crisp')!;
  const TURN_MS = 350;
  const FALL_MS = 450;
  const PAUSE_MS = 200;
  let pieceCellsSoft: HTMLElement[] = [];
  let pieceCellsCrisp: HTMLElement[] = [];

  function initPieceCells(el: HTMLElement, type: string): HTMLElement[] {
    el.innerHTML = '';
    return Array.from({ length: 4 }, () => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.piece = type;
      el.appendChild(cell);
      return cell;
    });
  }

  function positionPieceCells(cells: HTMLElement[], coords: number[][]) {
    coords.forEach(([x, y], i) => {
      const cell = cells[i];
      cell.style.width = `${cellW}px`;
      cell.style.height = `${cellH}px`;
      cell.style.left = `${x * cellW}px`;
      cell.style.top = `${y * cellH}px`;
    });
  }
```

Update `runAmbientCycle` to drive both piece layers (currently lines 169-213):

```ts
  function runAmbientCycle() {
    const spawnPiece: Piece = { ...ambientState.current, rotation: 0, y: 0 };
    pieceCellsSoft = initPieceCells(pieceSoftEl, spawnPiece.type);
    pieceCellsCrisp = initPieceCells(pieceCrispEl, spawnPiece.type);
    pieceEl.classList.remove('phase-fall');
    pieceEl.classList.add('phase-turn');
    positionPieceCells(pieceCellsSoft, cellsFor(spawnPiece));
    positionPieceCells(pieceCellsCrisp, cellsFor(spawnPiece));

    const placement = chooseBestPlacement(ambientState);
    const landingY = landingRow(ambientState.board, {
      ...ambientState.current,
      rotation: placement.rotation,
      x: placement.x,
    });

    requestAnimationFrame(() => {
      const turned = { ...spawnPiece, rotation: placement.rotation, x: placement.x };
      positionPieceCells(pieceCellsSoft, cellsFor(turned));
      positionPieceCells(pieceCellsCrisp, cellsFor(turned));
    });

    window.setTimeout(() => {
      pieceEl.classList.remove('phase-turn');
      pieceEl.classList.add('phase-fall');
      const landed = { ...spawnPiece, rotation: placement.rotation, x: placement.x, y: landingY };
      positionPieceCells(pieceCellsSoft, cellsFor(landed));
      positionPieceCells(pieceCellsCrisp, cellsFor(landed));
    }, TURN_MS);

    window.setTimeout(() => {
      ambientState = stepAmbientDemo(ambientState, ambientStep++).state;
      renderBoard(ambientSoftEl, ambientState);
      renderBoard(ambientCrispEl, ambientState);
      pieceSoftEl.innerHTML = '';
      pieceCrispEl.innerHTML = '';
      window.setTimeout(runAmbientCycle, PAUSE_MS);
    }, TURN_MS + FALL_MS);
  }
```

- [ ] **Step 4: Update the Tetris e2e spec for the new piece-layer structure**

In `tests/e2e/tetris.spec.ts`, replace the last test (currently lines 41-52):

```ts
test('desktop: ambient piece animates from spawn through fall before merging', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const piece = page.locator('#tetris-piece');
  await expect(piece.locator('.cell')).toHaveCount(4);

  const spawnTop = await piece.locator('.cell').first().evaluate((el) => (el as HTMLElement).style.top);
  await page.waitForTimeout(700); // safely inside the fall phase (350ms turn + up to 450ms fall = 800ms merge point); avoids the 800-1000ms window where #tetris-piece is briefly empty between merge and the next spawn
  const laterTop = await piece.locator('.cell').first().evaluate((el) => (el as HTMLElement).style.top);
  expect(laterTop).not.toBe(spawnTop);
});
```

with:

```ts
test('desktop: ambient piece animates from spawn through fall before merging', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  // #tetris-piece now wraps two layers (blurred + crisp) for the gradual
  // depth-of-field fade — check the crisp layer specifically, which is the
  // one that's fully opaque and visible across most of the widget.
  const crispLayer = page.locator('#tetris-piece-crisp');
  await expect(crispLayer.locator('.cell')).toHaveCount(4);

  const spawnTop = await crispLayer.locator('.cell').first().evaluate((el) => (el as HTMLElement).style.top);
  await page.waitForTimeout(700); // safely inside the fall phase (350ms turn + up to 450ms fall = 800ms merge point); avoids the 800-1000ms window where the piece layers are briefly empty between merge and the next spawn
  const laterTop = await crispLayer.locator('.cell').first().evaluate((el) => (el as HTMLElement).style.top);
  expect(laterTop).not.toBe(spawnTop);
});
```

- [ ] **Step 5: Run the build and the Tetris e2e spec**

Run: `npm run build && npm run test:e2e -- tetris.spec.ts`
Expected: both PASS.

- [ ] **Step 6: Manual visual check**

Run: `npm run dev`, open `http://localhost:4321/` at a desktop width. Confirm: the far-right portion of the widget (away from the hero copy) is now sharp/crisp with no blur at all, the blur is only visible in the zone closest to the hero copy, and the transition between the two feels gradual rather than a single sudden blurred band.

- [ ] **Step 7: Commit**

```bash
git add src/components/TetrisHero.astro tests/e2e/tetris.spec.ts
git commit -m "feat(tetris): layer soft/crisp masks for a gradual ambient blur falloff"
```

---

## Task 7: TetrisHero — blocky-but-fast motion, and the CLAUDE.md doc update

**Files:**
- Modify: `src/components/TetrisHero.astro`
- Modify: `tests/e2e/tetris.spec.ts`
- Modify: `/mnt/c/Users/johnn/projects/website/.claude/worktrees/website-revamp/CLAUDE.md`

**Interfaces:**
- Consumes: `.piece-layer-soft`/`.piece-layer-crisp` CSS selectors, `TURN_MS`/`FALL_MS` constants (Task 6).
- Produces: nothing new for later tasks — this is a leaf change to timing/easing only.

**Decision context:** the user confirmed reversing CLAUDE.md's "all four hobby details use standard smooth CSS easing" ruling, scoped narrowly to the Tetris ambient piece only (not the capybara, Minesweeper, or butterfly-knife toggle) — turn/horizontal motion gets discrete `steps()` snapping, and the fall phase stays blocky too but sped up, closer to how a real piece looks when a player holds down soft-drop.

- [ ] **Step 1: Replace the turn/fall transition CSS**

In `src/components/TetrisHero.astro`, replace (from Task 6):

```css
  .tetris-piece.phase-turn .piece-layer-soft :global(.cell),
  .tetris-piece.phase-turn .piece-layer-crisp :global(.cell) {
    transition: left 0.35s ease, top 0.35s ease;
  }
  .tetris-piece.phase-fall .piece-layer-soft :global(.cell),
  .tetris-piece.phase-fall .piece-layer-crisp :global(.cell) {
    transition: top 0.45s ease-in;
  }
```

with:

```css
  .tetris-piece.phase-turn .piece-layer-soft :global(.cell),
  .tetris-piece.phase-turn .piece-layer-crisp :global(.cell) {
    transition: left 0.3s steps(3, end), top 0.3s steps(3, end);
  }
  .tetris-piece.phase-fall .piece-layer-soft :global(.cell),
  .tetris-piece.phase-fall .piece-layer-crisp :global(.cell) {
    transition: top 0.22s steps(6, end);
  }
```

- [ ] **Step 2: Update the matching JS timing constants**

Replace (from Task 6):

```ts
  const TURN_MS = 350;
  const FALL_MS = 450;
```

with:

```ts
  const TURN_MS = 300;
  const FALL_MS = 220;
```

- [ ] **Step 3: Update the e2e spec's timing comment/wait to match**

In `tests/e2e/tetris.spec.ts`, in the test updated by Task 6, replace:

```ts
  await page.waitForTimeout(700); // safely inside the fall phase (350ms turn + up to 450ms fall = 800ms merge point); avoids the 800-1000ms window where the piece layers are briefly empty between merge and the next spawn
```

with:

```ts
  await page.waitForTimeout(450); // safely inside the fall phase (300ms turn + up to 220ms fall = 520ms merge point); avoids the 520-720ms window where the piece layers are briefly empty between merge and the next spawn
```

- [ ] **Step 4: Update CLAUDE.md**

In `/mnt/c/Users/johnn/projects/website/.claude/worktrees/website-revamp/CLAUDE.md`, find this line (in the "Hobby details" section):

```
All four use standard smooth CSS easing — a "stepped/frame-based" motion
language was tried and explicitly rejected as janky.
```

Replace with:

```
The capybara, Minesweeper reveal, and butterfly-knife toggle all use
standard smooth CSS easing — a "stepped/frame-based" motion language across
all four details was tried and explicitly rejected as janky. The Tetris
ambient piece is a narrower, deliberate exception to that default (not a
reversal of it): its turn/fall transitions use CSS `steps()` timing instead
of smooth easing, snapping row-by-row for a blocky, snap-to-grid feel that
reads as more authentically Tetris — the fall phase in particular is sped
up (not just stepped) to feel like a piece being soft-dropped rather than
gliding down.

The ambient loop also plays real wall kicks and awards a T-spin score bonus
(`isTSpin` in `engine.ts`, gated on `GameState.lastMoveWasRotation`), builds
its stack up to at least 50% of board height before its heuristic starts
rewarding line clears (`BUILD_UP_HEIGHT_RATIO` in `ambientDemo.ts`), and
never resets below that same 50% floor even in a hole-heavy ("unfavorable")
position — resets only trigger at or above it. Cleared rows flash a few
times before disappearing (`stepAmbientDemo`'s `clearedRows`/`preClearBoard`,
consumed in `TetrisHero.astro`'s `runAmbientCycle`).
```

- [ ] **Step 5: Run the build and the Tetris e2e spec**

Run: `npm run build && npm run test:e2e -- tetris.spec.ts`
Expected: both PASS.

- [ ] **Step 6: Manual visual check**

Run: `npm run dev`, open `http://localhost:4321/`. Watch a few ambient cycles — pieces should visibly snap between a few discrete positions per move/rotate rather than gliding continuously, and the fall should feel quick, more like a hard/soft drop than a slow float.

- [ ] **Step 7: Commit**

```bash
git add src/components/TetrisHero.astro tests/e2e/tetris.spec.ts CLAUDE.md
git commit -m "feat(tetris): blocky, sped-up ambient motion; document the scoped easing exception"
```

---

## Task 8: TetrisHero — flash cleared rows before they disappear

**Files:**
- Modify: `src/components/TetrisHero.astro`

**Interfaces:**
- Consumes: `AmbientStepResult` (`state`, `preClearBoard`, `clearedRows`) from `stepAmbientDemo` (Task 4); `ambientSoftEl`/`ambientCrispEl`/`ambientCols`/`renderBoard` (Task 6).
- Produces: nothing consumed by later tasks — this is the last task in the plan.

- [ ] **Step 1: Add a `flashRows` helper and wire it into the final `setTimeout` of `runAmbientCycle`**

In `src/components/TetrisHero.astro`, add near the other ambient constants (alongside `TURN_MS`/`FALL_MS`/`PAUSE_MS`):

```ts
  const FLASH_CYCLES = 3;
  const FLASH_INTERVAL_MS = 90;

  function flashRows(rows: number[]): Promise<void> {
    if (rows.length === 0) return Promise.resolve();
    const cellsInRows = (el: HTMLElement): HTMLElement[] =>
      rows.flatMap((r) =>
        Array.from(el.children).slice(r * ambientCols, r * ambientCols + ambientCols) as HTMLElement[]
      );
    const targets = [...cellsInRows(ambientSoftEl), ...cellsInRows(ambientCrispEl)];
    let tick = 0;
    return new Promise((resolve) => {
      const step = () => {
        targets.forEach((el) => el.classList.toggle('flashing'));
        tick++;
        if (tick >= FLASH_CYCLES * 2) {
          targets.forEach((el) => el.classList.remove('flashing'));
          resolve();
          return;
        }
        window.setTimeout(step, FLASH_INTERVAL_MS);
      };
      step();
    });
  }
```

Replace the final `window.setTimeout` in `runAmbientCycle` (from Task 6/7):

```ts
    window.setTimeout(() => {
      ambientState = stepAmbientDemo(ambientState, ambientStep++).state;
      renderBoard(ambientSoftEl, ambientState);
      renderBoard(ambientCrispEl, ambientState);
      pieceSoftEl.innerHTML = '';
      pieceCrispEl.innerHTML = '';
      window.setTimeout(runAmbientCycle, PAUSE_MS);
    }, TURN_MS + FALL_MS);
```

with:

```ts
    window.setTimeout(async () => {
      const stepResult = stepAmbientDemo(ambientState, ambientStep++);
      if (stepResult.clearedRows.length > 0) {
        renderBoard(ambientSoftEl, { ...ambientState, board: stepResult.preClearBoard });
        renderBoard(ambientCrispEl, { ...ambientState, board: stepResult.preClearBoard });
        await flashRows(stepResult.clearedRows);
      }
      ambientState = stepResult.state;
      renderBoard(ambientSoftEl, ambientState);
      renderBoard(ambientCrispEl, ambientState);
      pieceSoftEl.innerHTML = '';
      pieceCrispEl.innerHTML = '';
      window.setTimeout(runAmbientCycle, PAUSE_MS);
    }, TURN_MS + FALL_MS);
```

(The `.flashing` CSS rule toggled here — `background: var(--color-bg) !important` on `.tetris-ambient-soft`/`.tetris-ambient-crisp` cells — was already added in Task 6, since it lives next to the rest of that layer's color rules.)

- [ ] **Step 2: Run the build and the full Tetris e2e spec**

Run: `npm run build && npm run test:e2e -- tetris.spec.ts`
Expected: both PASS — none of the 4 tests in this file assert on the flash behavior directly, and the `async`/`await` inside the `setTimeout` callback doesn't change any externally-observable timing the other tests depend on (the merge point is still `TURN_MS + FALL_MS` after spawn; the flash, if any, happens strictly after that point, and the next spawn is delayed by however long the flash takes, which the existing tests don't wait for).

- [ ] **Step 3: Run the full test suite**

Run: `npm run test:all`
Expected: PASS (unit + build + full e2e, including the accessibility sweep — the flash only toggles a `background` color via a class, doesn't add/remove `aria-hidden`, so it shouldn't trip axe-core).

- [ ] **Step 4: Manual visual check**

Run: `npm run dev`, open `http://localhost:4321/` at a desktop width, and watch until the ambient stack builds up enough to clear a line (this now takes longer than before, per Task 4 — be patient, or temporarily lower `BUILD_UP_HEIGHT_RATIO` locally to `0.1` to see it sooner, then revert). Confirm the completed row(s) visibly blink a few times before vanishing, rather than disappearing instantly.

- [ ] **Step 5: Commit**

```bash
git add src/components/TetrisHero.astro
git commit -m "feat(tetris): flash cleared rows before they disappear in the ambient loop"
```

---

## Self-Review Notes

- **Spec coverage:** gradual blur (Task 6), widget width / no-cutoff (Task 5's exact-cell-size fix — width itself stays 70%, unchanged, since the fix removes the actual cause of cutoff regardless of width), larger pieces (Task 5), blocky-but-not-too-smooth motion (Task 7), T-spins / more realistic behavior (Task 1), build the board up more before clearing (Task 4), reset floor at 50%-to-top and no lower (Task 4), flash-in/out on clear (Task 8) — all 7 asks map to a task.
- **Placeholder scan:** every step has real, hand-verified code and concrete test assertions — no "add error handling" or "similar to Task N" placeholders.
- **Type consistency:** `AmbientStepResult` (Task 4) is used identically in Task 8; `cellW`/`cellH` (Task 5) carry through unchanged into Task 6; `GameState.lastMoveWasRotation` (Task 1) is never read outside `engine.ts` itself, so no cross-file name drift risk there.
