import { describe, it, expect } from 'vitest';
import { createBoard, reveal, toggleFlag, checkWin, MS_ROWS, MS_COLS, MS_MINES } from './engine';

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('createBoard', () => {
  it('places exactly MS_MINES mines', () => {
    const board = createBoard();
    const mineCount = board.flat().filter((c) => c.mine).length;
    expect(mineCount).toBe(MS_MINES);
    expect(board).toHaveLength(MS_ROWS);
    expect(board[0]).toHaveLength(MS_COLS);
  });

  it('computes correct adjacent-mine counts', () => {
    // Deterministic placement: mines (0,0)-(8,8) on diagonal + (1,7) off-diagonal = 10 mines
    const rng = sequenceRng([0, 0, 0.12, 0.12, 0.24, 0.24, 0.36, 0.36, 0.48, 0.48, 0.60, 0.60, 0.72, 0.72, 0.84, 0.84, 0.96, 0.96, 0.12, 0.84]);
    const board = createBoard(rng);

    // This test asserted `board[0][0].mine || board[0][1].mine` — mine
    // PLACEMENT — and never read .adjacent at all, despite its name. Forcing
    // adjacent = 0 across the whole engine left it passing.
    //
    // The counts below are read off the seeded layout by hand, not computed the
    // way the engine computes them:
    //
    //   * . . . . . . . .      (0,1) touches (0,0) and (1,1)          -> 2
    //   . * . . . . . * .      (1,0) touches (0,0) and (1,1)          -> 2
    //   . . * . . . . . .      (0,3) touches nothing                  -> 0
    //   . . . * . . . . .      (0,7) touches only (1,7)               -> 1
    //   . . . . * . . . .      (1,6) touches only (1,7)               -> 1
    //   . . . . . * . . .      (2,1) touches (1,1) and (2,2)          -> 2
    //   . . . . . . * . .
    //   . . . . . . . * .
    //   . . . . . . . . *
    expect(board[0][1].adjacent).toBe(2);
    expect(board[1][0].adjacent).toBe(2);
    expect(board[0][3].adjacent).toBe(0);
    expect(board[0][7].adjacent).toBe(1);
    expect(board[1][6].adjacent).toBe(1);
    expect(board[2][1].adjacent).toBe(2);

    // The layout those counts are derived from, asserted rather than assumed —
    // otherwise a reseeded board would silently make every count above wrong
    // instead of failing here.
    expect(board[0][0].mine).toBe(true);
    expect(board[1][1].mine).toBe(true);
    expect(board[1][7].mine).toBe(true);
    expect(board[8][8].mine).toBe(true);
    expect(board.flat().filter((c) => c.mine)).toHaveLength(MS_MINES);
  });
});

describe('reveal', () => {
  it('flood-fills connected zero-adjacent cells', () => {
    // 10 mines in rows 3+, none adjacent to (0,0) to allow flood-fill expansion
    const rng = sequenceRng([0.36, 0.36, 0.48, 0.48, 0.60, 0.60, 0.72, 0.72, 0.84, 0.84, 0.96, 0.96, 0.36, 0.12, 0.48, 0.24, 0.60, 0.36, 0.72, 0.48]);
    const board = createBoard(rng);
    const { board: revealed, exploded } = reveal(board, 0, 0);
    expect(exploded).toBe(false);
    const revealedCount = revealed.flat().filter((c) => c.revealed).length;
    expect(revealedCount).toBeGreaterThan(1);
  });

  it('sets exploded true when revealing a mine', () => {
    // Mines on diagonal (0,0)-(8,8) + off-diagonal (1,7) = 10 total
    const rng = sequenceRng([0, 0, 0.12, 0.12, 0.24, 0.24, 0.36, 0.36, 0.48, 0.48, 0.60, 0.60, 0.72, 0.72, 0.84, 0.84, 0.96, 0.96, 0.12, 0.84]);
    const board = createBoard(rng);
    const mineRow = board.findIndex((row) => row.some((c) => c.mine));
    const mineCol = board[mineRow].findIndex((c) => c.mine);
    const { exploded } = reveal(board, mineRow, mineCol);
    expect(exploded).toBe(true);
  });
});

describe('toggleFlag', () => {
  it('flags and unflags a hidden cell', () => {
    const board = createBoard();
    const flagged = toggleFlag(board, 0, 0);
    expect(flagged[0][0].flagged).toBe(true);
    const unflagged = toggleFlag(flagged, 0, 0);
    expect(unflagged[0][0].flagged).toBe(false);
  });

  it('does not flag an already-revealed cell', () => {
    const rng = sequenceRng([0.36, 0.36, 0.48, 0.48, 0.60, 0.60, 0.72, 0.72, 0.84, 0.84, 0.96, 0.96, 0.36, 0.12, 0.48, 0.24, 0.60, 0.36, 0.72, 0.48]);
    const board = createBoard(rng);
    const { board: revealed } = reveal(board, 0, 0);
    const flagged = toggleFlag(revealed, 0, 0);
    expect(flagged[0][0].flagged).toBe(false);
  });
});

describe('checkWin', () => {
  it('is false while safe cells remain hidden', () => {
    const board = createBoard();
    expect(checkWin(board)).toBe(false);
  });

  it('is true once every non-mine cell is revealed', () => {
    const rng = sequenceRng([0, 0, 0.12, 0.12, 0.24, 0.24, 0.36, 0.36, 0.48, 0.48, 0.60, 0.60, 0.72, 0.72, 0.84, 0.84, 0.96, 0.96, 0.12, 0.84]);
    let board = createBoard(rng);
    for (let r = 0; r < MS_ROWS; r++) {
      for (let c = 0; c < MS_COLS; c++) {
        if (!board[r][c].mine) board = reveal(board, r, c).board;
      }
    }
    expect(checkWin(board)).toBe(true);
  });
});
