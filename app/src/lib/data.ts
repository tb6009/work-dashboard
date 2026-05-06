import type { ProjectMeta, WeeklySnapshot } from '@/types/dashboard';
import type { ProjectWorkData } from '@/types/projectWork';
import projectsRaw from '@/data/projects.json';

export const PROJECTS: ProjectMeta[] = projectsRaw as ProjectMeta[];

const PROJECT_BY_ID = new Map(PROJECTS.map(p => [p.id, p]));

export function getProject(id: string): ProjectMeta | undefined {
  return PROJECT_BY_ID.get(id);
}

/** Load a single weekly snapshot by week id (e.g. '2026-W18'). */
export async function loadWeek(weekId: string): Promise<WeeklySnapshot | null> {
  try {
    const mod = await import(`@/data/weekly/${weekId}.json`);
    return mod.default as WeeklySnapshot;
  } catch {
    return null;
  }
}

/** Currently latest week — for now, hardcoded. Build script will set this. */
export const CURRENT_WEEK_ID = '2026-W18';

/** Load per-project work-panel data (3-column block on /projects/[id]).
 *  Returns null if no JSON exists for that id (placeholder render). */
export async function loadProjectWork(id: string): Promise<ProjectWorkData | null> {
  try {
    const mod = await import(`@/data/projects/${id}.json`);
    return mod.default as ProjectWorkData;
  } catch {
    return null;
  }
}
