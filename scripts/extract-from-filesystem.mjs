#!/usr/bin/env node
/**
 * extract-from-filesystem.mjs — 파일시스템 mtime 기반 활동 추출
 *
 * docs/logs/*.md가 단일 Claude 세션에서만 작성되어 병렬 세션·직접 편집
 * 작업이 누락되는 문제 해결용. 워크스페이스 전체 폴더를 스캔해 수정 시각이
 * 주차 범위에 들어가는 파일을 찾고, 경로에서 프로젝트 ID를 추론해 daily
 * entries를 생성.
 *
 * 사용법:
 *   node scripts/extract-from-filesystem.mjs 2026-W21          # apply
 *   node scripts/extract-from-filesystem.mjs 2026-W21 --dry    # 미리보기
 *
 * 동작:
 *   1) projects.json에서 모든 (id, define) 매핑 — define의 경로 힌트로 ID 추론
 *   2) 워크스페이스 카테고리 폴더(01~10)를 walk
 *   3) 수정시각이 주차 범위 [월 00:00 ~ 일 23:59] 내 + 화이트리스트 확장자
 *   4) 첫 2-3 경로 세그먼트에서 ID 매칭 — 폴더명 prefix 기반
 *   5) daily[date].entries[projectId].did 에 파일명만 join (개인정보 차단 규칙 준수)
 *   6) 기존 entries와 병합 (덮어쓰지 않고 합침, dedup)
 *
 * 산출물 본문 노출 금지:
 *   - 파일 *이름*만 노출. 본문 미열람.
 *   - 00_personal/data, 00_personal/reports/daily|weekly|monthly 자동 제외.
 *
 * 동시 사용:
 *   - extract-daily-entries.mjs (로그 기반) + 이 스크립트 (파일시스템 기반)
 *   - 같은 (date, projectId) 쌍은 entries 안에서 dedup
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKSPACE = resolve(ROOT, '..', '..');
const WEEKLY_DIR = join(ROOT, 'app/src/data/weekly');
const PROJECTS_META_PATH = join(ROOT, 'app/src/data/projects.json');

const weekId = process.argv[2];
const DRY = process.argv.includes('--dry');
if (!weekId || !/^\d{4}-W\d{2}$/.test(weekId)) {
  console.error('사용법: node scripts/extract-from-filesystem.mjs YYYY-WXX [--dry]');
  process.exit(1);
}

// ─── ISO 주차 → 날짜 범위
function isoWeekRange(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const monday = new Date(week1Mon);
  monday.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);     // 일요일 24:00
  return { from: monday, to: sunday };
}

const [yStr, wStr] = weekId.split('-W');
const { from: weekFrom, to: weekTo } = isoWeekRange(+yStr, +wStr);
console.log(`📅 ${weekId} = ${weekFrom.toISOString().slice(0, 10)} ~ ${new Date(weekTo - 1).toISOString().slice(0, 10)}`);
console.log(DRY ? '🔍 DRY-RUN' : '⚠️  apply 모드');

// ─── 프로젝트 메타 + ID 추론 매핑
const projects = JSON.parse(readFileSync(PROJECTS_META_PATH, 'utf-8'));
// (folder name prefix → project id) 매핑 — define 필드의 경로 힌트 사용
const PATH_TO_ID = new Map();
for (const p of projects) {
  const m = p.define.match(/—\s*([^\s]+)/);
  if (m) PATH_TO_ID.set(m[1].replace(/\/$/, ''), p.id);
  // aliases 포함
}
// 명시적 매핑 보강 (수기)
const EXPLICIT = {
  '01_admin/001_블로그': '011',
  '01_admin/AI_Design_skill': '012',
  '02_Data_Kaywon': '02',
  '03_school_project/Data_Jstrata': '031',
  '03_school_project/Data_Once': '032',
  '03_school_project/Data_Study': '033',
  '03_school_project/MNServe': '034',
  '03_school_project/관리비책': '035',
  '03_school_project/새론솔루션': '036',
  '03_school_project/기초디자인': '037',
  '03_school_project/코첼라': '038',
  '04_aSSIST/수업실습': '04',
  '05_phD_Research/DSAPG': '051',
  '05_phD_Research/페르소나_연구': '052',
  '05_phD_Research/053_ResearchMasterBot': '053',
  '05_phD_Research/연구논문02': '054',
  '05_phD_Research/연구방법론': '055',
  '05_phD_Research/연구논문 03_persona': '056',
  '06_Personal_Project/061_LifeOS': '061',
  '06_Personal_Project/062_논문리더': '062',
  '06_Personal_Project/063_workDashboard': '063',
  '06_Personal_Project/064_프로젝트매뉴얼': '064',
  '06_Personal_Project/065_인터뷰': '065',
  '06_Personal_Project/066_소규모조직_AI': '066',
  '06_Personal_Project/디자인매거진': '067',
  '08_project/081_Anchornode': '081',
  '08_project/082_ICCS': '082',
  '08_project/083_촬영용스크립트': '083',
  '08_project/084_강연시리즈': '084',
  '09_몸과마음의과학/091_출판기획': '091',
  '09_몸과마음의과학/092_영상과제': '092',
  '10_보고살피다/101_일상다반사': '101',
  '10_보고살피다/102_GPT_실험': '102',
  '10_보고살피다/103_Gemini_실험': '103',
};

function findProjectId(absPath) {
  const rel = relative(WORKSPACE, absPath);
  // 가장 깊은(긴) 매칭부터
  const candidates = Object.keys(EXPLICIT).sort((a, b) => b.length - a.length);
  for (const prefix of candidates) {
    if (rel.startsWith(prefix + '/') || rel === prefix) return EXPLICIT[prefix];
  }
  // fallback: 카테고리 root 매칭
  const cat = rel.split('/')[0];
  const catMap = {
    '01_admin': '01', '02_Data_Kaywon': '02', '03_school_project': '03',
    '05_phD_Research': '05', '06_Personal_Project': '06',
    '08_project': '08', '09_몸과마음의과학': '09', '10_보고살피다': '10',
  };
  if (catMap[cat]) {
    // 카테고리 umbrella ID가 projects.json에 있을 때만
    const id = catMap[cat];
    if (projects.find(p => p.id === id)) return id;
  }
  return null;
}

// ─── 제외 패턴
const EXCLUDE_DIR = new Set([
  'node_modules', '.git', '.next', 'venv', '__pycache__', '.venv',
  'dist', 'build', 'out', '.vercel', '_archive', '_archive_20260424',
  '_backups', '_backups_20260424', '_drafts', '.smart-env',
]);
const EXCLUDE_REL = [
  '00_personal/data',
  '00_personal/reports/daily',
  '00_personal/reports/weekly',
  '00_personal/reports/monthly',
];
const INCLUDE_EXT = /\.(md|tsx?|jsx?|json|html|css|py|sh|mjs|yaml|yml|svg|tex)$/i;

function shouldExcludeRel(rel) {
  return EXCLUDE_REL.some(p => rel.startsWith(p));
}

// ─── walk
const found = []; // {absPath, mtime, projectId}
function walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.claude') continue;
    if (EXCLUDE_DIR.has(e.name)) continue;
    const abs = join(dir, e.name);
    const rel = relative(WORKSPACE, abs);
    if (shouldExcludeRel(rel)) continue;
    if (e.isDirectory()) {
      walk(abs);
    } else if (INCLUDE_EXT.test(e.name)) {
      try {
        const st = statSync(abs);
        if (st.mtime >= weekFrom && st.mtime < weekTo) {
          const id = findProjectId(abs);
          if (id) found.push({ abs, rel, mtime: st.mtime, projectId: id });
        }
      } catch {}
    }
  }
}

// 카테고리 루트만 walk
for (const cat of Object.keys({
  '01_admin': 1, '02_Data_Kaywon': 1, '03_school_project': 1, '04_aSSIST': 1,
  '05_phD_Research': 1, '06_Personal_Project': 1, '08_project': 1,
  '09_몸과마음의과학': 1, '10_보고살피다': 1,
})) {
  const root = join(WORKSPACE, cat);
  if (existsSync(root)) walk(root);
}

console.log(`📁 발견한 수정 파일: ${found.length}건`);

// ─── 일자·프로젝트별 그룹핑
const byDayProject = new Map(); // 'YYYY-MM-DD::id' → [filenames]
for (const f of found) {
  const day = f.mtime.toISOString().slice(0, 10);
  const key = day + '::' + f.projectId;
  if (!byDayProject.has(key)) byDayProject.set(key, []);
  byDayProject.get(key).push(f.abs);
}

console.log(`📊 (일자 × 프로젝트) 조합: ${byDayProject.size}건`);

// ─── weekly JSON 갱신
const weeklyPath = join(WEEKLY_DIR, `${weekId}.json`);
if (!existsSync(weeklyPath)) {
  console.error(`❌ ${weekId}.json 없음. extract-week.mjs 먼저 실행.`);
  process.exit(1);
}
const w = JSON.parse(readFileSync(weeklyPath, 'utf-8'));

let updated = 0;
for (const day of w.daily) {
  const dayEntries = day.entries ?? [];
  const existingIds = new Set(dayEntries.map(e => e.projectId));
  for (const [key, files] of byDayProject) {
    const [d, id] = key.split('::');
    if (d !== day.date) continue;
    if (existingIds.has(id)) {
      // 이미 로그 기반 entry가 있으면 skip (로그 우선, 의미적 내용이 더 풍부)
      continue;
    }
    // 파일명만 (개인정보 차단)
    const names = files.map(f => f.split('/').pop()).slice(0, 5);
    const extra = files.length > 5 ? ` 외 ${files.length - 5}건` : '';
    dayEntries.push({
      projectId: id,
      did: `[fs scan] ${names.join(' · ')}${extra}`,
      _source: 'filesystem',
    });
    updated++;
  }
  if (dayEntries.length > 0) {
    day.entries = dayEntries;
    // topProjectIds 보강
    for (const e of dayEntries) {
      if (!day.topProjectIds.includes(e.projectId)) day.topProjectIds.push(e.projectId);
    }
  }
}

console.log(`✏️  추가된 entries: ${updated}건 (로그 기반 entries는 보존)`);

if (DRY) {
  console.log('🔍 DRY-RUN — 변경 없음');
  // 미리보기
  for (const day of w.daily) {
    if (day.entries?.some(e => e._source === 'filesystem')) {
      console.log(`  ${day.date} (${day.weekday}):`);
      for (const e of day.entries.filter(x => x._source === 'filesystem')) {
        console.log(`    [${e.projectId}] ${e.did}`);
      }
    }
  }
} else {
  // _source 필드 제거 후 저장
  for (const day of w.daily) {
    if (day.entries) for (const e of day.entries) delete e._source;
  }
  w.buildAt = new Date().toISOString();
  writeFileSync(weeklyPath, JSON.stringify(w, null, 2) + '\n', 'utf-8');
  console.log(`✅ ${weeklyPath} 저장`);
}
