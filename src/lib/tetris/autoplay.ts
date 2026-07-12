import { moveLeft, moveRight, rotate, hardDrop, type GameState, type Cell } from './engine';

export interface Placement {
  rotation: number;
  x: number;
}

export interface AutoplayConfig {
  linesClearedWeight?: number;
}

const WEIGHT_HOLES = 4;
const WEIGHT_BUMPINESS = 1;
const WEIGHT_HEIGHT = 1;
export const WEIGHT_LINES_CLEARED = 6;

export function columnHeights(board: Cell[][]): number[] {
  const cols = board[0].length;
  const rows = board.length;
  const heights = new Array(cols).fill(0);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (board[y][x] !== null) {
        heights[x] = rows - y;
        break;
      }
    }
  }
  return heights;
}

export function countHoles(board: Cell[][]): number {
  let holes = 0;
  for (let x = 0; x < board[0].length; x++) {
    let seenFilled = false;
    for (let y = 0; y < board.length; y++) {
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

function scoreResult(before: GameState, after: GameState, linesClearedWeight: number): number {
  const heights = columnHeights(after.board);
  const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);
  const linesCleared = after.linesCleared - before.linesCleared;
  return (
    countHoles(after.board) * WEIGHT_HOLES +
    bumpiness(heights) * WEIGHT_BUMPINESS +
    aggregateHeight * WEIGHT_HEIGHT -
    linesCleared * linesClearedWeight
  );
}

// Scores every (rotation, column) placement reachable via the engine's public
// move API — walk to the left wall, then step right recording each x the
// piece can actually occupy, for each of the 4 rotations — and returns the
// lowest-cost one. No lookahead/search tree: this is a standard greedy
// simple-AI heuristic, not a competitive solver.
export function chooseBestPlacement(state: GameState, config: AutoplayConfig = {}): Placement {
  const linesClearedWeight = config.linesClearedWeight ?? WEIGHT_LINES_CLEARED;
  let best: Placement = { rotation: 0, x: state.current.x };
  let bestScore = Infinity;

  for (let r = 0; r < 4; r++) {
    let rotated = state;
    for (let i = 0; i < r; i++) rotated = rotate(rotated);

    let leftmost = rotated;
    for (let i = 0; i < state.board[0].length; i++) leftmost = moveLeft(leftmost);

    let probe = leftmost;
    while (true) {
      const dropped = hardDrop(probe, 'O');
      const score = scoreResult(state, dropped, linesClearedWeight);
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
