import { moveLeft, moveRight, rotate, hardDrop, COLS, ROWS, type GameState, type Cell } from './engine';

export interface Placement {
  rotation: number;
  x: number;
}

const WEIGHT_HOLES = 4;
const WEIGHT_BUMPINESS = 1;
const WEIGHT_HEIGHT = 1;
const WEIGHT_LINES_CLEARED = 6;

function columnHeights(board: Cell[][]): number[] {
  const heights = new Array(COLS).fill(0);
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (board[y][x] !== null) {
        heights[x] = ROWS - y;
        break;
      }
    }
  }
  return heights;
}

function countHoles(board: Cell[][]): number {
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    let seenFilled = false;
    for (let y = 0; y < ROWS; y++) {
      if (board[y][x] !== null) seenFilled = true;
      else if (seenFilled) holes++;
    }
  }
  return holes;
}

function bumpiness(heights: number[]): number {
  let total = 0;
  for (let i = 0; i < heights.length - 1; i++) total += Math.abs(heights[i] - heights[i + 1]);
  return total;
}

function scoreResult(before: GameState, after: GameState): number {
  const heights = columnHeights(after.board);
  const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);
  const linesCleared = after.linesCleared - before.linesCleared;
  return (
    countHoles(after.board) * WEIGHT_HOLES +
    bumpiness(heights) * WEIGHT_BUMPINESS +
    aggregateHeight * WEIGHT_HEIGHT -
    linesCleared * WEIGHT_LINES_CLEARED
  );
}

// Scores every (rotation, column) placement reachable via the engine's public
// move API — walk to the left wall, then step right recording each x the
// piece can actually occupy, for each of the 4 rotations — and returns the
// lowest-cost one. No lookahead/search tree: this is a standard greedy
// simple-AI heuristic, not a competitive solver.
export function chooseBestPlacement(state: GameState): Placement {
  let best: Placement = { rotation: 0, x: state.current.x };
  let bestScore = Infinity;

  for (let r = 0; r < 4; r++) {
    let rotated = state;
    for (let i = 0; i < r; i++) rotated = rotate(rotated);

    let leftmost = rotated;
    for (let i = 0; i < COLS; i++) leftmost = moveLeft(leftmost);

    let probe = leftmost;
    while (true) {
      const dropped = hardDrop(probe, 'O');
      const score = scoreResult(state, dropped);
      if (score < bestScore) {
        bestScore = score;
        best = { rotation: r, x: probe.current.x };
      }
      const next = moveRight(probe);
      if (next.current.x === probe.current.x) break;
      probe = next;
    }
  }

  return best;
}
