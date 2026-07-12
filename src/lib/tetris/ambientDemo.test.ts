import { describe, it, expect } from 'vitest';
import { createAmbientDemo, stepAmbientDemo } from './ambientDemo';

describe('ambient demo', () => {
  it('never reaches game over while cycling', () => {
    let state = createAmbientDemo();
    for (let i = 0; i < 50; i++) {
      state = stepAmbientDemo(state, i);
      expect(state.gameOver).toBe(false);
    }
  });

  it('clears at least one line over a full cycle', () => {
    let state = createAmbientDemo();
    let maxLinesCleared = 0;
    for (let i = 0; i < 20; i++) {
      state = stepAmbientDemo(state, i);
      maxLinesCleared = Math.max(maxLinesCleared, state.linesCleared);
    }
    expect(maxLinesCleared).toBeGreaterThan(0);
  });

  it('is deterministic given the same step sequence', () => {
    let a = createAmbientDemo();
    let b = createAmbientDemo();
    for (let i = 0; i < 10; i++) {
      a = stepAmbientDemo(a, i);
      b = stepAmbientDemo(b, i);
    }
    expect(a).toEqual(b);
  });

  it('stays within bounds on a board wider than the fixed 10-column default', () => {
    let state = createAmbientDemo(24, 20);
    for (let i = 0; i < 30; i++) {
      state = stepAmbientDemo(state, i);
      for (const row of state.board) {
        expect(row).toHaveLength(24);
      }
    }
  });

  it('preserves custom board dimensions across a game-over reset', () => {
    // A short board (6 rows) tops out easily under the autoplay heuristic,
    // forcing stepAmbientDemo's internal gameOver-reset path (ambientDemo.ts)
    // to run within this loop. That reset must recreate the board at the
    // *original* custom dimensions, not silently fall back to the engine's
    // 10x20 default.
    let state = createAmbientDemo(24, 6);
    let sawNonDefaultDimensions = false;
    for (let i = 0; i < 200; i++) {
      state = stepAmbientDemo(state, i);
      expect(state.board).toHaveLength(6);
      expect(state.board[0]).toHaveLength(24);
      sawNonDefaultDimensions = true;
    }
    expect(sawNonDefaultDimensions).toBe(true);
  });
});
