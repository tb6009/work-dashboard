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
  categoryId?: string;       // '01'..'10' or '_archived'. 2026-05-17 카테고리화 이후 추가.
  name: string;
  type: ProjectType;
  define: string;
  createdAt?: string;        // ISO date
  status: LabelStatus;
  aliases?: string[];        // 옛 ID (마이그레이션 이력). lookupProject가 fallback으로 검색.
  webUrl?: string;           // 프로덕션 배포 URL (있는 프로젝트만)
  designHistoryUrl?: string; // 디자인 히스토리 페이지 (외부 URL 또는 내부 정적 경로)
}

/** Top-level category meta (2026-05-17 재구조화) */
export interface CategoryMeta {
  id: string;                // '01'..'10'
  name: string;              // folder name suffix, e.g. 'admin', 'school_project'
  label: string;             // 한국어 표시명
  description: string;
  order: number;
  hidden: boolean;           // true면 /projects 인덱스에 미노출 (예: 07 빈 자리)
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

/** Image metadata for gallery display */
export interface DailyImage {
  /** /project-images/... web path (relative to /public) */
  publicPath: string;
  /** original absolute path on disk */
  sourcePath: string;
  /** file name */
  filename: string;
  /** folder context (e.g., "092 영상과제 / 05_제작 / 생성이미지 / character_dev") */
  folderContext: string;
  /** mtime ISO */
  mtime: string;
  /** caption from sibling README/HISTORY first paragraph */
  caption?: string;
  /** purpose from PROJECT.md */
  purpose?: string;
}

export interface TokenTotals {
  in: number;
  out: number;
  cache_read: number;
  cache_write: number;
  messages?: number;
}

export interface TokenUsageByModel {
  in: number;
  out: number;
  cache_read: number;
  cache_write: number;
  messages: number;
  costUSD: number;
}

export interface TokenUsage {
  byModel: Record<string, TokenUsageByModel>;
  total: TokenTotals;
  costUSD: number;
}

export interface WeeklyTokenSummary {
  total: TokenTotals;
  costUSD: number;
  costKRW: number;
}

/** One project's work on a single day — extracted from daily logs */
export interface DailyEntry {
  projectId: string;
  did: string;               // section titles joined, max ~200 chars
  logFilePath?: string;      // absolute path to source log
  images?: DailyImage[];     // collected image files in same date range
  tokens?: TokenUsage;       // Claude Code token usage for (date, project)
}

/** Daily activity bucket */
export interface DailyActivity {
  date: string;              // YYYY-MM-DD
  weekday: string;           // '월'..'일'
  filesChanged: number;
  topProjectIds: string[];
  entries?: DailyEntry[];    // per-project work from docs/logs/YYYYMMDD_log.md
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

  tokens?: WeeklyTokenSummary;

  buildAt: string;           // ISO timestamp
}

export interface MonthlyRetro {
  headline: string;
  stats: {
    filesChanged: number;
    activeDays: number;
    totalDays: number;
    decisions: number;
    newProjectsRegistered: number;
    peakDay: { date: string; weekday: string; files: number };
    peakWeek: { week: string; files: number; period: string };
    costUSD: number;
    messages: number;
  };
  weeklyFlow: Array<{
    week: string;
    period: string;
    files: number;
    label: string;
    headline: string;
    narrative?: string;
  }>;
  areaBreakdown: Array<{
    area: string;
    type: string;
    files: number;
    pct: number;
    topProjects: string[];
    highlight: string;
    narrative?: string;
  }>;
  keyMilestones: Array<{
    date: string;
    projectId: string;
    title: string;
    impact?: string;
  }>;
  userComment: {
    overall: string;
    wentWell: string[];
    couldImprove: string[];
    nextMonth: string[];
  };
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
  retro?: MonthlyRetro;
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
