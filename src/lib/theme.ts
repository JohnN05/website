export type Theme = 'light' | 'dark';

export function getInitialTheme(
  storage: Pick<Storage, 'getItem'>,
  matchMedia: (query: string) => { matches: boolean }
): Theme {
  const stored = storage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function toggleTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}

export function persistTheme(storage: Pick<Storage, 'setItem'>, theme: Theme): void {
  storage.setItem('theme', theme);
}
