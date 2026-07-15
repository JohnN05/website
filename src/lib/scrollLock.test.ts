import { describe, it, expect } from 'vitest';
import {
  DURATION_MS,
  WHEEL_THRESHOLD,
  easeInOutCubic,
  currentSectionIndex,
  nextSectionIndex,
} from './scrollLock';

describe('constants', () => {
  it('exposes the exact tuned duration and wheel-noise threshold', () => {
    expect(DURATION_MS).toBe(700);
    expect(WHEEL_THRESHOLD).toBe(2);
  });
});

describe('easeInOutCubic', () => {
  it('returns 0 at t=0 and 1 at t=1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('returns 0.5 at the midpoint', () => {
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it('is slow-fast-slow: earlier in the first half than linear, symmetric in the second half', () => {
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625, 5);
    expect(easeInOutCubic(0.75)).toBeCloseTo(0.9375, 5);
  });
});

describe('currentSectionIndex', () => {
  const sectionTops = [0, 800, 1600, 2400];

  it('returns 0 at the very top', () => {
    expect(currentSectionIndex(0, sectionTops)).toBe(0);
  });

  it('returns the index of the last section whose top is <= scrollY', () => {
    expect(currentSectionIndex(400, sectionTops)).toBe(0);
    expect(currentSectionIndex(800, sectionTops)).toBe(1);
    expect(currentSectionIndex(1600, sectionTops)).toBe(2);
  });

  it('returns the last section once scrolled past its top, even deep into the footer', () => {
    expect(currentSectionIndex(3000, sectionTops)).toBe(3);
  });

  it('tolerates real-world scrollTo() landing drift below an exact section top', () => {
    // Browsers don't always land window.scrollY at the exact pixel value
    // passed to scrollTo() — observed ~0.2px drift on a real Windows
    // display (DPI-scaling-dependent). A scroll landing within a couple
    // px of a section's top is still that section...
    expect(currentSectionIndex(799, sectionTops)).toBe(1);
    expect(currentSectionIndex(800, sectionTops)).toBe(1);
    // ...but a position meaningfully short of a section's top (not just
    // landing-precision noise) must still resolve to the section
    // actually reached.
    expect(currentSectionIndex(790, sectionTops)).toBe(0);
  });
});

describe('nextSectionIndex', () => {
  it('moves forward one section on a positive deltaY', () => {
    expect(nextSectionIndex(1, 50, 4)).toBe(2);
  });

  it('moves backward one section on a negative deltaY', () => {
    expect(nextSectionIndex(1, -50, 4)).toBe(0);
  });

  it('clamps at the last section on further forward pressure', () => {
    expect(nextSectionIndex(3, 50, 4)).toBe(3);
  });

  it('clamps at the first section on further backward pressure', () => {
    expect(nextSectionIndex(0, -50, 4)).toBe(0);
  });
});
