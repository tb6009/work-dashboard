#!/usr/bin/env node
/**
 * extract-daily-entries.mjs — 일일 로그(`docs/logs/YYYYMMDD_log.md`)에서
 * 그 날의 프로젝트별 작업 내용을 추출해 weekly JSON의 `daily[].entries[]`에 채워넣음.
 *
 * 사용법:
 *   node scripts/extract-daily-entries.mjs                # 모든 weekly JSON 갱신
 *   node scripts/extract-daily-entries.mjs 2026-W17       # 단일 주차만
 *
 * 출처 안전:
 *   - `### N. 제목` 의 **제목만** 추출 (산출물 본문 노출 금지 규칙 준수)
 *   - 제목 max 200자, 4개 초과 시 잘라냄
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKSPACE = resolve(ROOT, '..', '..');
const LOGS_DIR = join(WORKSPACE, 'docs', 'logs');
const WEEKLY_DIR = join(ROOT, 'app/src/data/weekly');
const PROJECTS_META_PATH = join(ROOT, 'app/src/data/projects.json');

const onlyWeek = process.argv[2];

const projects = JSON.parse(readFileSync(PROJECTS_META_PATH, 'utf-8'));
const knownIds = new Set(projects.map(p => p.id));

/** "05_DSAPG", "10-일상다반사", "061_LifeOS" 등에서 ID 추출.
 *  "04-05"(날짜) 같은 패턴은 제외 — 구분자 뒤가 숫자이면 날짜로 간주. */
function extractIdFromMention(text) {
  if (!text) return null;
  // 긴 ID 먼저 매칭하기 위해 3자리 → 2자리 순. 구분자 뒤는 비숫자 강제 (날짜 회피).
  // 전역 검색하여 첫 known ID 반환 (한 줄에 여러 후보가 있을 수 있음).
  const re = /(?<![\w])(\d{2,3})(?=[_\-][^\d])/g;
  for (const m of text.matchAll(re)) {
    if (knownIds.has(m[1])) return m[1];
  }
  return null;
}

/** 의미 없는 제목 (구조 헤딩) — entries에서 제외 */
const GENERIC_TITLES = new Set([
  '작업 세부', '작업 내용', '작성된 섹션 구성', '주요 결정사항',
  '생성된 파일', '생성/수정된 파일', '생성/수정된 파일 목록', '생성된 파일 목록',
  '다음 작업', '다음 작업 (이어서 할 일)', '다음 작업 (내일)',
  '추가 작업 (2차)', '단계별 결과', '실행 방식', '비고',
  '알려진 한계', '실제 수집 검증 (실데이터)', '사용자 결정/액션 필요 (5건)',
  '스펙과의 차이 (Sonnet 판단으로 변경)',
  '신규 생성', '수정', '이동', '이동 (대표 항목)', '메모리 신규',
  '코드/자동화', '리포트', '데이터', '설정/문서',
  '즉시', '그 다음', '나중', '중기', '확인 필요',
  '우선순위 1', '우선순위 2', '우선순위 3 (문서 업데이트 필요)',
  '즉각 처리 가능', '논문 실제 집필 (핵심 블로커)',
  '배경', '6 에이전트 설계 완료 (HANDOFF_SPEC.md 에 상세)',
  '토큰 최적화 전략 (스펙에 명시)', '생성/수정 파일',
  '계획·지침 (마음_프로덕트/01_service/)',
  '캐릭터 버전별 지침 (마음_프로덕트/04_캐릭터_버전별_지침/) — 신규 폴더',
  '학습자료 (자료/04_캐릭터_학습자료/)',
  '챗봇 베타 (outputs/마음_앱/v1.5/)',
  '신규 작성', '관련 메모리', '자료 폴더 재구성 (실행 완료)',
  '갱신된 1문장 기여문 (작업 초안)', '학문적 포지셔닝 확정',
  '즉시 (사용자 직접 작업)', 'Phase 5 통과 후',
  '마음_프로덕트/', 'campaign/', 'development_process/',
]);

