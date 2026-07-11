export type RailState = 'collapsed' | 'expanded';

export function getInitialRailState(storage: Pick<Storage, 'getItem'>): RailState {
  const stored = storage.getItem('nav-rail');
  return stored === 'expanded' ? 'expanded' : 'collapsed';
}

export function toggleRailState(current: RailState): RailState {
  return current === 'expanded' ? 'collapsed' : 'expanded';
}

export function persistRailState(storage: Pick<Storage, 'setItem'>, state: RailState): void {
  storage.setItem('nav-rail', state);
}
