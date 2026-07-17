import { describe, it, expect } from 'vitest';
import { selectFeatured, type ProjectMeta } from './projects';

function project(overrides: Partial<ProjectMeta>): ProjectMeta {
  return {
    slug: 'x',
    title: 'X',
    date: new Date('2026-01-01'),
    summary: '',
    tags: [],
    draft: false,
    featured: false,
    ...overrides,
  };
}

describe('selectFeatured', () => {
  it('returns featured entries sorted newest first', () => {
    const older = project({ slug: 'a', featured: true, date: new Date('2026-01-01') });
    const newer = project({ slug: 'b', featured: true, date: new Date('2026-02-01') });
    expect(selectFeatured([older, newer])).toEqual([newer, older]);
  });

  it('falls back to latest non-draft entries when none are featured', () => {
    const oldest = project({ slug: 'a', date: new Date('2026-01-01') });
    const newest = project({ slug: 'b', date: new Date('2026-03-01') });
    const middle = project({ slug: 'c', date: new Date('2026-02-01') });
    expect(selectFeatured([oldest, newest, middle], 2)).toEqual([newest, middle]);
  });

  it('excludes drafts from both the featured and fallback paths', () => {
    const draftFeatured = project({ slug: 'a', featured: true, draft: true });
    const published = project({ slug: 'b', date: new Date('2026-02-01') });
    expect(selectFeatured([draftFeatured, published])).toEqual([published]);
  });

  it('respects the count limit', () => {
    const items = [1, 2, 3, 4].map((n) => project({ slug: String(n), date: new Date(2026, n) }));
    expect(selectFeatured(items, 2)).toHaveLength(2);
  });
});
