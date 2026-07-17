import { createAmbientDemo, stepAmbientDemo } from './ambientDemo';
import { chooseBestPlacement } from './autoplay';
import { landingRow, boardWithPiece, fullRowIndices, type Cell, type PieceType } from './engine';

export interface PieceEvent {
  /** Tetromino identity — drives cell color. */
  type: PieceType;
  /** Final rotation the piece spawns and locks in (0..3). The live loop never
      animates rotation, only a horizontal slide, so this is constant across a
      piece's whole flight. */
  rotation: number;
  /** Column the piece spawns at (before the turn-phase slide). */
  spawnX: number;
  /** Column the piece slides to during the turn phase and locks at. */
  x: number;
  /** Row the piece's origin locks at. */
  landingY: number;
  /** Rows cleared after this lock, ascending. */
  clearedRows: number[];
}

export interface Recording {
  cols: number;
  rows: number;
  pieces: PieceEvent[];
}

/**
 * Runs the existing deterministic ambient demo one full game — from the opening
 * piece until a genuine top-out resets the board — and records the minimum per
 * piece for a runtime player to reproduce spawn -> turn-slide -> fall -> lock ->
 * clear. Pure: no DOM, no module-level state (the demo's PRNG is seeded per
 * step), so it always returns the same Recording for the same (cols, rows).
 */
export function recordGame(cols: number, rows: number): Recording {
  let state = createAmbientDemo(cols, rows);
  const pieces: PieceEvent[] = [];

  for (let step = 0; step < 4000; step++) {
    // Resolve placement identically to how stepAmbientDemo will below, and
    // derive landingY from the CURRENT (pre-lock) board exactly as
    // TetrisHero.astro does at runtime — so the recorded coordinates match a
    // fresh replay fold (see applyReplayEvent).
    const placement = chooseBestPlacement(state);
    const spawnX = state.current.x;
    const type = state.current.type;
    const landingY = landingRow(state.board, {
      ...state.current,
      rotation: placement.rotation,
      x: placement.x,
    });

    const result = stepAmbientDemo(state, step);
    pieces.push({
      type,
      rotation: placement.rotation,
      spawnX,
      x: placement.x,
      landingY,
      clearedRows: result.clearedRows,
    });

    // stepAmbientDemo silently resets to a fresh empty board on a genuine
    // top-out, so the first post-step board with zero filled cells is the
    // top-out. Record the piece that caused it, then stop.
    const filled = result.state.board.reduce(
      (n: number, row: Cell[]) => n + row.filter(Boolean).length,
      0
    );
    if (filled === 0 && step > 0) break;
    state = result.state;
  }

  return { cols, rows, pieces };
}

export function emptyBoard(cols: number, rows: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null as Cell)
  );
}

/**
 * Locks a recorded piece into the settled board and clears any full rows,
 * dropping the stack — the pure board half of what the runtime player renders.
 * clearedRows is recomputed here rather than trusted from the event so the
 * player never depends on the recorder agreeing with it; the fold-consistency
 * test proves they do agree for the committed recording.
 */
export function applyReplayEvent(board: Cell[][], ev: PieceEvent): Cell[][] {
  const cols = board[0].length;
  const placed = boardWithPiece(board, {
    type: ev.type,
    rotation: ev.rotation,
    x: ev.x,
    y: ev.landingY,
  });
  const full = fullRowIndices(placed);
  if (full.length === 0) return placed;
  const fullSet = new Set(full);
  const kept = placed.filter((_, y) => !fullSet.has(y));
  const empties = Array.from({ length: full.length }, () =>
    Array.from({ length: cols }, () => null as Cell)
  );
  return [...empties, ...kept];
}
