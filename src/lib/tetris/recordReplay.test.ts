import { describe, it, expect } from 'vitest';
import { recordGame, type PieceEvent, emptyBoard, applyReplayEvent } from './recordReplay';
import { cellsFor, boardWithPiece, fullRowIndices } from './engine';

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

describe('applyReplayEvent', () => {
  it('emptyBoard is rows x cols of nulls', () => {
    const b = emptyBoard(16, 14);
    expect(b.length).toBe(14);
    expect(b[0].length).toBe(16);
    expect(b.flat().every((c) => c === null)).toBe(true);
  });

  it('folding the recording reproduces every recorded clearedRows', () => {
    const rec = recordGame(16, 14);
    let board = emptyBoard(rec.cols, rec.rows);
    for (const ev of rec.pieces) {
      // The clear the player would compute from its own reconstructed board
      // must equal what the recorder captured — otherwise the settled board
      // would drift from the recorded flight and pieces would land wrong.
      const placed = boardWithPiece(board, {
        type: ev.type, rotation: ev.rotation, x: ev.x, y: ev.landingY,
      });
      expect(fullRowIndices(placed)).toEqual(ev.clearedRows);
      board = applyReplayEvent(board, ev);
    }
  });

  it('clears full rows and drops the stack', () => {
    // Bottom row filled in cols 0,1 only. An O at origin x=1 occupies cols 2,3
    // (its cells are dx 1,2 from the origin) across rows 2 and 3, so it
    // completes row 3 exactly — and leaves its top half floating in row 2.
    let board = emptyBoard(4, 4);
    board[3] = ['I', 'I', null, null];
    const ev: PieceEvent = {
      type: 'O', rotation: 0, spawnX: 1, x: 1, landingY: 2, clearedRows: [3],
    };
    const after = applyReplayEvent(board, ev);
    expect(after.length).toBe(4);
    // The completed row is gone (no full row survives)...
    expect(fullRowIndices(after)).toEqual([]);
    // ...the O cells that were sitting above it drop onto the floor...
    expect(after[3]).toEqual([null, null, 'O', 'O']);
    // ...and a fresh empty row is unshifted at the top. Every one of these
    // turns red if the clear / unshift / drop logic breaks — unlike the
    // previous fixture, whose O landed off-board so no row ever completed.
    expect(after[0].every((c) => c === null)).toBe(true);
  });
});
