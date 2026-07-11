import { describe, it, expect } from 'vitest';
import { getInitialRailState, toggleRailState, persistRailState } from './nav';

function fakeStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe('getInitialRailState', () => {
  it('defaults to collapsed when nothing is stored', () => {
    expect(getInitialRailState(fakeStorage())).toBe('collapsed');
  });

  it('returns the persisted state when present', () => {
    expect(getInitialRailState(fakeStorage({ 'nav-rail': 'expanded' }))).toBe('expanded');
  });

  it('falls back to collapsed on an unrecognized stored value', () => {
    expect(getInitialRailState(fakeStorage({ 'nav-rail': 'garbage' }))).toBe('collapsed');
  });
});

describe('toggleRailState', () => {
  it('flips collapsed to expanded and back', () => {
    expect(toggleRailState('collapsed')).toBe('expanded');
    expect(toggleRailState('expanded')).toBe('collapsed');
  });
});

describe('persistRailState', () => {
  it('writes the state under the nav-rail key', () => {
    const storage = fakeStorage();
    persistRailState(storage, 'expanded');
    expect(storage.getItem('nav-rail')).toBe('expanded');
  });
});
