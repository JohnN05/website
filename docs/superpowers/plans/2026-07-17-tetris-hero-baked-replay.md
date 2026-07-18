# Tetris Hero Baked AI-Replay Player — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `TetrisHero.astro`'s live per-second AI loop (which rebuilds the whole board DOM and re-blurs a 70%-viewport surface 2–4×/sec) with a player that replays one pre-recorded full game, eliminating the ongoing large-surface reblur while keeping real-AI-looking falling motion.

**Architecture:** An offline recorder runs the existing deterministic ambient demo (`ambientDemo.ts`) at a fixed grid and dumps one game (spawn→top-out) as a compact per-piece event array into a checked-in data module. At runtime a tiny player walks that array on the current cadence: it moves a pre-blurred piece wrapper with `transform` (cached raster, no reblur per step) and updates only the cells that change when a piece locks. Pause guards freeze it off-screen / when backgrounded.

**Tech Stack:** Astro component `<script>`, TypeScript, existing `src/lib/tetris/engine.ts` helpers (`boardWithPiece`, `fullRowIndices`, `cellsFor`, `landingRow`), Vitest (unit), Playwright + axe (e2e).

## Global Constraints

- Grid is fixed at **16 columns × 14 rows** (`COLS_H = 16`, `ROWS_H = 14`) — chosen empirically: this seed/grid yields a 124-piece game with 24 line-clears ending on a genuine top-out, at ~current cell density. Cells scale to fill the hero via `1fr`; wider window = bigger blocks, same count.
- No changes to `engine.ts`, `autoplay.ts`, `bag.ts`, `ambientDemo.ts` logic — the recorder *uses* them unchanged.
- Preserve: soft(blurred)+crisp(sharp) depth-of-field, the hand-tuned `--tetris-mask-*` gradient stops, `prefers-reduced-motion` freeze-on-static-frame, the `#tetris-piece` `data-cycle` e2e hook, mobile `display:none` gate derived from the container box (not a second hardcoded breakpoint).
- Repo two-layer rule: pure logic in `src/lib/`, DOM wiring in the component `<script>`. Runtime-created cells need `:global()` scoping.
- Cadence constants stay: `TURN_MS = 300`, `FALL_MS = 220`, `PAUSE_MS = 200`, `FLASH_CYCLES = 3`, `FLASH_INTERVAL_MS = 90`.
- Gate: `npm run test:all` (typecheck + unit + build + e2e/axe). E2e needs the local `LD_LIBRARY_PATH` workaround already baked into the npm scripts.

## File Structure

- Create `src/lib/tetris/recordReplay.ts` — `PieceEvent` type, `Recording` type, `recordGame(cols, rows)`, `applyReplayEvent(board, ev)`, `emptyBoard(cols, rows)`. Pure, no DOM.
- Create `src/lib/tetris/recordReplay.test.ts` — unit tests for the above.
- Create `src/lib/tetris/heroReplay.ts` — **generated** data module: `COLS_H`, `ROWS_H`, `REPLAY: PieceEvent[]`. Header comment documents the regenerating command.
- Create `src/lib/tetris/heroReplay.test.ts` — drift guard: committed data deep-equals a fresh `recordGame(16, 14)`.
- Modify `src/components/TetrisHero.astro` — full rewrite of `<script>` and the piece-layer `<style>` to the fixed-grid replay player with a transform-moved blurred wrapper and pause guards.
- Modify `tests/e2e/` — a hero replay spec (loop restart, data-cycle, reduced-motion freeze, off-screen pause). Check existing `tests/e2e/accessibility.spec.ts` for the reduced-motion assertion that must still pass.

---

### Task 1: Recorder — `recordGame`

**Files:**
- Create: `src/lib/tetris/recordReplay.ts`
- Test: `src/lib/tetris/recordReplay.test.ts`

**Interfaces:**
- Consumes: `createAmbientDemo`, `stepAmbientDemo` (from `./ambientDemo`); `chooseBestPlacement` (from `./autoplay`); `landingRow`, `type Cell`, `type PieceType` (from `./engine`).
- Produces:
  - `interface PieceEvent { type: PieceType; rotation: number; spawnX: number; x: number; landingY: number; clearedRows: number[]; }`
  - `interface Recording { cols: number; rows: number; pieces: PieceEvent[]; }`
  - `function recordGame(cols: number, rows: number): Recording`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/tetris/recordReplay.test.ts
