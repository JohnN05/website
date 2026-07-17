export interface ProjectMeta {
  slug: string;
  title: string;
  date: Date;
  summary: string;
  tags: string[];
  draft: boolean;
  featured: boolean;
}

export function selectFeatured(projects: ProjectMeta[], count = 3): ProjectMeta[] {
  const published = projects.filter((project) => !project.draft);
  const featured = published.filter((project) => project.featured).sort(byDateDesc);
  if (featured.length > 0) return featured.slice(0, count);
  return [...published].sort(byDateDesc).slice(0, count);
}

// Newest first. Shared with the /projects index so both order projects the
// same way from one comparator, not two copies.
export function byDateDesc(a: { date: Date }, b: { date: Date }): number {
  return b.date.getTime() - a.date.getTime();
}
