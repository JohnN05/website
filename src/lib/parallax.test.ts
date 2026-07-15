import { describe, it, expect } from 'vitest';
import { parallaxShift, MAX_SHIFT_PX } from './parallax';

describe('parallaxShift', () => {
  it('is zero when the section is settled at the top of the viewport', () => {
    // Depth is a rate, not a distance: at rest the element must sit at
    // exactly its design position, so the reveal's own resting 0px stays
    // true and no drift accumulates across sections.
    expect(parallaxShift(800, 800, 0.16)).toBe(0);
  });

  it('drifts positive once the section has travelled past the viewport top', () => {
    expect(parallaxShift(900, 800, 0.1)).toBeCloseTo(10, 5);
  });

  it('drifts negative while the section is still below the viewport top', () => {
    expect(parallaxShift(700, 800, 0.1)).toBeCloseTo(-10, 5);
  });

  it('scales with depth', () => {
    expect(parallaxShift(900, 800, 0.05)).toBeCloseTo(5, 5);
    expect(parallaxShift(900, 800, 0.16)).toBeCloseTo(16, 5);
  });

  it('scales with strength, defaulting to 1', () => {
    expect(parallaxShift(900, 800, 0.1)).toBeCloseTo(10, 5);
    expect(parallaxShift(900, 800, 0.1, 2)).toBeCloseTo(20, 5);
    expect(parallaxShift(900, 800, 0.1, 0)).toBe(0);
  });

  it('clamps a far-offscreen section to +MAX_SHIFT_PX', () => {
    // Observed for real while tracing the mock: parked at "teaching", the
    // hero's board still computed a 390px shift while scrolled entirely
    // off-screen. Unbounded shift is a bug, not a tuning question.
    expect(parallaxShift(3000, 0, 0.16)).toBe(MAX_SHIFT_PX);
  });

  it('clamps symmetrically to -MAX_SHIFT_PX', () => {
    expect(parallaxShift(0, 3000, 0.16)).toBe(-MAX_SHIFT_PX);
  });
});
