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
