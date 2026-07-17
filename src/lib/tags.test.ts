import { describe, it, expect } from 'vitest';
import { accentForTag, type AccentName } from './tags';

const VALID: AccentName[] = ['cobalt', 'maroon', 'clay', 'moss'];

describe('accentForTag', () => {
  it('always returns one of the four site accents', () => {
    for (const tag of ['astro', 'design', 'rust', 'typescript', 'ml']) {
      expect(VALID).toContain(accentForTag(tag));
    }
  });

  it('is deterministic for the same tag', () => {
    expect(accentForTag('astro')).toBe(accentForTag('astro'));
    expect(accentForTag('design')).toBe(accentForTag('design'));
  });

  it('spreads different tags across more than one accent', () => {
    const seen = new Set(
      ['astro', 'design', 'rust', 'typescript', 'systems', 'crdt'].map(accentForTag)
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
