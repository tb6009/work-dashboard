#!/usr/bin/env node
// extract-token-usage.mjs
//
// ~/.claude/projects/**/*.jsonl 의 assistant 메시지를 스캔해
// (날짜, 프로젝트, 모델)별로 토큰 사용량·비용을 합산해
// app/src/data/weekly/YYYY-WXX.json 의 daily[].entries[]에 tokens 필드로 머지.
//
// 사용: node scripts/extract-token-usage.mjs YYYY-WXX [--dry]
//
// 멱등(idempotent): 매번 그 주차 범위의 JSONL을 처음부터 다시 합산해
// weekly JSON에 덮어쓰기 한다. 누적 카운터를 보관하지 않으므로
// 같은 라인이 두 번 세지지 않는다.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKSPACE = resolve(ROOT, '..', '..');
const WEEKLY_DIR = join(ROOT, 'app/src/data/weekly');
const PROJECTS_META_PATH = join(ROOT, 'app/src/data/projects.json');
const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude/projects');

const weekId = process.argv[2];
const DRY = process.argv.includes('--dry');
if (!weekId || !/^\d{4}-W\d{2}$/.test(weekId)) {
  console.error('사용법: node scripts/extract-token-usage.mjs YYYY-WXX [--dry]');
  process.exit(1);
}

// ─── 모델별 단가 (USD per 1M tokens) ─────────────────────────
// Anthropic 공식 가격 (2026-05 기준).
const PRICING = {
  'claude-opus-4-9':    { in: 15.00, out: 75.00, cache_read: 1.50,  cache_write_5m: 18.75 },
  'claude-opus-4-8':    { in: 15.00, out: 75.00, cache_read: 1.50,  cache_write_5m: 18.75 },
  'claude-opus-4-7':    { in: 15.00, out: 75.00, cache_read: 1.50,  cache_write_5m: 18.75 },
  'claude-opus-4-6':    { in: 15.00, out: 75.00, cache_read: 1.50,  cache_write_5m: 18.75 },
  'claude-sonnet-4-8':  { in:  3.00, out: 15.00, cache_read: 0.30,  cache_write_5m:  3.75 },
  'claude-sonnet-4-7':  { in:  3.00, out: 15.00, cache_read: 0.30,  cache_write_5m:  3.75 },
  'claude-sonnet-4-6':  { in:  3.00, out: 15.00, cache_read: 0.30,  cache_write_5m:  3.75 },
  'claude-sonnet-4-5':  { in:  3.00, out: 15.00, cache_read: 0.30,  cache_write_5m:  3.75 },
  'claude-haiku-4-5':   { in:  1.00, out:  5.00, cache_read: 0.10,  cache_write_5m:  1.25 },
  // OpenAI Codex (gpt-5-codex) — 별도 트래커 필요 (extract-codex-usage.mjs 미구현)
  'gpt-5-codex':        { in:  1.25, out: 10.00, cache_read: 0.125, cache_write_5m:  0    },
};

// `claude-opus-4-7-20260101` → `claude-opus-4-7`
function normalizeModel(model) {
  if (!model || model === '<synthetic>') return null;
  const m = model.match(/^(claude-(?:opus|sonnet|haiku)-\d+-\d+)/);
  return m ? m[1] : model;
}

function costUSD(model, u) {
  const p = PRICING[model];
  if (!p) return 0;
  return (
    (u.in            || 0) * p.in            / 1e6 +
    (u.out           || 0) * p.out           / 1e6 +
    (u.cache_read    || 0) * p.cache_read    / 1e6 +
    (u.cache_write   || 0) * p.cache_write_5m / 1e6
  );
}

// ─── ISO 주차 범위 (KST 기준 날짜로 비교) ────────────────────
function isoWeekRange(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const monday = new Date(week1Mon);
  monday.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);
  return { from: monday, to: sunday };
}

const [yStr, wStr] = weekId.split('-W');
const { from: weekFrom, to: weekTo } = isoWeekRange(+yStr, +wStr);

