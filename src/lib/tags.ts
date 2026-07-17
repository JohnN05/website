export type AccentName = 'cobalt' | 'maroon' | 'clay' | 'moss';

const ACCENT_ORDER: AccentName[] = ['cobalt', 'maroon', 'clay', 'moss'];

export function accentForTag(tag: string): AccentName {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % ACCENT_ORDER.length;
  return ACCENT_ORDER[index];
}

// The CSS custom property each accent resolves to. Shared so every surface that
// tints by accent (ProjectCard cover, ArticleLayout header) reads one source.
export const ACCENT_VAR: Record<AccentName, string> = {
  cobalt: 'var(--color-accent)',
  maroon: 'var(--color-accent-maroon)',
  clay: 'var(--color-accent-clay)',
  moss: 'var(--color-accent-moss)',
};

// The tetromino each accent maps to, as cell indices of a 3-wide × 2-tall grid,
// row-major. Deterministic like accentForTag's color, so a tag always yields the
// same piece everywhere it appears — the ProjectCard cover's hover piece and the
// ArticleLayout fallback marker are the same shape by construction, not by two
// hand-kept copies.
export const PIECE_CELLS: Record<AccentName, number[]> = {
  cobalt: [0, 3, 4, 5], // J
  maroon: [0, 1, 4, 5], // Z
  clay: [2, 3, 4, 5], // L
  moss: [1, 2, 3, 4], // S
};
