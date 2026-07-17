import { describe, it, expect } from 'vitest';
import { recordGame, type PieceEvent } from './recordReplay';
import { cellsFor } from './engine';

const PIECES = new Set(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);

describe('recordGame', () => {
  const rec = recordGame(16, 14);

  it('records a non-trivial game that ends on a genuine top-out', () => {
    // Loop terminates because the board topped out, not because it hit the
    // 4000-step safety cap. A real game here is ~124 pieces.
    expect(rec.pieces.length).toBeGreaterThan(30);
    expect(rec.pieces.length).toBeLessThan(4000);
    expect(rec.cols).toBe(16);
    expect(rec.rows).toBe(14);
  });

  it('every event is structurally valid', () => {
    const lastIndex = rec.pieces.length - 1;
    rec.pieces.forEach((ev, i) => {
      expect(PIECES.has(ev.type)).toBe(true);
      expect(ev.rotation).toBeGreaterThanOrEqual(0);
      expect(ev.rotation).toBeLessThanOrEqual(3);
      // `x`/`landingY` are the piece ORIGIN, not a leftmost-cell column: for
      // wall-hugging rotations the origin is legitimately negative (an O/T/S/L
      // against the left wall records x = -1, an I-rotation-1 down to -2) while
      // every cell still lands on-board. The meaningful invariant is that the
      // placed CELLS are on-board — check those, not the raw origin.
      const cells = cellsFor({ type: ev.type, rotation: ev.rotation, x: ev.x, y: ev.landingY });
      for (const [cx, cy] of cells) {
        // Horizontal is always fully in-bounds; vertical never punches through
        // the floor.
        expect(cx).toBeGreaterThanOrEqual(0);
        expect(cx).toBeLessThan(16);
        expect(cy).toBeLessThan(14);
        // A cell above the ceiling (cy < 0) is only valid on the terminal
        // piece — that overflow IS the top-out (boardWithPiece clips it). Any
        // earlier piece overflowing the ceiling would be a real bug.
        if (i !== lastIndex) expect(cy).toBeGreaterThanOrEqual(0);
      }
      expect(ev.spawnX).toBeGreaterThanOrEqual(0);
      expect(ev.spawnX).toBeLessThan(16);
      const sorted = [...ev.clearedRows].sort((a, b) => a - b);
      expect(ev.clearedRows).toEqual(sorted);
      for (const r of ev.clearedRows) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(14);
      }
    });
  });

  it('contains at least one line clear (the build-up-then-clear payoff)', () => {
    const totalCleared = rec.pieces.reduce((n, ev) => n + ev.clearedRows.length, 0);
    expect(totalCleared).toBeGreaterThan(0);
  });

  it('is deterministic across runs', () => {
    expect(recordGame(16, 14)).toEqual(rec);
  });
});
