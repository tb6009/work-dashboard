/**
 * Per-project "work panel" data — the 3-column block on /projects/[id].
 * Column 1: 현재 상황 (logs)
 * Column 2: 작업 결과물 (deliverables)
 * Column 3: 다음 작업 (next tasks)
 */

export type FileKind = 'md' | 'html' | 'image' | 'pdf' | 'json' | 'tsx' | 'ts' | 'css' | 'other';

export interface LogEntry {
  date: string;                  // YYYY-MM-DD
  title: string;                 // 한 줄 요약
  logFilePath: string;           // 절대경로 — docs/logs/YYYYMMDD_log.md
  excerpt?: string;              // 추가 컨텍스트 1-2줄
}

export interface Deliverable {
  title: string;                 // 산출물 이름 (한국어 OK)
  filePath: string;              // 절대경로
  fileKind: FileKind;
  summary: string;               // 1-2줄 설명, 한국어
  modifiedAt: string;            // ISO date
}

export interface NextTask {
  title: string;                 // 짧은 액션 제목
  description: string;           // 상세 설명
  priority?: 'high' | 'mid' | 'low';
  estimate?: string;             // '반나절', '1일' 같은 추정
}

export interface ProjectWorkData {
  id: string;                    // '061', '32', '03a' etc.
  currentSituation: {
    summary: string;             // 한 줄로 현재 어디까지 왔는지
    phase?: string;              // 단계 라벨 (e.g. 'Phase 2 — Implementation')
    recentLogs: LogEntry[];      // 최신 3-5건, 최신순
    blockers?: string[];         // 차단 요소가 있다면
  };
  deliverables: Deliverable[];   // 클릭 가능한 결과물 3-8개
  nextTasks: NextTask[];         // 다음 액션 3-6개, 우선순위순
  buildAt: string;               // ISO timestamp
}
