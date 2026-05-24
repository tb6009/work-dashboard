import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  ProjectMeta,
  CategoryMeta,
  WeeklySnapshot,
  MonthlySnapshot,
  YearlySnapshot,
  ProjectType,
  DecisionEntry,
} from '@/types/dashboard';
import type { ProjectWorkData } from '@/types/projectWork';
import projectsRaw from '@/data/projects.json';
import categoriesRaw from '@/data/categories.json';
import {
  parseWeekId,
  getMonthOfWeek,
  getWeeksOfMonth,
} from '@/lib/calendar';

/* ─────────────────────────────────────────────────────────────
   1. 프로젝트 메타 (정적 import, 빌드 타임)
   ───────────────────────────────────────────────────────────── */

export const PROJECTS: ProjectMeta[] = projectsRaw as ProjectMeta[];
const PROJECT_BY_ID = new Map(PROJECTS.map(p => [p.id, p]));

export function getProject(id: string): ProjectMeta | undefined {
  return PROJECT_BY_ID.get(id);
}

/** 카테고리 메타 — 2026-05-17 워크스페이스 재구조화 이후 추가. */
export const CATEGORIES: CategoryMeta[] = (categoriesRaw as CategoryMeta[])
  .slice()
  .sort((a, b) => a.order - b.order);
const CATEGORY_BY_ID = new Map(CATEGORIES.map(c => [c.id, c]));

export function getCategory(id: string): CategoryMeta | undefined {
  return CATEGORY_BY_ID.get(id);
}

/** 표시 가능한 카테고리만 (hidden 제외). */
export function getVisibleCategories(): CategoryMeta[] {
  return CATEGORIES.filter(c => !c.hidden);
}

/** 프로젝트를 categoryId 기준으로 그루핑. 그룹 내 ID 오름차순. */
export function groupProjectsByCategory(projects: ProjectMeta[]): Map<string, ProjectMeta[]> {
  const map = new Map<string, ProjectMeta[]>();
  for (const p of projects) {
    const cid = p.categoryId ?? '_uncategorized';
    if (!map.has(cid)) map.set(cid, []);
    map.get(cid)!.push(p);
  }
  for (const [, list] of map) {
    list.sort((a, b) => {
      const na = parseInt(a.id, 10);
      const nb = parseInt(b.id, 10);
      if (na !== nb) return na - nb;
      return a.id.localeCompare(b.id);
    });
  }
  return map;
}

/* ─────────────────────────────────────────────────────────────
   2. 파일 시스템 경로 (RSC = Node.js)
   ───────────────────────────────────────────────────────────── */

const DATA_ROOT = path.join(process.cwd(), 'src/data');
const WEEKLY_DIR = path.join(DATA_ROOT, 'weekly');
const MONTHLY_DIR = path.join(DATA_ROOT, 'monthly');
const YEARLY_DIR = path.join(DATA_ROOT, 'yearly');
const PROJECTS_DIR = path.join(DATA_ROOT, 'projects');

/* ─────────────────────────────────────────────────────────────
   3. Weekly — 단건 + 전체 + ID 리스트
   ───────────────────────────────────────────────────────────── */

/** 단일 weekly. 없으면 null. */
export async function loadWeek(weekId: string): Promise<WeeklySnapshot | null> {
  const p = path.join(WEEKLY_DIR, `${weekId}.json`);
  try {
    const raw = await fs.readFile(p, 'utf-8');
    return JSON.parse(raw) as WeeklySnapshot;
  } catch {
    return null;
  }
}

/** 디렉토리 스캔으로 모든 weekly id (정렬: 최신 우선). */
export async function listWeekIds(): Promise<string[]> {
  try {
    const files = await fs.readdir(WEEKLY_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''))
      .sort((a, b) => {
        const pa = parseWeekId(a);
        const pb = parseWeekId(b);
        if (!pa || !pb) return 0;
        if (pa.year !== pb.year) return pb.year - pa.year;
        return pb.week - pa.week;
      });
  } catch {
    return [];
  }
}

/** 모든 weekly 로드 (최신 우선). */
export async function loadAllWeeks(): Promise<WeeklySnapshot[]> {
  const ids = await listWeekIds();
  const all = await Promise.all(ids.map(loadWeek));
  return all.filter((w): w is WeeklySnapshot => w !== null);
}

