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

function applyPlacement(state: GameState, placement: { rotation: number; x: number }): GameState {
  let piece = state;
  for (let i = 0; i < placement.rotation; i++) piece = rotate(piece);
  for (let i = 0; i < state.board[0].length; i++) piece = moveLeft(piece);
  while (piece.current.x < placement.x) piece = moveRight(piece);
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

  it('fills a single-column gap to clear the line, rather than stacking elsewhere', () => {
    const base = createGame('I');
    const state: GameState = { ...base, board: boardWithBottomRowGapAt(4) };
    const placement = chooseBestPlacement(state);
    const result = applyPlacement(state, placement);
    expect(result.linesCleared).toBeGreaterThan(state.linesCleared);
  });

  it('does not create new holes on an empty board when a hole-free placement exists', () => {
    const state = createGame('O');
    const placement = chooseBestPlacement(state);
    const result = applyPlacement(state, placement);
    expect(countHoles(result.board)).toBe(0);
  });
});

describe('chooseBestPlacement on a board wider than the fixed 10-column default', () => {
  it('still reaches the leftmost column when clearing a gap there', () => {
    const cols = 30;
    const base = createGame('I', cols, ROWS);
    const state: GameState = { ...base, board: boardWithBottomRowGapAt(0, cols, ROWS) };
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