// UTC ISO → KST YYYY-MM-DD
function kstDate(utcIsoStr) {
  const t = new Date(utcIsoStr).getTime() + 9 * 3600 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

const weekFromDateStr = kstDate(weekFrom.toISOString());
const weekToDateStr   = kstDate(new Date(weekTo.getTime() - 1).toISOString());
console.log(`📅 ${weekId} (KST) = ${weekFromDateStr} ~ ${weekToDateStr}`);
console.log(DRY ? '🔍 DRY-RUN' : '⚠️  apply 모드');

// ─── 프로젝트 매핑 (extract-from-filesystem.mjs 와 동일) ─────
const projects = JSON.parse(readFileSync(PROJECTS_META_PATH, 'utf-8'));
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
  '03_school_project/RISE': '039',
  '04_aSSIST/수업실습': '04',
  '05_phD_Research/DSAPG': '051',
  '05_phD_Research/페르소나_연구': '052',
  '05_phD_Research/053_ResearchMasterBot': '053',
  '05_phD_Research/연구논문02': '054',
  '05_phD_Research/연구방법론': '055',
  '05_phD_Research/연구논문 03_persona': '056',
  '05_phD_Research/질적연구세미나': '057',
  '05_phD_Research/054_질적연구ResearchBot': '058',
  '05_phD_Research/질적연구_Gemini': '059',
  '05_phD_Research/assisst': '060',
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
  // 104_맨프레드교수님은 영구 제외 (개인정보)
};
const CAT_MAP = {
  '01_admin': '01', '02_Data_Kaywon': '02', '03_school_project': '03',
  '05_phD_Research': '05', '06_Personal_Project': '06',
  '08_project': '08', '09_몸과마음의과학': '09', '10_보고살피다': '10',
};

function findProjectIdFromCwd(cwd) {
  if (!cwd) return null;
  // 104_맨프레드교수님은 즉시 제외
  if (cwd.includes('104_맨프레드교수님')) return null;
  if (!cwd.startsWith(WORKSPACE)) return null;
  const rel = relative(WORKSPACE, cwd).normalize('NFC');
  const candidates = Object.keys(EXPLICIT).sort((a, b) => b.length - a.length);
  for (const prefix of candidates) {
    if (rel.startsWith(prefix + '/') || rel === prefix) return EXPLICIT[prefix];
  }
  const cat = rel.split('/')[0];
  if (CAT_MAP[cat] && projects.find(p => p.id === CAT_MAP[cat])) return CAT_MAP[cat];
  return null;
}

// ─── JSONL 스캔 ─────────────────────────────────────────────
function* iterJsonlFiles(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* iterJsonlFiles(full);
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) yield full;
  }
}

// 키: `${date}::${projectId}::${model}`  →  토큰 합계
const bucket = new Map();
let scannedLines = 0;
let countedLines = 0;
let skippedNoProject = 0;
let skippedOutOfWeek = 0;

for (const file of iterJsonlFiles(CLAUDE_PROJECTS_DIR)) {
  const raw = readFileSync(file, 'utf-8');
  for (const line of raw.split('\n')) {
    if (!line) continue;
    scannedLines++;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    if (rec.type !== 'assistant') continue;
    const msg = rec.message;
    if (!msg || !msg.usage) continue;
    const model = normalizeModel(msg.model);
    if (!model) continue;
    if (!rec.timestamp) continue;

    const date = kstDate(rec.timestamp);
    if (date < weekFromDateStr || date > weekToDateStr) {
      skippedOutOfWeek++;
      continue;
    }
    const projectId = findProjectIdFromCwd(rec.cwd);
    if (!projectId) { skippedNoProject++; continue; }

    const u = msg.usage;
    const tokens = {
      in:          u.input_tokens                || 0,
      out:         u.output_tokens               || 0,
      cache_read:  u.cache_read_input_tokens     || 0,
      cache_write: u.cache_creation_input_tokens || 0,
    };
    if (tokens.in + tokens.out + tokens.cache_read + tokens.cache_write === 0) continue;

    const key = `${date}::${projectId}::${model}`;
    const cur = bucket.get(key) || { in: 0, out: 0, cache_read: 0, cache_write: 0, messages: 0 };
    cur.in          += tokens.in;
    cur.out         += tokens.out;
    cur.cache_read  += tokens.cache_read;
    cur.cache_write += tokens.cache_write;
    cur.messages    += 1;
    bucket.set(key, cur);
    countedLines++;
  }
}