import { describe, it, expect } from 'vitest';
import { recordGame, type PieceEvent } from './recordReplay';

const PIECES = new Set(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);

describe('recordGame', () => {
  const rec = recordGame(16, 14);

  it('records a non-trivial game that ends on a genuine top-out', () => {
    // Loop terminates because the board topped out, not because it hit the
    // 4000-step safety cap. A real game here is ~124 pieces.
    expect(rec.pieces.length).toBeGreaterThan(30);
    expect(rec.pieces.length).toBeLessThan(4000);
    expect(rec.cols).toBe(16);
    expect(rec.rows).toBe(14);
  });

  it('every event is structurally valid', () => {
    for (const ev of rec.pieces) {
      expect(PIECES.has(ev.type)).toBe(true);
      expect(ev.rotation).toBeGreaterThanOrEqual(0);
      expect(ev.rotation).toBeLessThanOrEqual(3);
      expect(ev.x).toBeGreaterThanOrEqual(0);
      expect(ev.x).toBeLessThan(16);
      expect(ev.spawnX).toBeGreaterThanOrEqual(0);
      expect(ev.spawnX).toBeLessThan(16);
      expect(ev.landingY).toBeGreaterThanOrEqual(0);
      expect(ev.landingY).toBeLessThan(14);
      const sorted = [...ev.clearedRows].sort((a, b) => a - b);
      expect(ev.clearedRows).toEqual(sorted);
      for (const r of ev.clearedRows) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(14);
      }
    }
  });

  it('contains at least one line clear (the build-up-then-clear payoff)', () => {
    const totalCleared = rec.pieces.reduce((n, ev) => n + ev.clearedRows.length, 0);
    expect(totalCleared).toBeGreaterThan(0);
  });

  it('is deterministic across runs', () => {
    expect(recordGame(16, 14)).toEqual(rec);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tetris/recordReplay.test.ts`
Expected: FAIL — `recordGame` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/tetris/recordReplay.ts
import { createAmbientDemo, stepAmbientDemo } from './ambientDemo';
import { chooseBestPlacement } from './autoplay';
import { landingRow, type Cell, type PieceType } from './engine';

export interface PieceEvent {
  /** Tetromino identity — drives cell color. */
  type: PieceType;
  /** Final rotation the piece spawns and locks in (0..3). The live loop never
      animates rotation, only a horizontal slide, so this is constant across a
      piece's whole flight. */
  rotation: number;
  /** Column the piece spawns at (before the turn-phase slide). */
  spawnX: number;
  /** Column the piece slides to during the turn phase and locks at. */
  x: number;
  /** Row the piece's origin locks at. */
  landingY: number;
  /** Rows cleared after this lock, ascending. */
  clearedRows: number[];
}

export interface Recording {
  cols: number;
  rows: number;
  pieces: PieceEvent[];
}

/**
 * Runs the existing deterministic ambient demo one full game — from the opening
 * piece until a genuine top-out resets the board — and records the minimum per
 * piece for a runtime player to reproduce spawn -> turn-slide -> fall -> lock ->
 * clear. Pure: no DOM, no module-level state (the demo's PRNG is seeded per
 * step), so it always returns the same Recording for the same (cols, rows).
 */
export function recordGame(cols: number, rows: number): Recording {
  let state = createAmbientDemo(cols, rows);
  const pieces: PieceEvent[] = [];

  for (let step = 0; step < 4000; step++) {
    // Resolve placement identically to how stepAmbientDemo will below, and
    // derive landingY from the CURRENT (pre-lock) board exactly as
    // TetrisHero.astro does at runtime — so the recorded coordinates match a
    // fresh replay fold (see applyReplayEvent).
    const placement = chooseBestPlacement(state);
    const spawnX = state.current.x;
    const type = state.current.type;
    const landingY = landingRow(state.board, {
      ...state.current,
      rotation: placement.rotation,
      x: placement.x,
    });

    const result = stepAmbientDemo(state, step);
    pieces.push({
      type,
      rotation: placement.rotation,
      spawnX,
      x: placement.x,
      landingY,
      clearedRows: result.clearedRows,
    });

    // stepAmbientDemo silently resets to a fresh empty board on a genuine
    // top-out, so the first post-step board with zero filled cells is the
    // top-out. Record the piece that caused it, then stop.
    const filled = result.state.board.reduce(
      (n: number, row: Cell[]) => n + row.filter(Boolean).length,
      0
    );
    if (filled === 0 && step > 0) break;
    state = result.state;
  }

  return { cols, rows, pieces };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tetris/recordReplay.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tetris/recordReplay.ts src/lib/tetris/recordReplay.test.ts
git commit -m "feat(tetris): record one ambient game to a replay event array"
```

---

### Task 2: Replay board reducer — `applyReplayEvent`

**Files:**
- Modify: `src/lib/tetris/recordReplay.ts`
- Test: `src/lib/tetris/recordReplay.test.ts`

**Interfaces:**
- Consumes: `boardWithPiece`, `fullRowIndices`, `type Cell` (from `./engine`); `PieceEvent`, `recordGame` (from this module).
- Produces:
  - `function emptyBoard(cols: number, rows: number): Cell[][]`
  - `function applyReplayEvent(board: Cell[][], ev: PieceEvent): Cell[][]`

This reducer lets the runtime player rebuild the settled board from events (we record only per-piece deltas, not full board snapshots). Its fold over the whole recording must reproduce the exact `clearedRows` the recorder saw — that invariant is the strongest proof the data is playable.

- [ ] **Step 1: Write the failing test (append to `recordReplay.test.ts`)**

```ts
import { emptyBoard, applyReplayEvent } from './recordReplay';
import { boardWithPiece, fullRowIndices } from './engine';

describe('applyReplayEvent', () => {
  it('emptyBoard is rows x cols of nulls', () => {
    const b = emptyBoard(16, 14);
    expect(b.length).toBe(14);
    expect(b[0].length).toBe(16);
    expect(b.flat().every((c) => c === null)).toBe(true);
  });

  it('folding the recording reproduces every recorded clearedRows', () => {
    const rec = recordGame(16, 14);
    let board = emptyBoard(rec.cols, rec.rows);
    for (const ev of rec.pieces) {
      // The clear the player would compute from its own reconstructed board
      // must equal what the recorder captured — otherwise the settled board
      // would drift from the recorded flight and pieces would land wrong.
      const placed = boardWithPiece(board, {
        type: ev.type, rotation: ev.rotation, x: ev.x, y: ev.landingY,
      });
      expect(fullRowIndices(placed)).toEqual(ev.clearedRows);
      board = applyReplayEvent(board, ev);
    }
  });

  it('clears full rows and drops the stack', () => {
    // A board one cell short of a full bottom row; drop an O to complete it.
    let board = emptyBoard(4, 4);
    // Fill bottom row except the last two columns.
    board[3] = ['I', 'I', null, null];
    board[2] = ['I', 'I', null, null];
    const ev: PieceEvent = {
      type: 'O', rotation: 0, spawnX: 2, x: 2, landingY: 2, clearedRows: [3],
    };
    const after = applyReplayEvent(board, ev);
    expect(after.length).toBe(4);
    // Row 3 (was full) cleared; a new empty row is unshifted at the top.
    expect(after[0].every((c) => c === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tetris/recordReplay.test.ts`
Expected: FAIL — `emptyBoard` / `applyReplayEvent` not exported.

- [ ] **Step 3: Write minimal implementation (append to `recordReplay.ts`)**

```ts
import { boardWithPiece, fullRowIndices } from './engine';

export function emptyBoard(cols: number, rows: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null as Cell)
  );
}

/**
 * Locks a recorded piece into the settled board and clears any full rows,
 * dropping the stack — the pure board half of what the runtime player renders.
 * clearedRows is recomputed here rather than trusted from the event so the
 * player never depends on the recorder agreeing with it; the fold-consistency
 * test proves they do agree for the committed recording.
 */
export function applyReplayEvent(board: Cell[][], ev: PieceEvent): Cell[][] {
  const cols = board[0].length;
  const placed = boardWithPiece(board, {
    type: ev.type,
    rotation: ev.rotation,
    x: ev.x,
    y: ev.landingY,
  });
  const full = fullRowIndices(placed);
  if (full.length === 0) return placed;
  const fullSet = new Set(full);
  const kept = placed.filter((_, y) => !fullSet.has(y));
  const empties = Array.from({ length: full.length }, () =>
    Array.from({ length: cols }, () => null as Cell)
  );
  return [...empties, ...kept];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tetris/recordReplay.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tetris/recordReplay.ts src/lib/tetris/recordReplay.test.ts
git commit -m "feat(tetris): pure replay board reducer with fold-consistency guard"
```

---

### Task 3: Generate and commit the baked recording

**Files:**
- Create: `src/lib/tetris/heroReplay.ts` (generated)
- Test: `src/lib/tetris/heroReplay.test.ts`

**Interfaces:**
- Consumes: `recordGame` (from `./recordReplay`).
- Produces: `const COLS_H: number`, `const ROWS_H: number`, `const REPLAY: PieceEvent[]` (from `./heroReplay`).

- [ ] **Step 1: Generate the data with a throwaway dump**

Create `src/lib/tetris/_dump.test.ts`:

```ts
import { test } from 'vitest';
import { recordGame } from './recordReplay';

test('dump hero replay', () => {
  const rec = recordGame(16, 14);
  console.log('DUMP_START');
  console.log(JSON.stringify(rec.pieces));
  console.log('DUMP_END');
  console.log('COUNT', rec.pieces.length);
});
```

Run: `npx vitest run src/lib/tetris/_dump.test.ts 2>&1 | sed -n '/DUMP_START/,/DUMP_END/p'`
Copy the single JSON array line between the markers.

- [ ] **Step 2: Write `heroReplay.ts` with the generated array**

Paste the copied JSON as the `REPLAY` initializer (it is a valid TS array literal):

```ts
// src/lib/tetris/heroReplay.ts
//
// GENERATED — do not hand-edit. Regenerate after any change to the engine,
// autoplay heuristic, bag, or grid dimensions:
//
//   npx vitest run src/lib/tetris/_dump.test.ts \
//     2>&1 | sed -n '/DUMP_START/,/DUMP_END/p'
//
// then paste the JSON array below and run `npx vitest run
// src/lib/tetris/heroReplay.test.ts` to confirm the drift guard passes.
//
// One full deterministic game on a 16x14 grid: ~124 pieces, ends on a genuine
// top-out (see docs/superpowers/specs/2026-07-17-tetris-hero-baked-replay-design.md).
import type { PieceEvent } from './recordReplay';

export const COLS_H = 16;
export const ROWS_H = 14;

export const REPLAY: PieceEvent[] = [/* <paste JSON array here> */];
```

- [ ] **Step 3: Delete the throwaway dump**

```bash
rm src/lib/tetris/_dump.test.ts
```

- [ ] **Step 4: Write the drift-guard test**

```ts
// src/lib/tetris/heroReplay.test.ts
import { describe, it, expect } from 'vitest';
import { recordGame } from './recordReplay';
import { COLS_H, ROWS_H, REPLAY } from './heroReplay';

describe('heroReplay committed data', () => {
  it('matches a fresh recording for the committed grid', () => {
    const fresh = recordGame(COLS_H, ROWS_H);
    expect(REPLAY).toEqual(fresh.pieces);
  });

  it('ends on a top-out (last event is the final lock, not the safety cap)', () => {
    expect(REPLAY.length).toBeGreaterThan(30);
    expect(REPLAY.length).toBeLessThan(4000);
  });
});
```

- [ ] **Step 5: Run to verify the guard passes**

Run: `npx vitest run src/lib/tetris/heroReplay.test.ts`
Expected: PASS (2 tests). A mismatch means the pasted array drifted from the generator — regenerate.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tetris/heroReplay.ts src/lib/tetris/heroReplay.test.ts
git commit -m "feat(tetris): bake the recorded hero game as committed data"
```

---

### Task 4: Component rewrite — fixed-grid replay player

**Files:**
- Modify: `src/components/TetrisHero.astro` (full `<script>` rewrite; piece-layer `<style>` restructure)

**Interfaces:**
- Consumes: `cellsFor`, `boardWithPiece`, `type Cell` (from `../lib/tetris/engine`); `emptyBoard`, `applyReplayEvent`, `type PieceEvent` (from `../lib/tetris/recordReplay`); `COLS_H`, `ROWS_H`, `REPLAY` (from `../lib/tetris/heroReplay`).
- Produces: no exports (DOM wiring).

**Structural change to the piece layers** — the blur moves off the moving cells onto a wrapper that is translated as a rigid body, so its blurred raster is cached and never re-rasterized mid-flight. The mask stays on the fixed parent layer (board-space), the blurred wrapper is its transformed child:

```
.tetris-piece (inset:0)
  .piece-layer-soft (inset:0, mask-soft)      fixed masked window
    .piece-wrap-soft (transform-animated, filter: blur(4px))   4 cells
  .piece-layer-crisp (inset:0, mask-crisp)    fixed masked window
    .piece-wrap-crisp (transform-animated)     4 cells (no blur)
```

- [ ] **Step 1: Rewrite the markup, piece `<style>`, and transition rules**

Replace lines 4–7 (the `.tetris-piece` markup) with wrappers:

```html
  <div class="tetris-piece" id="tetris-piece" aria-hidden="true">
    <div class="piece-layer-soft"><div class="piece-wrap-soft" id="tetris-piece-soft"></div></div>
    <div class="piece-layer-crisp"><div class="piece-wrap-crisp" id="tetris-piece-crisp"></div></div>
  </div>
```

Replace the piece-layer style block (current lines 104–130) with:

```css
  .tetris-piece { position: absolute; inset: 0; pointer-events: none; }
  .piece-layer-soft, .piece-layer-crisp { position: absolute; inset: 0; }
  /* Mask stays on the FIXED parent (board-space depth-of-field), so it does
     not travel with the piece. */
  .piece-layer-soft {
    mask-image: var(--tetris-mask-soft);
    -webkit-mask-image: var(--tetris-mask-soft);
  }
  .piece-layer-crisp {
    mask-image: var(--tetris-mask-crisp);
    -webkit-mask-image: var(--tetris-mask-crisp);
  }
  /* The blur lives on the wrapper and is rasterized ONCE; translating the
     wrapper reuses that cached raster (composite-only) instead of re-blurring
     every animation step — the whole point of this change. */
  .piece-wrap-soft, .piece-wrap-crisp {
    position: absolute; inset: 0; will-change: transform;
  }
  .piece-wrap-soft { filter: blur(4px); opacity: 0.85; }
  .piece-wrap-crisp { opacity: 0.9; }
  .piece-wrap-soft :global(.cell), .piece-wrap-crisp :global(.cell) {
    position: absolute; border-radius: 1px;
  }
  /* Motion is now a transform on the wrapper, not left/top on each cell —
     steps() keeps the blocky snap. */
  .tetris-piece.phase-turn .piece-wrap-soft,
  .tetris-piece.phase-turn .piece-wrap-crisp {
    transition: transform 0.3s steps(3, end);
  }
  .tetris-piece.phase-fall .piece-wrap-soft,
  .tetris-piece.phase-fall .piece-wrap-crisp {
    transition: transform 0.22s steps(6, end);
  }
```

Keep the existing `.tetris-hero`, `.tetris-ambient-soft/crisp`, mask variables, and the `:global()` piece-color rules unchanged. Update the color-rule selectors that referenced `.tetris-piece :global(.cell)` so they still match — they already target `.cell` broadly; leave them.

- [ ] **Step 2: Replace the entire `<script>` block**

```ts
<script>
  import { cellsFor, boardWithPiece } from '../lib/tetris/engine';
  import { emptyBoard, applyReplayEvent, type PieceEvent } from '../lib/tetris/recordReplay';
  import { COLS_H, ROWS_H, REPLAY } from '../lib/tetris/heroReplay';

  const ambientSoftEl = document.getElementById('tetris-ambient-soft')!;
  const ambientCrispEl = document.getElementById('tetris-ambient-crisp')!;
  const pieceEl = document.getElementById('tetris-piece')!;
  const pieceSoftEl = document.getElementById('tetris-piece-soft')!;
  const pieceCrispEl = document.getElementById('tetris-piece-crisp')!;
  const heroEl = document.getElementById('tetris-hero')!;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const GAP = 1;
  const TURN_MS = 300;
  const FALL_MS = 220;
  const PAUSE_MS = 200;
  const FLASH_CYCLES = 3;
  const FLASH_INTERVAL_MS = 90;

  let cellW = 0;
  let cellH = 0;
  let board = emptyBoard(COLS_H, ROWS_H);
  let index = 0;
  let onScreen = false;
  let running = false;
  // Bumped on every (re)start so a stale setTimeout chain from before a resize
  // or a pause bails instead of animating into replaced state — same guard
  // shape the previous live loop used.
  let generation = 0;
  let pieceCycle = 0;

  // Renders `src` (defaults to the current settled board). Passing an explicit
  // board lets the lock flash the PRE-clear state (full rows still present and
  // lit) before rendering the post-clear board.
  function renderBoard(el: HTMLElement, src: import('../lib/tetris/engine').Cell[][] = board) {
    el.innerHTML = '';
    for (let y = 0; y < ROWS_H; y++) {
      for (let x = 0; x < COLS_H; x++) {
        const cell = document.createElement('div');
        const piece = src[y][x];
        if (piece) cell.dataset.piece = piece;
        el.appendChild(cell);
      }
    }
  }
  function renderBoth(src?: import('../lib/tetris/engine').Cell[][]) {
    renderBoard(ambientSoftEl, src);
    renderBoard(ambientCrispEl, src);
  }

  // Fixed grid: column/row COUNT never changes; only cell pixel size does, so
  // the recorded coordinates stay valid at any width. onScreen is derived from
  // the box (0x0 below the mobile breakpoint, where .tetris-hero is
  // display:none) — not a second hardcoded 768 check.
  function setupGrid() {
    onScreen = ambientSoftEl.clientWidth > 0 && ambientSoftEl.clientHeight > 0;
    if (!onScreen) return;
    ambientSoftEl.style.gridTemplateColumns = `repeat(${COLS_H}, 1fr)`;
    ambientCrispEl.style.gridTemplateColumns = `repeat(${COLS_H}, 1fr)`;
    cellW = (ambientSoftEl.clientWidth - (COLS_H - 1) * GAP) / COLS_H;
    cellH = (ambientSoftEl.clientHeight - (ROWS_H - 1) * GAP) / ROWS_H;
    renderBoth();
  }

  // The 4 cells sit at their shape-relative offsets (constant for a fixed
  // rotation); the WRAPPER's transform positions the piece. So the cells are
  // laid out once per spawn and never touched again during the flight.
  function layoutPieceCells(el: HTMLElement, ev: PieceEvent): HTMLElement[] {
    el.innerHTML = '';
    const coords = cellsFor({ type: ev.type, rotation: ev.rotation, x: 0, y: 0 });
    const minX = Math.min(...coords.map((c) => c[0]));
    const minY = Math.min(...coords.map((c) => c[1]));
    return coords.map(([cx, cy]) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.piece = ev.type;
      cell.style.width = `${cellW}px`;
      cell.style.height = `${cellH}px`;
      cell.style.left = `${(cx - minX) * (cellW + GAP)}px`;
      cell.style.top = `${(cy - minY) * (cellH + GAP)}px`;
      el.appendChild(cell);
      return cell;
    });
  }

  // Origin of the piece's bounding box in board space, for a given piece x/y.
  function originTransform(ev: PieceEvent, atX: number, atY: number): string {
    const coords = cellsFor({ type: ev.type, rotation: ev.rotation, x: atX, y: atY });
    const boxX = Math.min(...coords.map((c) => c[0]));
    const boxY = Math.min(...coords.map((c) => c[1]));
    return `translate(${boxX * (cellW + GAP)}px, ${boxY * (cellH + GAP)}px)`;
  }

  function setPieceTransform(t: string) {
    (pieceSoftEl as HTMLElement).style.transform = t;
    (pieceCrispEl as HTMLElement).style.transform = t;
  }

  function flashRows(rows: number[]): Promise<void> {
    if (rows.length === 0) return Promise.resolve();
    const cellsInRows = (el: HTMLElement): HTMLElement[] =>
      rows.flatMap((r) =>
        Array.from(el.children).slice(r * COLS_H, r * COLS_H + COLS_H) as HTMLElement[]
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

  function runCycle() {
    const gen = generation;
    const ev = REPLAY[index];
    pieceEl.dataset.cycle = String(++pieceCycle);

    layoutPieceCells(pieceSoftEl, ev);
    layoutPieceCells(pieceCrispEl, ev);
    pieceEl.classList.remove('phase-fall');
    pieceEl.classList.add('phase-turn');
    setPieceTransform(originTransform(ev, ev.spawnX, 0));

    requestAnimationFrame(() => {
      if (gen !== generation) return;
      setPieceTransform(originTransform(ev, ev.x, 0)); // turn-slide to column

      window.setTimeout(() => {
        if (gen !== generation) return;
        pieceEl.classList.remove('phase-turn');
        pieceEl.classList.add('phase-fall');
        setPieceTransform(originTransform(ev, ev.x, ev.landingY)); // fall

        window.setTimeout(async () => {
          if (gen !== generation) return;
          // Lock. For a clearing drop, flash the PRE-clear board (locked piece
          // baked in, full rows still present and lit) before committing the
          // cleared result — mirrors the old preClearBoard behavior.
          const placed = boardWithPiece(board, {
            type: ev.type, rotation: ev.rotation, x: ev.x, y: ev.landingY,
          });
          board = applyReplayEvent(board, ev);
          pieceSoftEl.innerHTML = '';
          pieceCrispEl.innerHTML = '';
          if (ev.clearedRows.length > 0) {
            renderBoth(placed);
            await flashRows(ev.clearedRows);
            if (gen !== generation) return;
          }
          renderBoth();

          index++;
          if (index >= REPLAY.length) {
            // End of the recorded game (top-out): reset and loop.
            index = 0;
            board = emptyBoard(COLS_H, ROWS_H);
            renderBoth();
          }
          window.setTimeout(() => {
            if (gen !== generation) return;
            runCycle();
          }, PAUSE_MS);
        }, FALL_MS);
      }, TURN_MS);
    });
  }

  function shouldRun() {
    return onScreen && !reducedMotion.matches;
  }

  function start() {
    if (running || !shouldRun()) return;
    running = true;
    generation++;
    runCycle();
  }

  function stop() {
    running = false;
    generation++; // in-flight chain bails on next checkpoint
  }

  setupGrid();
  if (shouldRun()) start();

  // Resize: fixed grid means only cell pixel size changes. Recompute sizing,
  // re-render the settled board (cells auto-scale via 1fr, but cellW/cellH for
  // the falling piece must be refreshed), and restart the current cycle.
  let resizeTimer: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      stop();
      setupGrid();
      if (shouldRun()) start();
    }, 200);
  });
</script>
```

- [ ] **Step 3: Restart the dev server and verify it is served (HMR is unreliable on `/mnt/c`)**

```bash
pkill -f 'astro dev' 2>/dev/null; (npm run dev >/tmp/claude-1000/-mnt-c-Users-johnn-projects-website/bf6ad424-972b-4719-a677-1356bc2a328c/scratchpad/dev.log 2>&1 &) ; sleep 4
curl -s http://localhost:4321/ | grep -c 'piece-wrap-soft'
```
Expected: a nonzero count (the new wrapper markup is being served).

- [ ] **Step 4: Verify live in a real browser (visual/CSS work — eyeball it)**

Open `http://localhost:4321/`. Confirm: pieces spawn, slide, fall, lock; lines flash and clear; the left edge is blurred and the right edge sharp (depth-of-field intact); the loop restarts after the game tops out. Tune only these hand-picked values live if the look regressed: `filter: blur(4px)`, the mask stops, `opacity`. Do NOT change the transform/steps logic.

- [ ] **Step 5: Commit**

```bash
git add src/components/TetrisHero.astro
git commit -m "perf(tetris): replay a baked game via transform instead of a live loop"
```

---

### Task 5: Pause guards + reduced-motion freeze

**Files:**
- Modify: `src/components/TetrisHero.astro` (`<script>` — add observers)

**Interfaces:**
- Consumes: `start`, `stop`, `shouldRun`, `heroEl`, `reducedMotion` (all defined in Task 4).
- Produces: no exports.

- [ ] **Step 1: Add the pause guards to the `<script>` (before the resize listener)**

```ts
  // Freeze when the hero scrolls out of view — a decorative loop must not run
  // (rebuild + reblur on lock) for something off screen.
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) start();
      else stop();
    }
  });
  io.observe(heroEl);

  // Freeze when the tab is backgrounded; resume on return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (shouldRun()) start();
  });

  // Reduced-motion may be toggled after load: freeze on a static first frame.
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) stop();
    else if (shouldRun()) start();
  });
```

Remove the now-redundant top-level `if (shouldRun()) start();` from Task 4 — the IntersectionObserver fires on observe and starts it when the hero is visible. Keep `setupGrid()` so the static first frame renders under reduced motion / when off-screen.

- [ ] **Step 2: Restart dev server and verify reduced-motion renders a static board**

```bash
pkill -f 'astro dev' 2>/dev/null; (npm run dev >/tmp/claude-1000/-mnt-c-Users-johnn-projects-website/bf6ad424-972b-4719-a677-1356bc2a328c/scratchpad/dev.log 2>&1 &) ; sleep 4
curl -s http://localhost:4321/ | grep -c 'tetris-ambient-soft'
```
Expected: nonzero (board container served). Then in a browser with OS "reduce motion" on, confirm the board renders but does not animate.

- [ ] **Step 3: Commit**

```bash
git add src/components/TetrisHero.astro
git commit -m "perf(tetris): pause replay off-screen, backgrounded, and reduced-motion"
```

---

### Task 6: E2e coverage + full gate

**Files:**
- Create: `tests/e2e/tetris-hero.spec.ts`
- Check: `tests/e2e/accessibility.spec.ts` (reduced-motion freeze assertion still valid)

**Interfaces:**
- Consumes: the running dev/preview server and the `#tetris-hero`, `#tetris-piece` DOM.

- [ ] **Step 1: Write the e2e spec**

```ts
// tests/e2e/tetris-hero.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Tetris hero replay', () => {
  test('animates: the piece cycle advances', async ({ page }) => {
    await page.goto('/');
    const piece = page.locator('#tetris-piece');
    await expect(piece).toHaveAttribute('data-cycle', /\d+/);
    const first = await piece.getAttribute('data-cycle');
    await expect
      .poll(async () => piece.getAttribute('data-cycle'), { timeout: 5000 })
      .not.toBe(first);
  });

  test('freezes under reduced motion (static frame, no cycle advance)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const board = page.locator('#tetris-ambient-soft');
    await expect(board).toBeVisible();
    const piece = page.locator('#tetris-piece');
    const cycle = await piece.getAttribute('data-cycle');
    await page.waitForTimeout(1500);
    expect(await piece.getAttribute('data-cycle')).toBe(cycle);
  });

  test('loop restarts (data-cycle keeps advancing well past one game)', async ({ page }) => {
    // No live AI: the same recorded game replays. Confirm it keeps advancing —
    // it must not stall at the recorded top-out.
    await page.goto('/');
    const piece = page.locator('#tetris-piece');
    const a = Number(await piece.getAttribute('data-cycle'));
    await expect
      .poll(async () => Number(await piece.getAttribute('data-cycle')), { timeout: 6000 })
      .toBeGreaterThan(a + 2);
  });
});
```

- [ ] **Step 2: Run the new spec**

Run: `npm run test:e2e -- tetris-hero`
Expected: PASS (3 tests). If Chromium can't launch with the `libnspr4` signature, that's the known sandbox limitation (CLAUDE.md), not a regression — note it and rely on the full gate in CI.

- [ ] **Step 3: Confirm the existing reduced-motion assertion still holds**

Read `tests/e2e/accessibility.spec.ts`; if it asserted the old loop froze via a mechanism the rewrite changed (e.g. a specific class), update it to assert `#tetris-piece`'s `data-cycle` does not advance under `emulateMedia({ reducedMotion: 'reduce' })`. Run:

Run: `npm run test:e2e -- accessibility`
Expected: PASS.

- [ ] **Step 4: Run the full gate**

Run: `npm run test:all`
Expected: typecheck PASS, unit PASS, build PASS, e2e/axe PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/tetris-hero.spec.ts tests/e2e/accessibility.spec.ts
git commit -m "test(tetris): e2e for baked replay loop, restart, and reduced-motion freeze"
```

---

## Notes for the implementer

- The `cellsFor` origin convention: `cellsFor({type, rotation, x, y})` returns absolute `[col, row]` pairs for the piece placed at `(x, y)`. `layoutPieceCells` normalizes them to a local box (subtract min) so the wrapper transform alone carries board position; `originTransform` computes the box's top-left in board pixels. If pieces render offset by one cell, check whether `cellsFor`'s origin is top-left vs. spawn-anchored and adjust the min-subtraction, not the transitions.
- Do not reintroduce `will-change` on the settled-board cells or animate `left`/`top` on the piece cells — that reopens the reblur cost this change removes.
- After Task 4, the settled board still does a full `renderBoard` on each lock. That is acceptable (~1×/piece, and it only reblurs the soft board layer once per lock). Do NOT add per-cycle full rebuilds back.
- Kill any dev server you start (`pkill -f 'astro dev'`) before running `test:e2e`/`test:all` — `webServer.reuseExistingServer` is `false` and a leftover server can score a stale build (CLAUDE.md).
```
