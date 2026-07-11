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
