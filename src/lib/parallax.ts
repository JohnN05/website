// Bounds how far any layer may drift from its design position. Not defensive
// padding: while tracing the mock, a section parked four screens away still
// computed a 390px shift for the hero's Tetris board, because shift is derived
// from the section's own top with no bound. Task 4 additionally skips layers
// whose section isn't intersecting the viewport; this is the second belt.
export const MAX_SHIFT_PX = 200;

/**
 * How far a parallax layer should be offset from its design position.
 *
 * `depth` is a rate, not a distance: the layer drifts by its own depth times
 * how far its section has travelled past the viewport top. That makes the
 * shift exactly 0 when the section is settled (scrollY === sectionTop), so
 * layers rest where they were designed to sit and nothing accumulates across
 * Home's four sections.
 */
export function parallaxShift(
  scrollY: number,
  sectionTop: number,
  depth: number,
  strength = 1
): number {
  const shift = (scrollY - sectionTop) * depth * strength;
  return Math.min(MAX_SHIFT_PX, Math.max(-MAX_SHIFT_PX, shift));
}
