export const DURATION_MS = 700;
export const WHEEL_THRESHOLD = 2;

// A small epsilon absorbs real-world window.scrollTo() landing drift:
// browsers don't always land window.scrollY at the exact pixel value
// passed to scrollTo() — observed ~0.2px drift on a real Windows display
// (likely DPI-scaling-dependent), confirmed via live debugging after a
// user report of the scroll lock getting permanently stuck at a section
// boundary. A too-tight 0.01 epsilon (sized only for an unrelated and
// much smaller ~0.0003px CSS-pixel string-parsing precedent, never
// validated against this module's own scrollTo()/scrollY round-trip
// precision) silently misclassified the landed position as the previous
// section on every subsequent wheel event, since the animation kept
// landing a few tenths of a pixel short of the exact target. Kept far
// below the smallest real inter-section gap (hundreds of pixels) so it
// never absorbs a legitimately different scroll position — one still
// short of a section's top by a non-trivial margin resolves to the
// section actually reached (per this file's own tests).
const SECTION_EPSILON = 2;

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
