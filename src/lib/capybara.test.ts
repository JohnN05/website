import { describe, it, expect } from 'vitest';
import { computeCapybaraState } from './capybara';

describe('computeCapybaraState', () => {
  it('is 0% and running at the top of the article', () => {
    const state = computeCapybaraState(0, 2000, 800);
    expect(state.percent).toBe(0);
    expect(state.pose).toBe('running');
  });

  it('is 100% and resting at the bottom', () => {
    const state = computeCapybaraState(1200, 2000, 800);
    expect(state.percent).toBe(100);
    expect(state.pose).toBe('resting');
  });

  it('speeds up (lower duration) as scroll percent increases', () => {
    const early = computeCapybaraState(0, 2000, 800);
    const late = computeCapybaraState(1000, 2000, 800);
    expect(late.speed).toBeLessThan(early.speed);
  });

  it('clamps percent to [0, 100] for out-of-range input', () => {
    expect(computeCapybaraState(-50, 2000, 800).percent).toBe(0);
    expect(computeCapybaraState(5000, 2000, 800).percent).toBe(100);
  });
});
