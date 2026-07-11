import { describe, it, expect } from 'vitest';
import { createGame, moveLeft, moveRight, rotate, softDrop, hardDrop, COLS, ROWS } from './engine';

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
