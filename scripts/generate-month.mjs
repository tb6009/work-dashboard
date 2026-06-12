#!/usr/bin/env node
/**
 * generate-month.mjs — Phase 4: 월간 JSON 자동 집계
 *
 * 사용법:
 *   node scripts/generate-month.mjs 2026-06
 *
 * 입력: app/src/data/weekly/YYYY-WXX.json (해당 월의 주차들)
 *       app/src/data/projects.json
 *
 * 출력: app/src/data/monthly/YYYY-MM.json
 *
 * 주의:
 *   - 기존 파일이 있으면 retro.userComment는 보존
 *   - retro의 narrative 필드는 빈 string으로 생성 → /월간회고 명령으로 채움
 *   - 이 스크립트는 기계적 집계만 담당 (Tier 1)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WEEKLY_DIR = join(ROOT, 'app/src/data/weekly');
const MONTHLY_DIR = join(ROOT, 'app/src/data/monthly');
const PROJECTS_PATH = join(ROOT, 'app/src/data/projects.json');

// ─────────────────────────────────────────────────────────────
// 1. 인자 파싱
// ─────────────────────────────────────────────────────────────
const monthId = process.argv[2];
if (!monthId || !/^\d{4}-\d{2}$/.test(monthId)) {
  console.error('사용법: node scripts/generate-month.mjs YYYY-MM  (예: 2026-06)');
  process.exit(1);
}

const [yearStr, monthStr] = monthId.split('-');
const year = Number(yearStr);
const month = Number(monthStr);
console.log(`📅 월간 집계: ${monthId}`);

// ─────────────────────────────────────────────────────────────
// 2. ISO 주차 계산
// ─────────────────────────────────────────────────────────────
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7), year: d.getUTCFullYear() };
}

function getISOWeekRange(y, w) {
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const monday = new Date(week1Mon);
  monday.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday), thursday };
}

// 해당 월에 속하는 ISO 주차 목록 (목요일 기준)
function getWeeksOfMonth(y, m) {
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const seen = new Set();
  const weeks = [];
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(Date.UTC(y, m - 1, day));
    const { week: wkNum, year: wkYear } = getISOWeekNumber(date);
    const wkId = `${wkYear}-W${String(wkNum).padStart(2, '0')}`;
    if (seen.has(wkId)) continue;
    // 목요일이 이 달에 있는지 확인
    const range = getISOWeekRange(wkYear, wkNum);
    const thu = range.thursday;
    if (thu.getUTCFullYear() === y && thu.getUTCMonth() + 1 === m) {
      seen.add(wkId);
      weeks.push({ wkId, from: range.from, to: range.to });
    }
  }
  return weeks;
}

const weekEntries = getWeeksOfMonth(year, month);
console.log(`  주차: ${weekEntries.map(w => w.wkId).join(', ')}`);

// ─────────────────────────────────────────────────────────────
// 3. 프로젝트 메타 로드
// ─────────────────────────────────────────────────────────────
const projects = JSON.parse(readFileSync(PROJECTS_PATH, 'utf-8'));
const projectById = new Map(projects.map(p => [p.id, p]));

// ─────────────────────────────────────────────────────────────
// 4. 주간 JSON 로드 + 집계
// ─────────────────────────────────────────────────────────────
const TYPE_ORDER = ['product', 'publishing', 'research', 'design', 'system', 'data', 'education'];
const typeBreakdown = Object.fromEntries(TYPE_ORDER.map(t => [t, 0]));
const projectFiles = new Map();
const milestones = [];
const weeklyFlowRaw = [];
let totalFiles = 0;
let activeProjectsSum = 0;
let newProjectsCount = 0;
let activeDays = 0;
let totalDays = 0;
let peakDay = { date: '', weekday: '', files: 0 };
let costUSD = 0;
let messages = 0;

const loadedWeeks = [];

for (const { wkId, from, to } of weekEntries) {
  const p = join(WEEKLY_DIR, `${wkId}.json`);
  if (!existsSync(p)) {
    console.log(`  ⚠️  ${wkId}.json 없음 — 스킵`);
    weeklyFlowRaw.push({ week: wkId, period: `${from.slice(5)} ~ ${to.slice(5)}`, files: 0, label: '', headline: '', narrative: '' });
    continue;
  }
  const w = JSON.parse(readFileSync(p, 'utf-8'));
  loadedWeeks.push(w);

  totalFiles += w.kpis.filesChanged;
  activeProjectsSum += w.kpis.activeProjects;
  newProjectsCount += w.kpis.newProjects;

  // 활동일 + peakDay (해당 월 날짜만)
  for (const d of w.daily) {
    if (!d.date.startsWith(yearStr + '-' + monthStr)) continue;
    totalDays++;
    if (d.filesChanged > 0) activeDays++;
    if (d.filesChanged > peakDay.files) {
      peakDay = { date: d.date, weekday: d.weekday, files: d.filesChanged };
    }
  }

  // 타입별 파일 수 집계
  for (const proj of w.projects) {
    const fc = proj.filesChanged ?? 0;
    projectFiles.set(proj.id, (projectFiles.get(proj.id) ?? 0) + fc);
    const meta = projectById.get(proj.id);
    if (meta && typeBreakdown[meta.type] !== undefined) {
      typeBreakdown[meta.type] += fc;
    }
  }

  // 마일스톤
  for (const d of w.decisions) {
    if (d.isMilestone) milestones.push(d);
  }

  // 토큰 비용 + 메시지 수 (daily entries의 byModel에서 집계)
  if (w.tokens?.costUSD) costUSD += w.tokens.costUSD;
  for (const day of w.daily) {
    for (const entry of day.entries ?? []) {
      if (entry.tokens?.byModel) {
        for (const m of Object.values(entry.tokens.byModel)) {
          messages += m.messages ?? 0;
        }
      }
    }
  }

  // 주간 흐름 요약 (stub)
  const topProject = w.projects.sort((a, b) => b.pct - a.pct)[0];
  weeklyFlowRaw.push({
    week: wkId,
    period: `${from.slice(5)} ~ ${to.slice(5)}`,
    files: w.kpis.filesChanged,
    label: topProject?.id ?? '',
    headline: w.summary ?? '',
    narrative: '',
  });
}

const avgActive = loadedWeeks.length ? Math.round(activeProjectsSum / loadedWeeks.length) : 0;
const milestonesCount = milestones.length;

const topProjects = [...projectFiles.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([id]) => id);

// peakWeek
const peakWeekEntry = weeklyFlowRaw.reduce((best, w) => w.files > best.files ? w : best, { files: 0, week: '', period: '' });

// typeBreakdown 퍼센트 + topProjects per area
const totalTypeFiles = Object.values(typeBreakdown).reduce((s, v) => s + v, 0);
const areaBreakdown = TYPE_ORDER
  .filter(t => typeBreakdown[t] > 0)
  .sort((a, b) => typeBreakdown[b] - typeBreakdown[a])
  .map(t => {
    const topInType = [...projectFiles.entries()]
      .filter(([id]) => projectById.get(id)?.type === t)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    return {
      area: t,
      type: t,
      files: typeBreakdown[t],
      pct: totalTypeFiles ? Math.round((typeBreakdown[t] / totalTypeFiles) * 100) : 0,
      topProjects: topInType,
      highlight: '',
      narrative: '',
    };
  });

// ─────────────────────────────────────────────────────────────
// 5. 기존 파일 보존 (userComment)
// ─────────────────────────────────────────────────────────────
const outPath = join(MONTHLY_DIR, `${monthId}.json`);
let existingUserComment = null;
if (existsSync(outPath)) {
  try {
    const existing = JSON.parse(readFileSync(outPath, 'utf-8'));
    existingUserComment = existing.retro?.userComment ?? null;
    console.log(`  ℹ️  기존 파일 발견 — userComment 보존`);
  } catch {}
}

// ─────────────────────────────────────────────────────────────
// 6. 월간 JSON 생성
// ─────────────────────────────────────────────────────────────
const monthLabel = ['', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'][month];

const output = {
  month: monthId,
  weeks: weekEntries.map(w => w.wkId),
  aggregated: {
    totalFiles,
    avgActive,
    newProjectsCount,
    milestonesCount,
    typeBreakdown,
  },
  topProjects,
  milestones,
  retro: {
    headline: `${yearStr}년 ${monthLabel} 회고`,
    stats: {
      filesChanged: totalFiles,
      activeDays,
      totalDays: totalDays || weekEntries.length * 7,
      decisions: loadedWeeks.reduce((s, w) => s + w.decisions.length, 0),
      newProjectsRegistered: newProjectsCount,
      peakDay,
      peakWeek: { week: peakWeekEntry.week, files: peakWeekEntry.files, period: peakWeekEntry.period },
      costUSD: Math.round(costUSD * 100) / 100,
      messages,
    },
    weeklyFlow: weeklyFlowRaw,
    areaBreakdown,
    keyMilestones: milestones.slice(0, 10).map(m => ({
      date: m.date,
      projectId: m.projectId,
      title: m.title,
      impact: '',
    })),
    userComment: existingUserComment ?? {
      overall: '',
      wentWell: [],
      couldImprove: [],
      nextMonth: [],
    },
  },
  buildAt: new Date().toISOString(),
};

mkdirSync(MONTHLY_DIR, { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

console.log(`\n✅ ${outPath} 생성 완료`);
console.log(`   총 파일 변경: ${totalFiles}  |  활동일: ${activeDays}일  |  마일스톤: ${milestonesCount}건`);
console.log(`   상위 프로젝트: ${topProjects.join(', ')}`);
console.log(`   AI 비용: $${Math.round(costUSD * 100) / 100}  |  메시지: ${messages}회`);
console.log('\n📝 다음 단계: /월간회고 명령으로 narrative 채우기');
