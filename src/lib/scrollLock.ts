export const DURATION_MS = 700;
export const WHEEL_THRESHOLD = 2;

// A small epsilon absorbs sub-pixel float drift between a computed scrollY
// and a section's real offsetTop (this repo has seen ~0.0003px drift
// between reads straddling a layout/paint pass) — not a tolerance for
// legitimately different scroll positions, which must still resolve to
// the section actually reached (e.g. 0.4px short of a section's top
// stays classified as the previous section, per this file's own tests).
const SECTION_EPSILON = 0.01;

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

export function currentSectionIndex(scrollY: number, sectionTops: number[]): number {
  let index = 0;
  for (let i = 0; i < sectionTops.length; i++) {
    if (sectionTops[i] <= scrollY + SECTION_EPSILON) index = i;
  }
  return index;
}

export function nextSectionIndex(current: number, deltaY: number, count: number): number {
  const target = deltaY > 0 ? current + 1 : deltaY < 0 ? current - 1 : current;
  return Math.min(Math.max(target, 0), count - 1);
}
