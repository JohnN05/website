import type { PieceType } from './engine';

const TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function createBag(rng: () => number = Math.random): () => PieceType {
  let bag: PieceType[] = [];
  return function next(): PieceType {
    if (bag.length === 0) {
      bag = [...TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
}
