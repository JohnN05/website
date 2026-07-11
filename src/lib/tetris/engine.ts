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
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function cellsFor(piece: Piece): number[][] {
  return SHAPES[piece.type][piece.rotation].map(([dx, dy]) => [piece.x + dx, piece.y + dy]);
}

function collides(board: Cell[][], piece: Piece): boolean {
  return cellsFor(piece).some(([x, y]) => {
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y < 0) return false;
    return board[y][x] !== null;
  });
}

export function createGame(firstPiece: PieceType): GameState {
  return {
    board: emptyBoard(),
    current: { type: firstPiece, rotation: 0, x: 3, y: -2 },
    score: 0,
    linesCleared: 0,
    gameOver: false,
  };
}

function withPiece(state: GameState, piece: Piece): GameState {
  if (collides(state.board, piece)) return state;
  return { ...state, current: piece };
}

export function moveLeft(state: GameState): GameState {
  return withPiece(state, { ...state.current, x: state.current.x - 1 });
}

export function moveRight(state: GameState): GameState {
  return withPiece(state, { ...state.current, x: state.current.x + 1 });
}

export function rotate(state: GameState): GameState {
  const rotation = (state.current.rotation + 1) % 4;
  return withPiece(state, { ...state.current, rotation });
}

function clearLines(board: Cell[][]): { board: Cell[][]; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - remaining.length;
  const board2 = [
    ...Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null)),
    ...remaining,
  ];
  return { board: board2, cleared };
}

const LINE_SCORES = [0, 100, 300, 500, 800];

function lockPiece(state: GameState, nextPiece: PieceType): GameState {
  const board = state.board.map((row) => [...row]);
  for (const [x, y] of cellsFor(state.current)) {
    if (y < 0) return { ...state, gameOver: true };
    board[y][x] = state.current.type;
  }
  const { board: clearedBoard, cleared } = clearLines(board);
  const spawned: Piece = { type: nextPiece, rotation: 0, x: 3, y: -2 };
  const gameOver = collides(clearedBoard, spawned);
  return {
    board: clearedBoard,
    current: spawned,
    score: state.score + LINE_SCORES[cleared],
    linesCleared: state.linesCleared + cleared,
    gameOver,
  };
}

export function softDrop(state: GameState, nextPiece: PieceType): GameState {
  const dropped = { ...state.current, y: state.current.y + 1 };
  if (collides(state.board, dropped)) return lockPiece(state, nextPiece);
  return { ...state, current: dropped };
}

export function hardDrop(state: GameState, nextPiece: PieceType): GameState {
  let piece = state.current;
  while (!collides(state.board, { ...piece, y: piece.y + 1 })) {
    piece = { ...piece, y: piece.y + 1 };
  }
  return lockPiece({ ...state, current: piece }, nextPiece);
}
