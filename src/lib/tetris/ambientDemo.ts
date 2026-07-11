import { createGame, moveLeft, moveRight, rotate, hardDrop, type GameState, type PieceType } from './engine';
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

export function createAmbientDemo(): GameState {
  return createGame(pieceForStep(0));
}

export function stepAmbientDemo(state: GameState, stepIndex: number): GameState {
  const placement = chooseBestPlacement(state);
  const nextPiece = pieceForStep(stepIndex + 1);

  let next = state;
  for (let i = 0; i < placement.rotation; i++) next = rotate(next);
  for (let i = 0; i < 20; i++) next = moveLeft(next);
  while (next.current.x < placement.x) next = moveRight(next);

  const result = hardDrop(next, nextPiece);
  // Never surface a gameOver state from this loop — if the chosen
  // placement would have ended the game, reset to a fresh board instead.
  // (The original scripted version of this file had the opposite bug in
  // spirit: a script that could reach an unwinnable state. Same invariant,
  // enforced here instead of avoided by construction.)
  return result.gameOver ? createGame(pieceForStep(stepIndex + 1)) : result;
}
