import { createGame, moveLeft, moveRight, rotate, hardDrop, type GameState, type PieceType } from './engine';

type Move = 'left' | 'right' | 'rotate' | 'drop';

const SCRIPT: { piece: PieceType; moves: Move[] }[] = [
  { piece: 'O', moves: ['left', 'left', 'left', 'left', 'drop'] },
  { piece: 'O', moves: ['left', 'left', 'drop'] },
  { piece: 'O', moves: ['drop'] },
  { piece: 'O', moves: ['right', 'right', 'drop'] },
  { piece: 'O', moves: ['right', 'right', 'right', 'right', 'drop'] },
];

export function createAmbientDemo(): GameState {
  return createGame(SCRIPT[0].piece);
}

export function stepAmbientDemo(state: GameState, stepIndex: number): GameState {
  const scriptIndex = stepIndex % SCRIPT.length;
  const { moves } = SCRIPT[scriptIndex];
  const nextPiece = SCRIPT[(scriptIndex + 1) % SCRIPT.length].piece;
  let next = state;
  for (const move of moves) {
    if (move === 'left') next = moveLeft(next);
    else if (move === 'right') next = moveRight(next);
    else if (move === 'rotate') next = rotate(next);
    else next = hardDrop(next, nextPiece);
  }
  if (next.gameOver) return createGame(SCRIPT[0].piece);
  return next;
}
