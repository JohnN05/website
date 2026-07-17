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
    // Raised from 20: the restored build-up heuristic (75% threshold, see
    // autoplay.ts) genuinely delays the first clear now (first clear lands
    // at step 22 against the current bag/heuristic implementation), unlike
    // the old always-weighted version this loop count was originally sized
    // for.
    let state = createAmbientDemo();
    let maxLinesCleared = 0;
    for (let i = 0; i < 40; i++) {
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