/** 최근 N개 weekly. */
export async function loadRecentWeeks(n: number = 5): Promise<WeeklySnapshot[]> {
  const all = await loadAllWeeks();
  return all.slice(0, n);
}

/** 한 프로젝트의 모든 일간 활동 (entries) 수집 — 최신순.
 *  weekly JSON 전체를 scan해서 해당 projectId 의 entries[] 만 평탄화. */
export interface ProjectDailyActivity {
  date: string;
  weekday: string;
  weekId: string;
  filesChanged: number;
  did: string;
  logFilePath?: string;
  images?: import('@/types/dashboard').DailyImage[];
}
export async function loadProjectDailyActivity(projectId: string): Promise<ProjectDailyActivity[]> {
  const weeks = await loadAllWeeks();
  const out: ProjectDailyActivity[] = [];
  for (const w of weeks) {
    for (const day of w.daily) {
      const matching = (day.entries ?? []).filter(e => e.projectId === projectId);
      for (const e of matching) {
        out.push({
          date: day.date,
          weekday: day.weekday,
          weekId: w.week,
          filesChanged: day.filesChanged,
          did: e.did,
          logFilePath: e.logFilePath,
          images: e.images,
        });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** 현재 주차 = listWeekIds()의 가장 최신. data가 없으면 fallback id 반환. */
export async function getCurrentWeekId(): Promise<string> {
  const ids = await listWeekIds();
  return ids[0] ?? '2026-W18';
}

/** 직전 호환용. lib/data.ts를 import하는 페이지가 이 상수에 의존하는 경우 보존. */
export const CURRENT_WEEK_ID = '2026-W18';

/* ─────────────────────────────────────────────────────────────
   4. Monthly — 파일 우선 → 동적 집계 fallback
   ───────────────────────────────────────────────────────────── */

/** 단일 monthly. 파일 우선, 없으면 weekly에서 동적 집계. */
export async function loadMonth(monthId: string): Promise<MonthlySnapshot | null> {
  // (1) 파일 시도
  try {
    const raw = await fs.readFile(path.join(MONTHLY_DIR, `${monthId}.json`), 'utf-8');
    return JSON.parse(raw) as MonthlySnapshot;
  } catch {
    // 파일 없음 → 집계 fallback
  }

  // (2) 동적 집계
  return await aggregateMonthFromWeeklies(monthId);
}

async function aggregateMonthFromWeeklies(monthId: string): Promise<MonthlySnapshot | null> {
  const weekIds = getWeeksOfMonth(monthId);
  if (weekIds.length === 0) return null;

  const weeks = (await Promise.all(weekIds.map(loadWeek))).filter(
    (w): w is WeeklySnapshot => w !== null,
  );
  if (weeks.length === 0) return null;

  let totalFiles = 0;
  let activeSum = 0;
  let newProjectsCount = 0;
  let milestonesCount = 0;
  const typeBreakdown: Record<ProjectType, number> = {
    research: 0,
    publishing: 0,
    education: 0,
    product: 0,
    design: 0,
    data: 0,
    system: 0,
  };
  const projectFiles = new Map<string, number>();
  const milestones: DecisionEntry[] = [];

  for (const w of weeks) {
    totalFiles += w.kpis.filesChanged;
    activeSum += w.kpis.activeProjects;
    newProjectsCount += w.kpis.newProjects;

    for (const p of w.projects) {
      projectFiles.set(p.id, (projectFiles.get(p.id) ?? 0) + p.filesChanged);
      const meta = getProject(p.id);
      if (meta) typeBreakdown[meta.type] += p.filesChanged;
    }

    for (const d of w.decisions) {
      if (d.isMilestone) {
        milestones.push(d);
        milestonesCount++;
      }
    }
  }

  const topProjects = [...projectFiles.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  return {
    month: monthId,
    weeks: weekIds,
    aggregated: {
      totalFiles,
      avgActive: weeks.length ? Math.round(activeSum / weeks.length) : 0,
      newProjectsCount,
      milestonesCount,
      typeBreakdown,
    },
    topProjects,
    milestones,
    buildAt: new Date().toISOString(),
  };
}

/** 데이터가 있는 월 ID 리스트 (최신순) — 'YYYY-MM' */
export async function listAvailableMonths(year?: string): Promise<string[]> {
  const weekIds = await listWeekIds();
  const months = new Set<string>();
  for (const wid of weekIds) {
    const m = getMonthOfWeek(wid);
    if (!m) continue;
    if (year && !m.startsWith(year)) continue;
    months.add(m);
  }
  return [...months].sort((a, b) => b.localeCompare(a));
}

/* ─────────────────────────────────────────────────────────────
   5. Yearly — 파일 우선 → 동적 집계 fallback
   ───────────────────────────────────────────────────────────── */

export async function loadYear(year: string): Promise<YearlySnapshot | null> {
  try {
    const raw = await fs.readFile(path.join(YEARLY_DIR, `${year}.json`), 'utf-8');
    return JSON.parse(raw) as YearlySnapshot;
  } catch {
    // fallback: monthly 집계
  }
  return await aggregateYearFromMonths(year);
}

async function aggregateYearFromMonths(year: string): Promise<YearlySnapshot | null> {
  const monthIds = await listAvailableMonths(year);
  if (monthIds.length === 0) return null;

  const months = (await Promise.all(monthIds.map(loadMonth))).filter(
    (m): m is MonthlySnapshot => m !== null,
  );

  const totalFiles = months.reduce((s, m) => s + m.aggregated.totalFiles, 0);
  const activeProjects = months.length
    ? Math.round(months.reduce((s, m) => s + m.aggregated.avgActive, 0) / months.length)
    : 0;
  const newProjectsYTD = months.reduce((s, m) => s + m.aggregated.newProjectsCount, 0);
  const milestonesCount = months.reduce((s, m) => s + m.aggregated.milestonesCount, 0);
  const milestones = months.flatMap(m => m.milestones);

  const monthlyTotals = months.map(m => ({
    month: m.month,
    files: m.aggregated.totalFiles,
    topProjectId: m.topProjects[0],
    keyMilestone: m.milestones[0]?.title,
  }));

  return {
    year,
    months: monthIds,
    aggregated: {
      totalFiles,
      activeProjects,
      newProjectsYTD,
      milestonesCount,
    },
    monthlyTotals,
    milestones,
    insights: [],
    buildAt: new Date().toISOString(),
  };
}

/** 데이터가 있는 연도 — 'YYYY' (최신순) */
export async function listAvailableYears(): Promise<string[]> {
  const weekIds = await listWeekIds();
  const years = new Set<string>();
  for (const wid of weekIds) {
    const parsed = parseWeekId(wid);
    if (!parsed) continue;
    years.add(String(parsed.year));
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

/* ─────────────────────────────────────────────────────────────
   6. Project work data
   ───────────────────────────────────────────────────────────── */

export async function loadProjectWork(id: string): Promise<ProjectWorkData | null> {
  try {
    const raw = await fs.readFile(path.join(PROJECTS_DIR, `${id}.json`), 'utf-8');
    return JSON.parse(raw) as ProjectWorkData;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   7. 보조 — Weekly 페이지에서 활동 월별로 그루핑 시 편의
   ───────────────────────────────────────────────────────────── */

export interface MonthGroup {
  monthId: string;       // 'YYYY-MM'
  weekIds: string[];     // 그 달의 모든 ISO 주차 (4 또는 5)
  weeks: Array<WeeklySnapshot | null>; // weekIds 순서, 데이터 없으면 null
  totalFiles: number;
  hasAnyData: boolean;
}

/** 활동 있는 월 + 현재 월 묶어 최신순 반환.
 *  - 현재 월은 데이터 없어도 항상 포함 (사용자 인지용)
 *  - 1월처럼 활동 미미한 달은 자동 제외 */
export async function loadActiveMonthGroups(year: string): Promise<MonthGroup[]> {
  const monthIds = new Set(await listAvailableMonths(year));

  // 현재 연도면 현재 월도 추가 (데이터 없어도)
  const now = new Date();
  const currentYear = String(now.getFullYear());
  if (year === currentYear) {
    const cm = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthIds.add(cm);
  }

  const sortedMonthIds = [...monthIds].sort((a, b) => b.localeCompare(a));
  const groups: MonthGroup[] = [];

  for (const monthId of sortedMonthIds) {
    const allWeekIds = getWeeksOfMonth(monthId);
    const loaded = await Promise.all(allWeekIds.map(loadWeek));
    const totalFiles = loaded.reduce(
      (s, w) => s + (w?.kpis.filesChanged ?? 0),
      0,
    );
    groups.push({
      monthId,
      weekIds: allWeekIds,
      weeks: loaded,
      totalFiles,
      hasAnyData: loaded.some(w => w !== null),
    });
  }

  return groups;
}
