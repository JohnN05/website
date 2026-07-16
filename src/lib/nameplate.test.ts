import { describe, it, expect } from 'vitest';
import {
  NAMEPLATE_LINES,
  PIECES,
  pieceBlocks,
  pieceForLetter,
  rotateCcw,
  type Block,
} from './nameplate';

/** Blocks are a set, not a sequence — compare them order-independently. */
function sorted(blocks: readonly Block[]): Block[] {
  return [...blocks].sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Draw a placement, so a failure shows the shape rather than coordinates. */
function draw(blocks: readonly Block[], boxSize: number): string {
  const filled = new Set(blocks.map((b) => `${b.row},${b.col}`));
  return Array.from({ length: boxSize }, (_, r) =>
    Array.from({ length: boxSize }, (_, c) =>
      filled.has(`${r + 1},${c + 1}`) ? 'X' : '.'
    ).join('')
  ).join('\n');
}

describe('pieceForLetter', () => {
  it('maps the two letters of "JOHN NG" that name real tetrominoes', () => {
    expect(pieceForLetter('J')).toBe('J');
    expect(pieceForLetter('O')).toBe('O');
  });

  it('is case-insensitive', () => {
    expect(pieceForLetter('j')).toBe('J');
  });

  it('returns null for letters that name no piece', () => {
    // H/N/G are not tetromino letters (I/O/T/S/Z/J/L), so they stay neutral.
    expect(pieceForLetter('H')).toBeNull();
    expect(pieceForLetter('N')).toBeNull();
    expect(pieceForLetter('G')).toBeNull();
    expect(pieceForLetter(' ')).toBeNull();
  });
});

describe('the pieces themselves', () => {
  it('are real tetrominoes — four blocks each', () => {
    expect(PIECES.J.blocks).toHaveLength(4);
    expect(PIECES.O.blocks).toHaveLength(4);
  });

  it('spawn resting on their own box floor, not floating', () => {
    for (const piece of [PIECES.J, PIECES.O]) {
      expect(Math.max(...piece.blocks.map((b) => b.row))).toBe(piece.boxSize);
    }
  });

  it('stay inside their own box, spawned or turned', () => {
    for (const piece of [PIECES.J, PIECES.O]) {
      for (const rotated of [false, true]) {
        for (const b of pieceBlocks(piece, rotated)) {
          expect(b.row).toBeGreaterThanOrEqual(1);
          expect(b.col).toBeGreaterThanOrEqual(1);
          expect(b.row).toBeLessThanOrEqual(piece.boxSize);
          expect(b.col).toBeLessThanOrEqual(piece.boxSize);
        }
      }
    }
  });
});

describe('rotateCcw', () => {
  // The reveal shipped turning the J clockwise, which lands it on a mirrored
  // hook (`XX. / X.. / X..`) — the bug. The direction is the fix, so assert it
  // as a picture rather than as coordinates.
  it('stands the J up into the shape of the letter J', () => {
    expect(draw(rotateCcw(PIECES.J.blocks, PIECES.J.boxSize), PIECES.J.boxSize)).toBe(
      ['..X', '..X', '.XX'].join('\n')
    );
  });

  it('does nothing to the O — a square in a square box maps onto itself', () => {
    expect(sorted(rotateCcw(PIECES.O.blocks, PIECES.O.boxSize))).toEqual(
      sorted(PIECES.O.blocks)
    );
  });

  it('keeps all four blocks, on four distinct cells', () => {
    const turned = rotateCcw(PIECES.J.blocks, PIECES.J.boxSize);
    expect(turned).toHaveLength(4);
    expect(new Set(turned.map((b) => `${b.row},${b.col}`)).size).toBe(4);
  });

  it('returns a piece to its spawn after four turns', () => {
    let blocks: Block[] = [...PIECES.J.blocks];
    for (let i = 0; i < 4; i++) blocks = rotateCcw(blocks, PIECES.J.boxSize);
    expect(sorted(blocks)).toEqual(sorted(PIECES.J.blocks));
  });
});

describe('pieceBlocks', () => {
  it('hands back the spawn placement untouched', () => {
    expect(sorted(pieceBlocks(PIECES.J))).toEqual(sorted(PIECES.J.blocks));
    expect(sorted(pieceBlocks(PIECES.O))).toEqual(sorted(PIECES.O.blocks));
  });

  it('turns the piece when asked', () => {
    expect(sorted(pieceBlocks(PIECES.J, true))).toEqual(
      sorted(rotateCcw(PIECES.J.blocks, PIECES.J.boxSize))
    );
  });

  it('never mutates the piece it was handed', () => {
    const before = JSON.stringify(PIECES.J.blocks);
    pieceBlocks(PIECES.J);
    pieceBlocks(PIECES.J, true);
    expect(JSON.stringify(PIECES.J.blocks)).toBe(before);
  });

  it('fills its box top to bottom once turned, so the piece covers its letter', () => {
    // PieceMark.astro sizes each box to its letter's ink and divides by
    // boxSize to get the block size. That only lands the piece on the letter
    // if the turned piece actually reaches its box's ceiling and floor.
    for (const piece of [PIECES.J, PIECES.O]) {
      const rows = pieceBlocks(piece, true).map((b) => b.row);
      expect(Math.min(...rows)).toBe(1);
      expect(Math.max(...rows)).toBe(piece.boxSize);
    }
  });
});

describe('NAMEPLATE_LINES', () => {
  it('spells the name', () => {
    expect(NAMEPLATE_LINES.join(' ')).toBe('JOHN NG');
  });
});
