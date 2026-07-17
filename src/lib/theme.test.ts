// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { getInitialTheme, toggleTheme, persistTheme } from './theme';

describe('getInitialTheme', () => {
  it('returns the stored theme when present', () => {
    const storage = { getItem: vi.fn().mockReturnValue('dark') };
    const matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(getInitialTheme(storage, matchMedia)).toBe('dark');
  });

  it('falls back to prefers-color-scheme when nothing is stored', () => {
    const storage = { getItem: vi.fn().mockReturnValue(null) };
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(getInitialTheme(storage, matchMedia)).toBe('dark');
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('defaults to light when no preference is stored or detected', () => {
    const storage = { getItem: vi.fn().mockReturnValue(null) };
    const matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(getInitialTheme(storage, matchMedia)).toBe('light');
  });
});

describe('toggleTheme', () => {
  it('flips light to dark and back', () => {
    expect(toggleTheme('light')).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
  });
});

describe('persistTheme', () => {
  it('writes the theme to storage', () => {
    const storage = { setItem: vi.fn() };
    persistTheme(storage, 'dark');
    expect(storage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });
});
