import { describe, it, expect } from 'vitest';
import { createGame, moveLeft, moveRight, rotate, hardDrop, COLS, ROWS, type GameState, type Cell } from './engine';
import { chooseBestPlacement } from './autoplay';

function boardWithBottomRowGapAt(col: number): Cell[][] {
  const board: Cell[][] = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
  for (let x = 0; x < COLS; x++) {
    if (x !== col) board[ROWS - 1][x] = 'O';
  }
  return board;
}

function applyPlacement(state: GameState, placement: { rotation: number; x: number }): GameState {
  let piece = state;
  for (let i = 0; i < placement.rotation; i++) piece = rotate(piece);
  for (let i = 0; i < COLS; i++) piece = moveLeft(piece);
  while (piece.current.x < placement.x) piece = moveRight(piece);
  return hardDrop(piece, 'O');
}

function countHoles(board: Cell[][]): number {
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    let seenFilled = false;
    for (let y = 0; y < ROWS; y++) {
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
