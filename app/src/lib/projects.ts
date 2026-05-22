/**
 * Client-safe project lookup.
 * `lib/data.ts` has fs imports (server only); this file only uses JSON import,
 * so it can be imported from both server and client components.
 */
import projectsRaw from '@/data/projects.json';
import type { ProjectMeta } from '@/types/dashboard';

export const PROJECTS_LIST: ProjectMeta[] = projectsRaw as ProjectMeta[];
const PROJECT_BY_ID = new Map(PROJECTS_LIST.map((p) => [p.id, p]));
const PROJECT_BY_ALIAS = new Map<string, ProjectMeta>();
for (const p of PROJECTS_LIST) {
  for (const alias of p.aliases ?? []) PROJECT_BY_ALIAS.set(alias, p);
}

/** id 또는 alias로 프로젝트 조회. 옛 weekly JSON 호환. */
export function lookupProject(id: string): ProjectMeta | undefined {
  return PROJECT_BY_ID.get(id) ?? PROJECT_BY_ALIAS.get(id);
}
