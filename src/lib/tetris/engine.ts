export const COLS = 10;
export const ROWS = 20;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Cell = PieceType | null;

const SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

export interface Piece {
  type: PieceType;
  rotation: number;
  x: number;
  y: number;
}

export interface GameState {
  board: Cell[][];
  current: Piece;
  score: number;
  linesCleared: number;
  gameOver: boolean;
  lastMoveWasRotation: boolean;
}

function emptyBoard(cols: number, rows: number): Cell[][] {
  return Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
}

export function cellsFor(piece: Piece): number[][] {
  return SHAPES[piece.type][piece.rotation].map(([dx, dy]) => [piece.x + dx, piece.y + dy]);
}

export function boardWithPiece(board: Cell[][], piece: Piece): Cell[][] {
  const copy = board.map((row) => [...row]);
  const rows = copy.length;
  const cols = copy[0].length;
  for (const [x, y] of cellsFor(piece)) {
    if (y >= 0 && y < rows && x >= 0 && x < cols) copy[y][x] = piece.type;
  }
  return copy;
}

export function fullRowIndices(board: Cell[][]): number[] {
  const indices: number[] = [];
  board.forEach((row, i) => {
    if (row.every((cell) => cell !== null)) indices.push(i);
  });
  return indices;
}

function collides(board: Cell[][], piece: Piece): boolean {
  const cols = board[0].length;
  const rows = board.length;
  return cellsFor(piece).some(([x, y]) => {
    if (x < 0 || x >= cols || y >= rows) return true;
    if (y < 0) return false;
    return board[y][x] !== null;
  });
}

export function createGame(firstPiece: PieceType, cols: number = COLS, rows: number = ROWS): GameState {
  return {
    board: emptyBoard(cols, rows),
    current: { type: firstPiece, rotation: 0, x: Math.floor(cols / 2) - 2, y: -2 },
    score: 0,
    linesCleared: 0,
    gameOver: false,
    lastMoveWasRotation: false,
  };
}

function movePieceTo(state: GameState, piece: Piece): GameState {
  if (collides(state.board, piece)) return state;
  return { ...state, current: piece, lastMoveWasRotation: false };
}

export function moveLeft(state: GameState): GameState {
  return movePieceTo(state, { ...state.current, x: state.current.x - 1 });
}

export function moveRight(state: GameState): GameState {
  return movePieceTo(state, { ...state.current, x: state.current.x + 1 });
}

// Simplified SRS-style wall kicks, adapted to this engine's downward-y
// coordinate system (the published guideline tables assume y-up, so every
// dy here is the guideline value negated). JLSTZ pieces share one table;
// O never needs a kick (all 4 rotations are the same shape); I gets a
// deliberately simplified horizontal-only kick set rather than the full
// guideline I-table — this is a decorative ambient/casual-play engine, not
// a competitive one, and the simplified I table still lets I rotate cleanly
// near walls, which is all that's needed here.
const WALL_KICKS_JLSTZ: Record<string, number[][]> = {
  '0>>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};
const WALL_KICKS_I: number[][] = [[0, 0], [1, 0], [-1, 0], [2, 0], [-2, 0]];

export function rotate(state: GameState): GameState {
  const from = state.current.rotation;
  const to = (from + 1) % 4;
  const kicks =
    state.current.type === 'O' ? [[0, 0]] :
    state.current.type === 'I' ? WALL_KICKS_I :
    WALL_KICKS_JLSTZ[`${from}>>${to}`];
  for (const [dx, dy] of kicks) {
    const candidate: Piece = { ...state.current, rotation: to, x: state.current.x + dx, y: state.current.y + dy };
    if (!collides(state.board, candidate)) {
      return { ...state, current: candidate, lastMoveWasRotation: true };
    }
  }
  return state;
}

// Walks a candidate piece straight down until it would collide, without
// locking it — used by hardDrop (below) to find where the *current* piece
// actually lands, and reused directly by TetrisHero.astro's ambient
// animation (Task 7) to preview where a piece *will* land before it's
// actually dropped, so the fall animation has a real target row to ease
// toward instead of guessing.
export function landingRow(board: Cell[][], piece: Piece): number {
  let y = piece.y;
  while (!collides(board, { ...piece, y: y + 1 })) y++;
  return y;
}

// Standard 3-corner T-spin rule: of the 4 cells diagonally adjacent to the
// T piece's center (its pivot cell, index (1,1) in every one of its 4
// rotation shapes), at least 3 must be occupied — by a block or by being
// off the board. Deliberately doesn't distinguish "T-Spin" from "T-Spin
// Mini" (the guideline's finer-grained corner-direction rule) — one bonus
// tier is enough for a decorative ambient loop's "feels more real" goal.
export function isTSpin(board: Cell[][], piece: Piece): boolean {
  if (piece.type !== 'T') return false;
  const cols = board[0].length;
  const rows = board.length;
  const cx = piece.x + 1;
  const cy = piece.y + 1;
  const corners = [
    [cx - 1, cy - 1], [cx + 1, cy - 1],
    [cx - 1, cy + 1], [cx + 1, cy + 1],
  ];
  const filled = corners.filter(
    ([x, y]) => x < 0 || x >= cols || y < 0 || y >= rows || board[y][x] !== null
  ).length;
  return filled >= 3;
}

function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const cols = board[0].length;
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = board.length - remaining.length;
  const compacted = [
    ...Array.from({ length: cleared }, () => Array<Cell>(cols).fill(null)),
    ...remaining,
  ];
  return { board: compacted, cleared };
}

const LINE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_LINE_SCORES = [400, 800, 1200, 1600];

function lockPiece(state: GameState, nextPiece: PieceType): GameState {
  const cols = state.board[0].length;
  const tspin = state.lastMoveWasRotation && isTSpin(state.board, state.current);
  const board = state.board.map((row) => [...row]);
  for (const [x, y] of cellsFor(state.current)) {
    if (y < 0) return { ...state, gameOver: true };
    board[y][x] = state.current.type;
  }
  const { board: clearedBoard, cleared } = clearLines(board);
  const spawned: Piece = { type: nextPiece, rotation: 0, x: Math.floor(cols / 2) - 2, y: -2 };
  const gameOver = collides(clearedBoard, spawned);
  const scoreGain = tspin ? TSPIN_LINE_SCORES[cleared] : LINE_SCORES[cleared];
  return {
    board: clearedBoard,
    current: spawned,
    score: state.score + scoreGain,
    linesCleared: state.linesCleared + cleared,
    gameOver,
    lastMoveWasRotation: false,
  };
}

export function softDrop(state: GameState, nextPiece: PieceType): GameState {
  const dropped = { ...state.current, y: state.current.y + 1 };
  if (collides(state.board, dropped)) return lockPiece(state, nextPiece);
  return { ...state, current: dropped, lastMoveWasRotation: false };
}

export function hardDrop(state: GameState, nextPiece: PieceType): GameState {
  const piece = { ...state.current, y: landingRow(state.board, state.current) };
  return lockPiece({ ...state, current: piece }, nextPiece);
}