console.log(`📊 스캔: ${scannedLines}줄 / 합산: ${countedLines}줄 / 주차밖: ${skippedOutOfWeek} / 프로젝트미매칭: ${skippedNoProject}`);

// ─── (date, projectId)로 다시 묶고 모델별 분해 + 비용 계산 ──
// shape: { date: { projectId: { byModel: {model: {in,out,cr,cw,cost,messages}}, total: {...}, costUSD } } }
const byDay = new Map();
for (const [key, v] of bucket.entries()) {
  const [date, projectId, model] = key.split('::');
  if (!byDay.has(date)) byDay.set(date, new Map());
  const dayMap = byDay.get(date);
  if (!dayMap.has(projectId)) {
    dayMap.set(projectId, {
      byModel: {},
      total: { in: 0, out: 0, cache_read: 0, cache_write: 0, messages: 0 },
      costUSD: 0,
    });
  }
  const cell = dayMap.get(projectId);
  const cost = costUSD(model, v);
  cell.byModel[model] = { ...v, costUSD: +cost.toFixed(4) };
  cell.total.in          += v.in;
  cell.total.out         += v.out;
  cell.total.cache_read  += v.cache_read;
  cell.total.cache_write += v.cache_write;
  cell.total.messages    += v.messages;
  cell.costUSD += cost;
}

// ─── weekly JSON 머지 ───────────────────────────────────────
const weeklyPath = join(WEEKLY_DIR, `${weekId}.json`);
if (!existsSync(weeklyPath)) {
  console.error(`❌ weekly JSON 없음: ${weeklyPath}`);
  console.error(`먼저 auto-capture-activity.sh 또는 extract-week.mjs로 발행본을 만드세요.`);
  process.exit(1);
}
const weekly = JSON.parse(readFileSync(weeklyPath, 'utf-8'));

let touchedEntries = 0;
let newEntries = 0;
let totalCost = 0;
let totalIn = 0;
let totalOut = 0;
let totalCacheR = 0;
let totalCacheW = 0;

for (const day of weekly.daily) {
  const dayBucket = byDay.get(day.date);
  if (!dayBucket) continue;

  if (!day.entries) day.entries = [];
  for (const [projectId, cell] of dayBucket.entries()) {
    const tokensField = {
      byModel: cell.byModel,
      total: cell.total,
      costUSD: +cell.costUSD.toFixed(4),
    };
    totalCost     += cell.costUSD;
    totalIn       += cell.total.in;
    totalOut      += cell.total.out;
    totalCacheR   += cell.total.cache_read;
    totalCacheW   += cell.total.cache_write;

    let entry = day.entries.find(e => e.projectId === projectId);
    if (entry) {
      entry.tokens = tokensField;
      touchedEntries++;
    } else {
      day.entries.push({
        projectId,
        did: '[ai] (no file changes)',
        tokens: tokensField,
      });
      if (!day.topProjectIds) day.topProjectIds = [];
      if (!day.topProjectIds.includes(projectId)) day.topProjectIds.push(projectId);
      newEntries++;
    }
  }
}

// 주 합계
weekly.tokens = {
  total: {
    in:          totalIn,
    out:         totalOut,
    cache_read:  totalCacheR,
    cache_write: totalCacheW,
  },
  costUSD: +totalCost.toFixed(4),
  costKRW: Math.round(totalCost * 1470),
};

console.log(`✏️  업데이트 entry: ${touchedEntries} / 신규 entry: ${newEntries}`);
console.log(`💰 주 합계: in ${totalIn.toLocaleString()} / out ${totalOut.toLocaleString()} / cache_read ${totalCacheR.toLocaleString()} / cache_write ${totalCacheW.toLocaleString()}`);
console.log(`   비용: $${totalCost.toFixed(2)} (≈ ₩${Math.round(totalCost * 1470).toLocaleString()})`);

if (DRY) {
  console.log('🔍 DRY-RUN — 파일 미수정');
} else {
  writeFileSync(weeklyPath, JSON.stringify(weekly, null, 2) + '\n');
  console.log(`✅ 저장: ${relative(ROOT, weeklyPath)}`);
}
