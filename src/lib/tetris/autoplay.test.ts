import { describe, it, expect } from 'vitest';
import { createGame, moveLeft, moveRight, rotate, hardDrop, COLS, ROWS, type GameState, type Cell } from './engine';
import { chooseBestPlacement, columnHeights, countHoles as countHolesExported } from './autoplay';

function boardWithBottomRowGapAt(col: number, cols: number = COLS, rows: number = ROWS): Cell[][] {
  const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
  for (let x = 0; x < cols; x++) {
    if (x !== col) board[rows - 1][x] = 'O';
  }
  return board;
}

// Stamps a solid column onto an existing board so its max-height ratio
// crosses the 75% build-up threshold, without disturbing whichever other
// column the test is using as its line-clear gap.
function withTallColumn(board: Cell[][], col: number, height: number): Cell[][] {
  const rows = board.length;
  for (let y = rows - height; y < rows; y++) board[y][col] = 'O';
  return board;
}

function applyPlacement(state: GameState, placement: { rotation: number; x: number }): GameState {
  let piece = state;
  for (let i = 0; i < placement.rotation; i++) piece = rotate(piece);
  for (let i = 0; i < state.board[0].length; i++) piece = moveLeft(piece);
  // Blocked-check for the same reason stepAmbientDemo carries one: moveRight
  // returns the same state when blocked, so this loop hangs forever on an
  // unreachable x rather than failing. A test that hangs takes the suite with
  // it and reports nothing.
  while (piece.current.x < placement.x) {
    const moved = moveRight(piece);
    if (moved.current.x === piece.current.x) break;
    piece = moved;
  }
  return hardDrop(piece, 'O');
}

