import {
  createGame, moveLeft, moveRight, rotate, hardDrop, landingRow, boardWithPiece, fullRowIndices,
  COLS, ROWS, type GameState, type PieceType, type Cell,
} from './engine';
import { createBag } from './bag';
import { chooseBestPlacement } from './autoplay';

// A tiny seeded PRNG so piece selection is a pure function of `step` alone
// (not shared mutable state) — two independent `createAmbientDemo()` runs
// stepped with the same indices must produce identical results, which a
// module-level bag counter shared across calls could not guarantee once two
// runs interleave their calls (see ambientDemo.test.ts's determinism test).
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reuses the real 7-bag randomizer (not a reimplementation) seeded per-bag
// so the same (step) always yields the same piece: draw a fresh bag seeded
// by which group of 7 this step falls in, then discard draws until reaching
// this step's position within that bag.
function pieceForStep(step: number): PieceType {
  const bagIndex = Math.floor(step / 7);
  const posInBag = step % 7;
  const draw = createBag(mulberry32(bagIndex + 1));
  let piece: PieceType = 'I';
  for (let i = 0; i <= posInBag; i++) piece = draw();
  return piece;
}

export function createAmbientDemo(cols: number = COLS, rows: number = ROWS): GameState {
  return createGame(pieceForStep(0), cols, rows);
}

export interface AmbientStepResult {
  state: GameState;
  preClearBoard: Cell[][];
  clearedRows: number[];
}

export function stepAmbientDemo(state: GameState, stepIndex: number): AmbientStepResult {
  const cols = state.board[0].length;
  const rows = state.board.length;
  const placement = chooseBestPlacement(state);
  const nextPiece = pieceForStep(stepIndex + 1);

  let next = state;
  for (let i = 0; i < placement.rotation; i++) next = rotate(next);
  for (let i = 0; i < cols; i++) next = moveLeft(next);
  while (next.current.x < placement.x) next = moveRight(next);

  const landingY = landingRow(next.board, next.current);
  const preClearBoard = boardWithPiece(next.board, { ...next.current, y: landingY });
  const clearedRows = fullRowIndices(preClearBoard);

  const result = hardDrop(next, nextPiece);

  // Only reset on a genuine top-out (hardDrop couldn't spawn the next
  // piece) — no heuristic early reset. A random-looking mid-stack restart
  // reads as a bug to a viewer, so hole-heavy or otherwise unfavorable
  // positions are left standing; the demo keeps playing through them.
  const finalState = result.gameOver ? createGame(pieceForStep(stepIndex + 1), cols, rows) : result;
  return { state: finalState, preClearBoard, clearedRows };
}
