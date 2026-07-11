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
});
