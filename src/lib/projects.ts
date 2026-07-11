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
  const published = projects.filter((p) => !p.draft);
  const featured = published.filter((p) => p.featured).sort(byDateDesc);
  if (featured.length > 0) return featured.slice(0, count);
  return [...published].sort(byDateDesc).slice(0, count);
}

function byDateDesc(a: ProjectMeta, b: ProjectMeta): number {
  return b.date.getTime() - a.date.getTime();
}
