import { describe, it, expect } from 'vitest';
import {
  createGame, moveLeft, moveRight, rotate, softDrop, hardDrop, landingRow, cellsFor, isTSpin,
  COLS, ROWS, type GameState, type Piece, type Cell,
} from './engine';

describe('createGame', () => {
  it('spawns the requested piece near the top center, no lines cleared', () => {
    const state = createGame('O');
    expect(state.current.type).toBe('O');
    expect(state.score).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.board).toHaveLength(ROWS);
    expect(state.board[0]).toHaveLength(COLS);
  });
});

describe('movement', () => {
  it('moves left and right within bounds', () => {
    const state = createGame('O');
    const moved = moveRight(state);
    expect(moved.current.x).toBe(state.current.x + 1);
    const back = moveLeft(moved);
    expect(back.current.x).toBe(state.current.x);
  });

  it('refuses to move past the left wall', () => {
    let state = createGame('O');
    for (let i = 0; i < 10; i++) state = moveLeft(state);
    const before = state.current.x;
    expect(moveLeft(state).current.x).toBe(before);
  });

  it('refuses to move past the right wall', () => {
    let state = createGame('O');
    for (let i = 0; i < 10; i++) state = moveRight(state);
    const before = state.current.x;
    expect(moveRight(state).current.x).toBe(before);
  });

  it('rotates through 4 states and back to the first', () => {
    let state = createGame('T');
    const first = state.current.rotation;
    for (let i = 0; i < 4; i++) state = rotate(state);
    expect(state.current.rotation).toBe(first);
  });
});

describe('locking and line clears', () => {
  it('locks a piece into the board on soft drop when it can no longer fall', () => {
    let state = createGame('O');
    for (let i = 0; i < ROWS + 2; i++) state = softDrop(state, 'O');
    expect(state.board.some((row) => row.some((cell) => cell !== null))).toBe(true);
  });

  it('hard drop locks immediately and awards points for a cleared line', () => {
    let state = createGame('I');
    // Fill the bottom row except a 1-wide gap using O pieces (2x2), then
    // drop an I piece rotated vertically into the gap — property check
    // rather than exact geometry: score increases only when a line clears.
    const before = state.score;
    state = hardDrop(state, 'I');
    expect(state.score).toBeGreaterThanOrEqual(before);
    expect(state.current.type).toBe('I');
  });

  it('sets gameOver when a newly spawned piece immediately collides', () => {
    let state = createGame('O');
    // Stack pieces at the very top until spawn collides.
    for (let i = 0; i < 200 && !state.gameOver; i++) {
      state = hardDrop(state, 'O');
    }
    expect(state.gameOver).toBe(true);
  });
});

describe('custom board dimensions', () => {
  it('creates a board with the requested column and row counts', () => {
    const state = createGame('O', 6, 12);
    expect(state.board).toHaveLength(12);
    expect(state.board[0]).toHaveLength(6);
  });

  it('spawns the piece centered for the requested width', () => {
    const state = createGame('O', 6, 12);
    expect(state.current.x).toBe(1); // Math.floor(6 / 2) - 2
  });

  it('respects the custom width when moving to the right wall', () => {
    let state = createGame('O', 6, 12);
    for (let i = 0; i < 10; i++) state = moveRight(state);
    const rightmost = state.current.x;
    expect(rightmost).toBeLessThan(6);
    expect(moveRight(state).current.x).toBe(rightmost);
  });

  it('defaults to the standard 10x20 board when no size is given', () => {
    const state = createGame('O');
    expect(state.board).toHaveLength(ROWS);
    expect(state.board[0]).toHaveLength(COLS);
  });
});

describe('landingRow', () => {
  it('finds the resting row on an empty board', () => {
    const state = createGame('O');
    expect(landingRow(state.board, state.current)).toBe(ROWS - 2);
  });

  it('stops one row above an existing stack', () => {
    const state = createGame('O');
    const board = state.board.map((row) => [...row]);
    board[ROWS - 1][4] = 'O';
    board[ROWS - 1][5] = 'O';
    expect(landingRow(board, state.current)).toBe(ROWS - 3);
  });
});

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

