/**
 * The piece model behind the JOHN NG mark's reveal.
 *
 * "JOHN NG" contains exactly two letters that also name real tetrominoes
 * (the seven are I/O/T/S/Z/J/L): J and O. Those two are the only letters that
 * carry a piece hue anywhere on this site, and the only ones that can turn
 * into a piece. H/N/N/G name nothing and stay neutral.
 */

export type PieceLetter = 'J' | 'O';

/** A single cell, 1-indexed, in whatever grid the surrounding code is using. */
export interface Block {
  row: number;
  col: number;
}

export interface Piece {
  /**
   * Width and height of the piece's own square rotation box, in blocks.
   * Rotation is only well-defined inside a square box, which is why each
   * piece carries one instead of being rotated inside the shared lattice.
   */
  boxSize: number;
  /** The piece's cells in box coordinates, resting on the box's floor. */
  blocks: readonly Block[];
}

/**
 * Every letter cell is a square lattice this many blocks on a side. One
 * lattice per letter, sharing a block size and a floor across the whole word,
 * so a piece in one letter lines up with a piece in another.
 *
 * PieceMark.astro's CSS hardcodes `repeat(3, 1fr)` to match: CSS `repeat()`
 * needs an integer literal and can't reliably read a custom property. A test
 * pins this value so the two can't drift apart silently.
 */
export const LATTICE_SIZE = 3;

export const PIECES: Readonly<Record<PieceLetter, Piece>> = {
  // J spawns flat, long edge down, resting on its box floor:
  //   . . .
  //   X . .
  //   X X X
  J: {
    boxSize: 3,
    blocks: [
      { row: 2, col: 1 },
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 3, col: 3 },
    ],
  },
  // O is a 2x2 square in a 2x2 box:
  //   X X
  //   X X
  O: {
    boxSize: 2,
    blocks: [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
  },
};

export function pieceForLetter(letter: string): PieceLetter | null {
  const upper = letter.toUpperCase();
  return upper === 'J' || upper === 'O' ? upper : null;
}

/**
 * Rotate blocks 90° clockwise inside their own square box:
 * `(row, col) -> (col, boxSize + 1 - row)`.
 *
 * The O's no-op falls straight out of this — a 2x2 square in a 2x2 box maps
 * onto itself — which is why there is no special case for it here or in any
 * caller. That is the real Tetris rule, not a gap in the implementation.
 */
export function rotateCw(blocks: readonly Block[], boxSize: number): Block[] {
  return blocks.map(({ row, col }) => ({ row: col, col: boxSize + 1 - row }));
}

/**
 * Place a piece's blocks into a letter's shared lattice, with the piece's box
 * anchored to the lattice's bottom-left. Every piece therefore rests on the
 * same floor and starts at the same left edge, at the same block size — the
 * J simply occupies more of its lattice than the O does.
 */
export function latticeBlocks(piece: Piece, rotated = false): Block[] {
  const blocks = rotated
    ? rotateCw(piece.blocks, piece.boxSize)
    : piece.blocks.map((b) => ({ ...b }));
  const rowOffset = LATTICE_SIZE - piece.boxSize;
  return blocks.map(({ row, col }) => ({ row: row + rowOffset, col }));
}

/** The mark's two lines: the rail and the mobile bar stack them, the hero
 *  sets them on one line. */
export const NAMEPLATE_LINES: readonly [string, string] = ['JOHN', 'NG'];
