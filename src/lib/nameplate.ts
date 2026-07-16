/**
 * The piece model behind the JOHN NG mark's reveal.
 *
 * "JOHN NG" contains exactly two letters that also name real tetrominoes
 * (the seven are I/O/T/S/Z/J/L): J and O. Those two are the only letters that
 * carry a piece hue anywhere on this site, and the only ones that can turn
 * into a piece. H/N/N/G name nothing and stay neutral.
 *
 * There is no shared grid across the word. Each piece keeps its own square box
 * and PieceMark.astro sizes that box, at render time, to the ink of the letter
 * it replaces — so the J's box is the J's ink and the O's box is the O's ink.
 * That's what puts a piece *on* its letter rather than near it, and it means
 * the O's blocks come out larger than the J's: a 2x2 piece covering the same
 * height as a 3x3 one has bigger blocks. That difference is the deliberate
 * trade (see CLAUDE.md) for every letter fully becoming its piece.
 */

export type PieceLetter = 'J' | 'O';

/** A single cell, 1-indexed, in the piece's own box. */
export interface Block {
  row: number;
  col: number;
}

export interface Piece {
  /**
   * Width and height of the piece's own square rotation box, in blocks.
   * Rotation is only well-defined inside a square box.
   */
  boxSize: number;
  /** The piece's cells in box coordinates, resting on the box's floor. */
  blocks: readonly Block[];
}

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
 * Rotate blocks 90° counter-clockwise inside their own square box:
 * `(row, col) -> (boxSize + 1 - col, row)`.
 *
 * The direction is the whole point. The J spawns flat and one turn to the left
 * stands it up as
 *   . . X
 *   . . X
 *   . X X
 * — a stroke with a hook at the bottom left, which is the letter J. Turning it
 * the other way lands on `XX. / X.. / X..`, a mirrored hook that reads as
 * anything but a J. Both directions are legal Tetris moves; only this one ends
 * the reveal on the letter it started from.
 *
 * The O's no-op falls straight out of this — a 2x2 square in a 2x2 box maps
 * onto itself — which is why there is no special case for it here or in any
 * caller. That is the real Tetris rule, not a gap in the implementation.
 */
export function rotateCcw(blocks: readonly Block[], boxSize: number): Block[] {
  return blocks.map(({ row, col }) => ({ row: boxSize + 1 - col, col: row }));
}

/**
 * A piece's blocks in its own box, spawned or turned.
 *
 * One source of truth for both call sites: the server renders the spawn state
 * from this, and the client's rotation rewrites grid placement from this. A
 * second formula on either side could drift out of sync with the first — a bug
 * this repo has already shipped once, in the ambient loop's landing spot.
 */
export function pieceBlocks(piece: Piece, rotated = false): Block[] {
  return rotated
    ? rotateCcw(piece.blocks, piece.boxSize)
    : piece.blocks.map((b) => ({ ...b }));
}

/** The mark's two lines: the rail and the mobile bar stack them, the hero
 *  sets them on one line. */
export const NAMEPLATE_LINES: readonly [string, string] = ['JOHN', 'NG'];