function countHoles(board: Cell[][]): number {
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

describe('chooseBestPlacement', () => {
  it('returns a rotation and column within valid bounds', () => {
    const state = createGame('T');
    const placement = chooseBestPlacement(state);
    expect(placement.rotation).toBeGreaterThanOrEqual(0);
    expect(placement.rotation).toBeLessThan(4);
    expect(placement.x).toBeGreaterThanOrEqual(0);
    expect(placement.x).toBeLessThan(COLS);
  });

  it('once the stack is tall enough (>=75%), fills a single-column gap to clear the line rather than stacking elsewhere', () => {
    const base = createGame('I');
    const board = withTallColumn(boardWithBottomRowGapAt(4), 9, 15); // 75% of ROWS
    const state: GameState = { ...base, board };
    const placement = chooseBestPlacement(state);
    const result = applyPlacement(state, placement);
    expect(result.linesCleared).toBeGreaterThan(state.linesCleared);
  });

  it('below 75% height, avoids even a completely free line clear, to keep building the stack', () => {
    const base = createGame('I');
    const state: GameState = { ...base, board: boardWithBottomRowGapAt(4) }; // ~5% height
    const placement = chooseBestPlacement(state);
    const result = applyPlacement(state, placement);
    expect(result.linesCleared).toBe(state.linesCleared);
  });

  it('avoids burying a well when a hole-free placement exists', () => {
    // This asked an O piece to avoid making a hole on an EMPTY board — which no
    // placement or rotation of an O can do, so it passed no matter what the
    // heuristic did. Gutting chooseBestPlacement to `return {rotation: 0, x: 0}`
    // failed four tests in this file and left this one green.
    //
    // The fixture now has a real trap: two filled bottom rows with a 1-wide,
    // 2-deep well at column 4. A T piece laid across the well buries it and
    // opens holes; a T laid on the flat stretch opens none. Both are available,
    // so the choice is the thing under test.
    const board: Cell[][] = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
    for (let x = 0; x < COLS; x++) {
      if (x !== 4) {
        board[ROWS - 1][x] = 'O';
        board[ROWS - 2][x] = 'O';
      }
    }
    const base = createGame('T');
    const state: GameState = { ...base, board };
    // The well is open, not buried: nothing is over it yet.
    expect(countHolesExported(board)).toBe(0);

    // Vacuity guard, and the part the old test was missing: prove a
    // hole-creating placement genuinely EXISTS here, or "chose one with no
    // holes" means nothing again. Enumerated through the engine's own moves
    // rather than asserted from memory of the shapes.
    const holesByPlacement: number[] = [];
    for (let r = 0; r < 4; r++) {
      let probe = state;
      for (let i = 0; i < r; i++) probe = rotate(probe);
      for (let i = 0; i < COLS; i++) probe = moveLeft(probe);
      while (true) {
        holesByPlacement.push(countHolesExported(hardDrop(probe, 'O').board));
        const next = moveRight(probe);
        if (next.current.x === probe.current.x) break;
        probe = next;
      }
    }
    expect(Math.max(...holesByPlacement)).toBeGreaterThan(0);

    const placement = chooseBestPlacement(state);
    const result = applyPlacement(state, placement);
    expect(countHolesExported(result.board)).toBe(0);
  });
});

describe('chooseBestPlacement on a board wider than the fixed 10-column default', () => {
  it('still reaches the leftmost column when clearing a gap there', () => {
    const cols = 30;
    const base = createGame('I', cols, ROWS);
    const board = withTallColumn(boardWithBottomRowGapAt(0, cols, ROWS), cols - 1, 15); // 75% of ROWS
    const state: GameState = { ...base, board };
    const placement = chooseBestPlacement(state);
    const result = applyPlacement(state, placement);
    expect(result.linesCleared).toBeGreaterThan(state.linesCleared);
  });
});

describe('chooseBestPlacement lines-cleared weight', () => {
  it('still finds a line-clearing placement when the weight is high', () => {
    const base = createGame('I');
    const state: GameState = { ...base, board: boardWithBottomRowGapAt(4) };
    const placement = chooseBestPlacement(state, { linesClearedWeight: 20 });
    const result = applyPlacement(state, placement);
    expect(result.linesCleared).toBeGreaterThan(state.linesCleared);
  });

  it('does not throw and still returns an in-bounds placement when the weight is zero', () => {
    const base = createGame('I');
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
    board[2][0] = 'O';
    board[3][0] = 'O';
    // row 1, column 0 is empty with row 0's block above it -> 1 hole
    expect(countHolesExported(board)).toBe(1);
  });
});

describe('chooseBestPlacement build-up threshold (75% stack height)', () => {
  // Column 0 is a solid tall column (controls the max-height ratio the
  // threshold gates on). The bottom row is filled at every other column
  // except `gapCol` and column 0, leaving a single-cell gap reachable only
  // by an L-piece placement that also opens a new hole elsewhere on the
  // board -- so completing the line has a real cost, not a free win, and
  // only the lines-cleared weight (once it kicks in at/above 75%) makes it
  // worthwhile.
  function boardWithTallColumnAndGap(cols: number, rows: number, tallHeight: number, gapCol: number): Cell[][] {
    const board: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
    for (let y = rows - tallHeight; y < rows; y++) board[y][0] = 'O';
    for (let x = 1; x < cols; x++) {
      if (x !== gapCol) board[rows - 1][x] = 'O';
    }
    return board;
  }

  it('below 75% height, does not chase a line clear that costs a new hole', () => {
    const cols = 6;
    const base = createGame('L', cols, ROWS);
    const state: GameState = { ...base, board: boardWithTallColumnAndGap(cols, ROWS, 9, 5) }; // 45%
    const placement = chooseBestPlacement(state);
    const result = applyPlacement(state, placement);
    expect(result.linesCleared).toBe(state.linesCleared);
  });

  it('at/above 75% height, chooses the line-clearing placement when one exists', () => {
    const cols = 6;
    const base = createGame('L', cols, ROWS);
    const state: GameState = { ...base, board: boardWithTallColumnAndGap(cols, ROWS, 15, 5) }; // 75%
    const placement = chooseBestPlacement(state);
    const result = applyPlacement(state, placement);
    expect(result.linesCleared).toBeGreaterThan(state.linesCleared);
  });
});
