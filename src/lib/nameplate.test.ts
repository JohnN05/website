import { describe, it, expect } from 'vitest';
import {
  LATTICE_SIZE,
  NAMEPLATE_LINES,
  PIECES,
  latticeBlocks,
  pieceForLetter,
  rotateCw,
  type Block,
} from './nameplate';

/** Blocks are a set, not a sequence — compare them order-independently. */
function sorted(blocks: readonly Block[]): Block[] {
  return [...blocks].sort((a, b) => a.row - b.row || a.col - b.col);
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

describe('PIECES', () => {
  it('gives every piece exactly four blocks', () => {
    expect(PIECES.J.blocks).toHaveLength(4);
    expect(PIECES.O.blocks).toHaveLength(4);
  });

  it('rests each piece on the floor of its own box, left-aligned', () => {
    for (const piece of [PIECES.J, PIECES.O]) {
      const maxRow = Math.max(...piece.blocks.map((b) => b.row));
      const minCol = Math.min(...piece.blocks.map((b) => b.col));
      expect(maxRow).toBe(piece.boxSize);
      expect(minCol).toBe(1);
    }
  });

  it('gives J a 3-wide box and O a 2-wide box', () => {
    // Not cosmetic: the box size is what makes rotation well-defined, and
    // it's why the O draws smaller than the J on the same block grid.
    expect(PIECES.J.boxSize).toBe(3);
    expect(PIECES.O.boxSize).toBe(2);
  });
});

describe('rotateCw', () => {
  it('turns J\'s spawn state into its next SRS state', () => {
    // spawn        turned
    //  . . .        X X .
    //  X . .   ->   X . .
    //  X X X        X . .
    expect(sorted(rotateCw(PIECES.J.blocks, PIECES.J.boxSize))).toEqual(
      sorted([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 3, col: 1 },
      ])
    );
  });

  it('leaves the O exactly where it was', () => {
    // The one tetromino a rotation does nothing to. This must fall out of the
    // math — a 2x2 square in a 2x2 box maps onto itself — not out of a
    // special case in the caller.
    expect(sorted(rotateCw(PIECES.O.blocks, PIECES.O.boxSize))).toEqual(
      sorted(PIECES.O.blocks)
    );
  });

  it('keeps a turned piece resting on its box floor', () => {
    const turned = rotateCw(PIECES.J.blocks, PIECES.J.boxSize);
    expect(Math.max(...turned.map((b) => b.row))).toBe(PIECES.J.boxSize);
  });

  it('never loses or duplicates a block', () => {
    const turned = rotateCw(PIECES.J.blocks, PIECES.J.boxSize);
    const unique = new Set(turned.map((b) => `${b.row},${b.col}`));
    expect(unique.size).toBe(4);
  });

  it('returns to the spawn state after four turns', () => {
    let blocks = [...PIECES.J.blocks];
    for (let i = 0; i < 4; i++) blocks = rotateCw(blocks, PIECES.J.boxSize);
    expect(sorted(blocks)).toEqual(sorted(PIECES.J.blocks));
  });
});

describe('latticeBlocks', () => {
  it('leaves J alone — its box already fills the lattice', () => {
    expect(sorted(latticeBlocks(PIECES.J))).toEqual(sorted(PIECES.J.blocks));
  });

  it('drops O onto the lattice floor rather than leaving it at the top', () => {
    // O's box is 2 tall inside a 3-tall lattice, so it has to be pushed down a
    // row — otherwise it would hang in the air while the J rests on the floor.
    expect(sorted(latticeBlocks(PIECES.O))).toEqual(
      sorted([
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
      ])
    );
  });

  it('rests every piece on the same lattice floor, turned or not', () => {
    const cases = [
      latticeBlocks(PIECES.J),
      latticeBlocks(PIECES.J, true),
      latticeBlocks(PIECES.O),
      latticeBlocks(PIECES.O, true),
    ];
    for (const blocks of cases) {
      expect(Math.max(...blocks.map((b) => b.row))).toBe(LATTICE_SIZE);
      expect(Math.min(...blocks.map((b) => b.col))).toBe(1);
    }
  });

  it('keeps every block inside the lattice', () => {
    for (const rotated of [false, true]) {
      for (const piece of [PIECES.J, PIECES.O]) {
        for (const b of latticeBlocks(piece, rotated)) {
          expect(b.row).toBeGreaterThanOrEqual(1);
          expect(b.col).toBeGreaterThanOrEqual(1);
          expect(b.row).toBeLessThanOrEqual(LATTICE_SIZE);
          expect(b.col).toBeLessThanOrEqual(LATTICE_SIZE);
        }
      }
    }
  });

  it('does not mutate the piece it was given', () => {
    const before = JSON.stringify(PIECES.J.blocks);
    latticeBlocks(PIECES.J, true);
    expect(JSON.stringify(PIECES.J.blocks)).toBe(before);
  });
});

describe('constants', () => {
  it('pins LATTICE_SIZE at 3', () => {
    // PieceMark.astro's CSS hardcodes `repeat(3, 1fr)` for the lattice grid,
    // because repeat() needs an integer literal and can't read a custom
    // property reliably. If this number changes, that CSS must change with it.
    expect(LATTICE_SIZE).toBe(3);
  });

  it('splits the name where the mark stacks it', () => {
    expect(NAMEPLATE_LINES).toEqual(['JOHN', 'NG']);
  });
});