/** 로그 파일 한 편 파싱 → [{projectId, did}] */
function parseLog(text, logFilePath) {
  const lines = text.split('\n');
  const blocks = [];                     // [{projectId, titles[]}]
  let curId = null;
  let curTitles = [];
  let mode = null;                       // 'project' | 'summary' | null
  let pendingProjectLookup = false;      // 직전이 "## 작업한 프로젝트"

  const flush = () => {
    if (curId && curTitles.length) {
      const existing = blocks.find(b => b.projectId === curId);
      if (existing) existing.titles.push(...curTitles);
      else blocks.push({ projectId: curId, titles: [...curTitles] });
    }
    curTitles = [];
  };

  for (const line of lines) {
    // ## 작업[한] 프로젝트 헤더
    if (/^##\s+작업한?\s*프로젝트/.test(line)) {
      flush();
      pendingProjectLookup = true;
      mode = 'project';
      continue;
    }
    // ## 작업 내용 요약
    if (/^##\s+작업\s*내용\s*요약/.test(line)) {
      pendingProjectLookup = false;
      mode = 'summary';
      continue;
    }
    // ## [추가] — 새 블록 (프로젝트는 새로 명시되지 않으면 유지)
    if (/^##\s+\[추가\]/.test(line)) {
      flush();
      // [추가] 헤더 자체에서 ID 추출 시도 (예: "## [추가] 09 셋업")
      const inferred = extractIdFromMention(line);
      if (inferred) curId = inferred;
      mode = 'summary';                  // [추가] 이후는 보통 바로 본문 (###)
      continue;
    }
    // 다른 ## 헤더 → 모드 종료 (생성/수정 파일 / 주요 결정사항 등)
    if (/^##\s+/.test(line) && !/^##\s+\[추가\]/.test(line)) {
      mode = null;
      pendingProjectLookup = false;
      continue;
    }

    if (pendingProjectLookup) {
      const id = extractIdFromMention(line);
      if (id) {
        curId = id;
        pendingProjectLookup = false;
      }
      continue;
    }

    if (mode === 'summary') {
      const m = line.match(/^###\s+(?:\d+\.?\s*)?(.+?)\s*$/);
      if (m) {
        const title = m[1].replace(/[*`]/g, '').trim();
        if (title && !GENERIC_TITLES.has(title)) {
          // ### 제목에 프로젝트 ID가 다른 것으로 명시되면 블록 전환
          // 예: "### 2. 몸과마음의과학 에이전트 구축 (`09-몸과마음의과학/`)"
          const idInTitle = extractIdFromMention(line);
          if (idInTitle && idInTitle !== curId) {
            flush();
            curId = idInTitle;
          }
          curTitles.push(title);
        }
      }
    }
  }
  flush();

  return blocks
    .filter(b => b.projectId && b.titles.length)
    .map(b => {
      // 최대 4개 제목, 200자 컷
      const did = b.titles.slice(0, 4).join(' · ').slice(0, 200);
      return { projectId: b.projectId, did, logFilePath };
    });
}

function processWeekly(weekFile) {
  const path = join(WEEKLY_DIR, weekFile);
  const weekly = JSON.parse(readFileSync(path, 'utf-8'));
  let updated = 0;

  for (const day of weekly.daily) {
    const yyyymmdd = day.date.replace(/-/g, '');
    const logPath = join(LOGS_DIR, `${yyyymmdd}_log.md`);
    if (!existsSync(logPath)) {
      if (day.entries) delete day.entries;
      continue;
    }
    const text = readFileSync(logPath, 'utf-8');
    const entries = parseLog(text, logPath);
    if (entries.length === 0) {
      if (day.entries) delete day.entries;
      continue;
    }
    day.entries = entries;
    updated++;
  }

  weekly.buildAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(weekly, null, 2) + '\n', 'utf-8');
  return updated;
}

const files = readdirSync(WEEKLY_DIR)
  .filter(f => f.endsWith('.json'))
  .filter(f => !onlyWeek || f === `${onlyWeek}.json`)
  .sort();

console.log(`📅 대상 weekly: ${files.length}개`);
let totalDays = 0;
for (const f of files) {
  const n = processWeekly(f);
  totalDays += n;
  console.log(`  ${f} → ${n}일 entries 채움`);
}
console.log(`✅ 총 ${totalDays}일 갱신`);
