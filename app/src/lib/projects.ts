/**
 * Client-safe project lookup.
 * `lib/data.ts` has fs imports (server only); this file only uses JSON import,
 * so it can be imported from both server and client components.
 */
import projectsRaw from '@/data/projects.json';
import type { ProjectMeta } from '@/types/dashboard';

export const PROJECTS_LIST: ProjectMeta[] = projectsRaw as ProjectMeta[];
const PROJECT_BY_ID = new Map(PROJECTS_LIST.map((p) => [p.id, p]));

export function lookupProject(id: string): ProjectMeta | undefined {
  return PROJECT_BY_ID.get(id);
}
