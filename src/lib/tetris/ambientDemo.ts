import {
  createGame, moveLeft, moveRight, rotate, hardDrop, landingRow, boardWithPiece, fullRowIndices,
  COLS, ROWS, type GameState, type PieceType, type Cell,
} from './engine';
import { createBag } from './bag';
import { chooseBestPlacement, columnHeights, countHoles, WEIGHT_LINES_CLEARED } from './autoplay';

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

function maxHeight(board: Cell[][]): number {
  return Math.max(0, ...columnHeights(board));
}

// Don't start rewarding line clears until the stack reaches this fraction of
// the board's height — makes the ambient loop build a visible stack instead
// of cashing in the first available single-line clear, per design ask.
const BUILD_UP_HEIGHT_RATIO = 0.5;

// Single source of truth for "is the stack currently in build-up phase" —
// stepAmbientDemo uses this to decide the lines-cleared weight it hands to
// chooseBestPlacement. TetrisHero.astro's runAmbientCycle must call this
// same helper (not re-derive the condition) when it independently calls
// chooseBestPlacement to animate the piece toward its landing spot, or the
// two calls can disagree on weighting and pick different placements —
// producing a piece that animates to one column but locks into another.
export function isBuildingUp(board: Cell[][]): boolean {
  return maxHeight(board) >= board.length * BUILD_UP_HEIGHT_RATIO;
}

// Above the build-up floor, a position counts as "unfavorable" (worth
// resetting) once holes make up more than this fraction of all cells.
const UNFAVORABLE_HOLE_RATIO = 0.03;

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
  // Whether *this step's incoming* stack has already reached the build-up
  // floor — reused below both to pick the placement heuristic's weighting
  // and to gate whether a bad placement is even allowed to trigger a reset.
  // It's deliberately based on the board as it stood *before* this step's
  // piece is placed, not after: almost any single placement on a stack
  // already near the floor pushes some column's height past it, so gating
  // on the post-placement height would make the "never reset below the
  // floor" guarantee meaningless for any stack that starts within one
  // piece's height of 50%.
  const tall = isBuildingUp(state.board);
  const placement = chooseBestPlacement(state, { linesClearedWeight: tall ? WEIGHT_LINES_CLEARED : 0 });
  const nextPiece = pieceForStep(stepIndex + 1);

  let next = state;
  for (let i = 0; i < placement.rotation; i++) next = rotate(next);
  for (let i = 0; i < cols; i++) next = moveLeft(next);
  while (next.current.x < placement.x) next = moveRight(next);

  const landingY = landingRow(next.board, next.current);
  const preClearBoard = boardWithPiece(next.board, { ...next.current, y: landingY });
  const clearedRows = fullRowIndices(preClearBoard);

  const result = hardDrop(next, nextPiece);

  // Never surface a gameOver state from this loop regardless of stack
  // height — that invariant doesn't wait for the 50% floor. Below the
  // floor, an unfavorable (hole-heavy) placement is left standing so the
  // stack keeps building; only once we've already reached the floor does
  // hole-heaviness alone justify a reset.
  const holes = countHoles(result.board);
  const unfavorable = result.gameOver || (tall && holes / (cols * rows) > UNFAVORABLE_HOLE_RATIO);

  const finalState = unfavorable ? createGame(pieceForStep(stepIndex + 1), cols, rows) : result;
  return { state: finalState, preClearBoard, clearedRows };
}
