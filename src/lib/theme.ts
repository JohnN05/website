export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function getInitialTheme(
  storage: Pick<Storage, 'getItem'>,
  matchMedia: (query: string) => { matches: boolean }
): Theme {
  const stored = storage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

export function persistTheme(storage: Pick<Storage, 'setItem'>, theme: Theme): void {
  storage.setItem(STORAGE_KEY, theme);
}
