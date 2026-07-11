export type CapybaraPose = 'running' | 'resting';

export interface CapybaraState {
  percent: number;
  pose: CapybaraPose;
  speed: number;
}

export function computeCapybaraState(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): CapybaraState {
  const scrollable = Math.max(scrollHeight - clientHeight, 1);
  const percent = Math.min(Math.max((scrollTop / scrollable) * 100, 0), 100);
  const pose: CapybaraPose = percent >= 100 ? 'resting' : 'running';
  const speed = 1.2 - (percent / 100) * 0.9; // 1.2s light jog down to 0.3s sprint
  return { percent, pose, speed };
}
