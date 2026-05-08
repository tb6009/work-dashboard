/**
 * Dashboard data schema — single source of truth.
 * Weekly JSON is the SSOT; monthly/yearly aggregate from weeklies.
 */

export type ProjectType =
  | 'research'      // 박사논문·연구
  | 'publishing'    // 출판·집필
  | 'education'     // 강의·강연
  | 'product'       // 앱·챗봇
  | 'design'        // 디자인·브랜드
  | 'data'          // 데이터·리서치
  | 'system';       // 개인·인프라

export type LabelStatus = 'active' | 'paused' | 'archived' | 'new';

/** Static project metadata — rarely changes */
export interface ProjectMeta {
  id: string;                // '061', '03a', '32'
  name: string;
  type: ProjectType;
  define: string;
  createdAt?: string;        // ISO date
  status: LabelStatus;
}

/** Per-week project contribution */
export interface ProjectContribution {
  id: string;
  pct: number;               // 0–100, this week's relative weight
  filesChanged: number;
  imp: 1 | 2 | 3 | 4 | 5;    // importance dots
  did?: string;              // "이번 주 한 일" — 1-2 line summary, weekly tile에 표시
  nextAction?: string;
  deliverables?: string[];   // file paths or names
}

/** A single decision/milestone within a week */
export interface DecisionEntry {
  date: string;              // YYYY-MM-DD
  projectId: string;
  title: string;
  description: string;
  isMilestone?: boolean;
}

/** Daily activity bucket */
export interface DailyActivity {
  date: string;              // YYYY-MM-DD
  weekday: string;           // '월'..'일'
  filesChanged: number;
  topProjectIds: string[];
}

/** Full weekly snapshot — one file per week */
export interface WeeklySnapshot {
  week: string;              // '2026-W18'
  range: { from: string; to: string };
  status: 'current' | 'past' | 'future';
  summary?: string;          // hero-summary one-liner

  kpis: {
    activeProjects: number;
    sessions: number;
    newProjects: number;
    filesChanged: number;
  };

  daily: DailyActivity[];
  projects: ProjectContribution[];
  decisions: DecisionEntry[];
  newProjects: string[];     // ids
  labelChanges?: Array<{ projectId: string; from: LabelStatus | null; to: LabelStatus }>;

  buildAt: string;           // ISO timestamp
}

/** Monthly aggregate — references weeks, no duplication */
export interface MonthlySnapshot {
  month: string;             // '2026-05'
  weeks: string[];           // ['2026-W18', ...]
  aggregated: {
    totalFiles: number;
    avgActive: number;
    newProjectsCount: number;
    milestonesCount: number;
    typeBreakdown: Record<ProjectType, number>;
  };
  topProjects: string[];     // ids
  milestones: DecisionEntry[];
  buildAt: string;
}

/** Yearly aggregate */
export interface YearlySnapshot {
  year: string;              // '2026'
  months: string[];
  aggregated: {
    totalFiles: number;
    activeProjects: number;
    newProjectsYTD: number;
    milestonesCount: number;
  };
  monthlyTotals: Array<{ month: string; files: number; topProjectId?: string; keyMilestone?: string }>;
  milestones: DecisionEntry[];
  insights: string[];
  buildAt: string;
}
