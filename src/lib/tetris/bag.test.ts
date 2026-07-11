import { describe, it, expect } from 'vitest';
import { createBag } from './bag';

describe('createBag', () => {
  it('yields each of the 7 piece types exactly once per bag', () => {
    const next = createBag(() => 0.5);
    const drawn = Array.from({ length: 7 }, () => next());
    expect(new Set(drawn).size).toBe(7);
  });

  it('refills with a new full bag after 7 draws', () => {
    const next = createBag(() => 0.5);
    const firstBag = Array.from({ length: 7 }, () => next());
    const secondBag = Array.from({ length: 7 }, () => next());
    expect(new Set(secondBag).size).toBe(7);
    expect(secondBag).toEqual(firstBag); // deterministic rng -> same shuffle
  });
});
