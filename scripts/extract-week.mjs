#!/usr/bin/env node
/**
 * extract-week.mjs — Tier 1: 기계적 데이터 추출
 *
 * 사용법:
 *   node scripts/extract-week.mjs 2026-W19
 *
 * 입력: ../docs/logs/YYYYMMDD_log.md (해당 주의 일일 로그)
 *       ../PROJECTS.md
 *       app/src/data/projects.json
 *       app/src/data/weekly/{직전주}.json
 *
 * 출력: _drafts/YYYY-WXX_draft.json
 *
 * 주의:
 *   - 의미적 필드(summary, nextAction, blockers)는 빈값/TODO로 둠
 *   - Claude가 .claude/commands/주간업데이트.md 통해 채움
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─────────────────────────────────────────────────────────────
// 0. 경로 설정
// ─────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');                 // 063_workDashboard/
const WORKSPACE = resolve(ROOT, '..');                 // cloude_Code/
const LOGS_DIR = join(WORKSPACE, 'docs', 'logs');
const PROJECTS_META_PATH = join(ROOT, 'app/src/data/projects.json');
const WEEKLY_DIR = join(ROOT, 'app/src/data/weekly');
const DRAFTS_DIR = join(ROOT, '_drafts');

// ─────────────────────────────────────────────────────────────
// 1. 인자 파싱 — 'YYYY-WXX'
// ─────────────────────────────────────────────────────────────
const weekId = process.argv[2];
if (!weekId || !/^\d{4}-W\d{2}$/.test(weekId)) {
  console.error('사용법: node scripts/extract-week.mjs YYYY-WXX  (예: 2026-W19)');
  process.exit(1);
}

const [yearStr, weekStr] = weekId.split('-W');
const year = Number(yearStr);
const weekNum = Number(weekStr);

// ─────────────────────────────────────────────────────────────
// 2. ISO 주차 → 월~일 날짜 범위 계산
// ─────────────────────────────────────────────────────────────
function isoWeekRange(year, week) {
  // ISO 8601: 1주차는 그 해 1월 4일을 포함하는 주
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;        // 일요일=7
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const monday = new Date(week1Mon);
  monday.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday), monday, sunday };
}

const { from, to, monday } = isoWeekRange(year, weekNum);
console.log(`📅 ${weekId} = ${from} ~ ${to}`);

// 일별 날짜 배열 + 요일
const WEEKDAY_KO = ['월', '화', '수', '목', '금', '토', '일'];
const dailyDates = [];
for (let i = 0; i < 7; i++) {
  const d = new Date(monday);
  d.setUTCDate(monday.getUTCDate() + i);
  dailyDates.push({
    date: d.toISOString().slice(0, 10),
    weekday: WEEKDAY_KO[i],
    yyyymmdd: d.toISOString().slice(0, 10).replace(/-/g, ''),
  });
}

// ─────────────────────────────────────────────────────────────
// 3. 프로젝트 메타 로드 + ID 정규식 (긴 ID 먼저)
// ─────────────────────────────────────────────────────────────
const projects = JSON.parse(readFileSync(PROJECTS_META_PATH, 'utf-8'));
const projectIds = projects
  .map((p) => p.id)
  .sort((a, b) => b.length - a.length); // 긴 ID 먼저 (061이 61로 매칭되는 것 방지)

const idRe = new RegExp(
  `(?<![\\w])(${projectIds.map((id) => id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})(?![\\w])`,
  'g',
);

// ─────────────────────────────────────────────────────────────
// 4. 로그 파일 읽기 + 분석
// ─────────────────────────────────────────────────────────────
const dailyData = [];
const projectMentionCounts = new Map(); // id → 총 멘션 수
const projectFileCounts = new Map();    // id → 파일 변경 수 (추정)
const decisions = [];

for (const day of dailyDates) {
  const logPath = join(LOGS_DIR, `${day.yyyymmdd}_log.md`);
  let filesChanged = 0;
  const dayMentions = new Map();

  if (existsSync(logPath)) {
    const text = readFileSync(logPath, 'utf-8');

    // 4.1. 프로젝트 ID 멘션 카운트
    const matches = [...text.matchAll(idRe)];
    for (const m of matches) {
      const id = m[1];
      dayMentions.set(id, (dayMentions.get(id) || 0) + 1);
      projectMentionCounts.set(id, (projectMentionCounts.get(id) || 0) + 1);
    }

    // 4.2. 파일 변경 추정 — "생성/수정 파일" 표 또는 백틱(`) 코드 카운트
    // 보수적 휴리스틱: 백틱으로 감싸진 .md/.tsx/.json/.html/.py 파일 경로 패턴
    const fileRe = /`[^`]*\.(md|tsx?|jsx?|json|html|css|py|sh|mjs)`/g;
    filesChanged = [...text.matchAll(fileRe)].length;

    // 4.3. 결정사항 추출 — '## 주요 결정사항' 또는 '### 주요 결정사항'
    const decRe = /^#{2,3}\s*주요\s*결정사항\s*$([\s\S]*?)(?=^#{1,3}\s|\Z)/gm;
    const decMatch = decRe.exec(text);
    if (decMatch) {
      const block = decMatch[1];
      // 번호 리스트 또는 불릿 추출
      const items = block.match(/^\s*(?:\d+\.|-|\*)\s+(.+)$/gm) || [];
      for (const raw of items) {
        const title = raw.replace(/^\s*(?:\d+\.|-|\*)\s+/, '').trim();
        // 가장 많이 언급된 ID를 그 결정의 projectId로 추정
        const topId = [...dayMentions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
        decisions.push({
          date: day.date,
          projectId: topId,
          title: title.slice(0, 60),
          description: 'TODO — Claude가 채움',
        });
      }
    }

    // 4.4. 프로젝트별 파일 카운트 분배 (멘션 비율)
    const totalMentions = [...dayMentions.values()].reduce((a, b) => a + b, 0) || 1;
    for (const [id, n] of dayMentions) {
      const share = Math.round((filesChanged * n) / totalMentions);
      projectFileCounts.set(id, (projectFileCounts.get(id) || 0) + share);
    }
  }

  // top 3 프로젝트
  const topProjectIds = [...dayMentions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  dailyData.push({
    date: day.date,
    weekday: day.weekday,
    filesChanged,
    topProjectIds,
  });
}

// ─────────────────────────────────────────────────────────────
// 5. 직전 주 비교 → 신규 프로젝트 검출
// ─────────────────────────────────────────────────────────────
function prevWeekId(yearStr, weekNum) {
  if (weekNum > 1) return `${yearStr}-W${String(weekNum - 1).padStart(2, '0')}`;
  return `${Number(yearStr) - 1}-W52`; // 단순화 — 53주차 케이스는 무시
}

const prevId = prevWeekId(yearStr, weekNum);
const prevPath = join(WEEKLY_DIR, `${prevId}.json`);
let prevProjectIds = new Set();
if (existsSync(prevPath)) {
  const prev = JSON.parse(readFileSync(prevPath, 'utf-8'));
  prevProjectIds = new Set(prev.projects.map((p) => p.id));
}
const currentIds = new Set(projectMentionCounts.keys());
const newProjects = [...currentIds].filter((id) => !prevProjectIds.has(id));

// ─────────────────────────────────────────────────────────────
// 6. projects[] 빌드 — pct는 file count 비율, imp/nextAction은 TODO
// ─────────────────────────────────────────────────────────────
const totalFiles = [...projectFileCounts.values()].reduce((a, b) => a + b, 0) || 1;
const projectsArr = [...projectFileCounts.entries()]
  .map(([id, files]) => ({
    id,
    pct: Math.round((files * 100) / totalFiles),
    filesChanged: files,
    imp: 0, // TODO — Claude
    nextAction: 'TODO',
  }))
  .sort((a, b) => b.pct - a.pct);

// ─────────────────────────────────────────────────────────────
// 7. KPIs
// ─────────────────────────────────────────────────────────────
const totalFilesChanged = dailyData.reduce((a, b) => a + b.filesChanged, 0);
const sessions = dailyData.filter((d) => d.filesChanged > 0).length;

const draft = {
  week: weekId,
  range: { from, to },
  status: 'current',
  summary: 'TODO — Claude가 한 줄 요약 작성',
  kpis: {
    activeProjects: projectsArr.length,
    sessions,
    newProjects: newProjects.length,
    filesChanged: totalFilesChanged,
  },
  daily: dailyData,
  projects: projectsArr,
  decisions,
  newProjects,
  labelChanges: [], // TODO — projects.json status 비교는 Claude가
  buildAt: new Date().toISOString(),
  _meta: {
    extractedBy: 'extract-week.mjs',
    extractedAt: new Date().toISOString(),
    todoFields: ['summary', 'projects[].imp', 'projects[].nextAction', 'decisions[].description', 'labelChanges'],
  },
};

// ─────────────────────────────────────────────────────────────
// 8. 출력
// ─────────────────────────────────────────────────────────────
if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });
const outPath = join(DRAFTS_DIR, `${weekId}_draft.json`);
writeFileSync(outPath, JSON.stringify(draft, null, 2) + '\n', 'utf-8');

console.log(`✅ ${outPath}`);
console.log(`   - 활동 프로젝트: ${projectsArr.length}개`);
console.log(`   - 신규 프로젝트: ${newProjects.length}개${newProjects.length ? ` (${newProjects.join(', ')})` : ''}`);
console.log(`   - 파일 변경 추정: ${totalFilesChanged}건`);
console.log(`   - 결정사항: ${decisions.length}건`);
console.log(`   - 활동 일수: ${sessions}일/7일`);
console.log('');
console.log(`▶ 다음 단계: VS Code에서 063_workDashboard 열고 Claude 세션 시작`);
console.log(`   /주간업데이트 ${weekId}`);
