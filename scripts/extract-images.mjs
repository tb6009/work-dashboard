#!/usr/bin/env node
/**
 * extract-images.mjs — 이미지 자동 수집 + 캡션 추출 + public 복사
 *
 * 사용법: node scripts/extract-images.mjs 2026-W21 [--dry]
 *
 * 동작:
 *   1) 워크스페이스에서 .png/.jpg/.jpeg/.webp/.svg 파일 중 주차 범위 + whitelist 폴더에 있는 것 수집
 *   2) 같은 폴더의 README.md / HISTORY.md / PROJECT.md 첫 문단을 caption/purpose로 추출
 *   3) app/public/project-images/<hash>/<filename> 으로 복사
 *   4) weekly JSON의 daily[].entries[].images[] 에 메타데이터 주입
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash as cryptoHash } from 'node:crypto';
import { resolve, dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKSPACE = resolve(ROOT, '..', '..');
const WEEKLY_DIR = join(ROOT, 'app/src/data/weekly');
const PUBLIC_IMG_DIR = join(ROOT, 'app/public/project-images');
const PROJECTS_META_PATH = join(ROOT, 'app/src/data/projects.json');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const BACKFILL = args.includes('--backfill');
const weekId = args.find((a) => /^\d{4}-W\d{2}$/.test(a));
if (!BACKFILL && !weekId) {
  console.error('사용법:\n  node scripts/extract-images.mjs YYYY-WXX [--dry]\n  node scripts/extract-images.mjs --backfill [--dry]   (모든 weekly JSON 일괄 갱신)');
  process.exit(1);
}

// ─── ISO 주차
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
let weekFrom = null, weekTo = null;
if (weekId) {
  const [yStr, wStr] = weekId.split('-W');
  const range = isoWeekRange(+yStr, +wStr);
  weekFrom = range.from; weekTo = range.to;
}
/** date → 'YYYY-WXX' iso week id */
function dateToWeekId(d) {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ─── EXPLICIT 매핑 (extract-from-filesystem.mjs와 동일)
const EXPLICIT = {
  '01_admin/001_블로그': '011', '01_admin/AI_Design_skill': '012',
  '02_Data_Kaywon': '02',
  '03_school_project/Data_Jstrata': '031', '03_school_project/Data_Once': '032',
  '03_school_project/Data_Study': '033', '03_school_project/MNServe': '034',
  '03_school_project/관리비책': '035', '03_school_project/새론솔루션': '036',
  '03_school_project/기초디자인': '037', '03_school_project/코첼라': '038',
  '04_aSSIST/수업실습': '04',
  '05_phD_Research/DSAPG': '051', '05_phD_Research/페르소나_연구': '052',
  '05_phD_Research/053_ResearchMasterBot': '053', '05_phD_Research/연구논문02': '054',
  '05_phD_Research/연구방법론': '055', '05_phD_Research/연구논문 03_persona': '056',
  '06_Personal_Project/061_LifeOS': '061', '06_Personal_Project/062_논문리더': '062',
  '06_Personal_Project/063_workDashboard': '063', '06_Personal_Project/064_프로젝트매뉴얼': '064',
  '06_Personal_Project/065_인터뷰': '065', '06_Personal_Project/066_소규모조직_AI': '066',
  '06_Personal_Project/디자인매거진': '067',
  '08_project/081_Anchornode': '081', '08_project/082_ICCS': '082',
  '08_project/083_촬영용스크립트': '083', '08_project/084_강연시리즈': '084',
  '09_몸과마음의과학/091_출판기획': '091', '09_몸과마음의과학/092_영상과제': '092',
  '10_보고살피다/101_일상다반사': '101', '10_보고살피다/102_GPT_실험': '102',
  '10_보고살피다/103_Gemini_실험': '103',
};
function findProjectId(absPath) {
  const rel = relative(WORKSPACE, absPath);
  const cands = Object.keys(EXPLICIT).sort((a, b) => b.length - a.length);
  for (const prefix of cands) {
    if (rel.startsWith(prefix + '/') || rel === prefix) return EXPLICIT[prefix];
  }
  return null;
}

// ─── 화이트리스트 폴더 키워드 (이미지가 산출물성일 가능성 높은 곳)
const IMG_WHITELIST_KEYWORDS = [
  '05_제작', 'images', '시안', 'mockup', 'logo', 'character', '생성이미지',
  'image_generation', 'design', 'reference', '레퍼런스', '캐릭터',
  '04_레퍼런스', '03_프롬프트', '01_logo', 'illustration', '01_design',
  '02_brand_campaign', 'posters', 'outputs', '_design',
];
function isWhitelistImage(absPath) {
  const rel = relative(WORKSPACE, absPath);
  return IMG_WHITELIST_KEYWORDS.some(k => rel.includes(k));
}

// ─── 제외 패턴
const EXCLUDE_DIR = new Set([
  'node_modules', '.git', '.next', 'venv', '__pycache__', '.venv',
  'dist', 'build', 'out', '.vercel', '_archive', '_archive_20260424',
  '_backups', '_backups_20260424', '_drafts', '.smart-env',
]);
const EXCLUDE_REL = ['00_personal/data', '00_personal/reports', '학생과제파일', 'raw', 'private'];
const IMG_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
const MAX_IMG_SIZE = 5 * 1024 * 1024; // 5MB

function shouldExcludeRel(rel) {
  return EXCLUDE_REL.some(p => rel.includes(p));
}

// ─── walk
const collected = [];
function walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.claude') continue;
    if (EXCLUDE_DIR.has(e.name)) continue;
    const abs = join(dir, e.name);
    const rel = relative(WORKSPACE, abs);
    if (shouldExcludeRel(rel)) continue;
    if (e.isDirectory()) walk(abs);
    else if (IMG_EXT.test(e.name)) {
      try {
        const st = statSync(abs);
        const inRange = BACKFILL ? true : (st.mtime >= weekFrom && st.mtime < weekTo);
        if (inRange && st.size <= MAX_IMG_SIZE && isWhitelistImage(abs)) {
          const id = findProjectId(abs);
          if (id) collected.push({ abs, rel, mtime: st.mtime, projectId: id, size: st.size });
        }
      } catch {}
    }
  }
}
for (const cat of Object.keys({ '01_admin': 1, '02_Data_Kaywon': 1, '03_school_project': 1, '04_aSSIST': 1,
    '05_phD_Research': 1, '06_Personal_Project': 1, '08_project': 1, '09_몸과마음의과학': 1, '10_보고살피다': 1 })) {
  const root = join(WORKSPACE, cat);
  if (existsSync(root)) walk(root);
}
console.log(`📷 이미지 수집: ${collected.length}건`);

// ─── 폴더별 README/HISTORY/PROJECT 첫 문단 캐시
const captionCache = new Map();
function extractFirstParagraph(path) {
  try {
    const text = readFileSync(path, 'utf-8');
    // 첫 비어있지 않은 줄(헤더 #으로 시작 아닌 것)
    const lines = text.split('\n');
    let collected = [];
    let started = false;
    for (const line of lines) {
      const t = line.trim();
      if (!t) { if (started) break; else continue; }
      if (t.startsWith('#')) continue;
      if (t.startsWith('>')) { collected.push(t.replace(/^>\s*/, '')); started = true; continue; }
      collected.push(t);
      started = true;
      if (collected.join(' ').length > 200) break;
    }
    return collected.join(' ').slice(0, 200).replace(/\*\*/g, '');
  } catch { return null; }
}
function getFolderContext(absPath) {
  const dir = dirname(absPath);
  if (captionCache.has(dir)) return captionCache.get(dir);
  const result = { caption: null, purpose: null };
  for (const name of ['README.md', 'HISTORY.md']) {
    const p = join(dir, name);
    if (existsSync(p)) { result.caption = extractFirstParagraph(p); break; }
  }
  // purpose: 상위 PROJECT.md 까지 올라가서 찾음 (최대 4단계)
  let cur = dir;
  for (let i = 0; i < 4; i++) {
    const p = join(cur, 'PROJECT.md');
    if (existsSync(p)) { result.purpose = extractFirstParagraph(p); break; }
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  captionCache.set(dir, result);
  return result;
}

// ─── public/project-images/ 복사 + manifest 생성
const manifest = []; // { projectId, date, image meta }
if (!DRY) {
  if (!existsSync(PUBLIC_IMG_DIR)) mkdirSync(PUBLIC_IMG_DIR, { recursive: true });
}
let copiedCount = 0;
const SHORT = (s) => cryptoHash('sha1').update(s).digest('hex').slice(0, 8);

for (const img of collected) {
  const folderRel = relative(WORKSPACE, dirname(img.abs));
  // 폴더 단위 디렉토리: <projectId>__<folderHash>
  const folderId = `${img.projectId}__${SHORT(folderRel)}`;
  const destDir = join(PUBLIC_IMG_DIR, folderId);
  const destFile = join(destDir, basename(img.abs));
  const publicPath = `/project-images/${folderId}/${basename(img.abs)}`;

  if (!DRY) {
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
    if (!existsSync(destFile)) {
      try { copyFileSync(img.abs, destFile); copiedCount++; } catch (e) {
        console.error(`  ❌ 복사 실패 ${img.abs}: ${e.message}`);
        continue;
      }
    }
  }

  const ctx = getFolderContext(img.abs);
  // folderContext = projectName 부분 + 경로 하위
  const segments = folderRel.split('/');
  const folderContext = segments.slice(0, 5).join(' / ');

  manifest.push({
    projectId: img.projectId,
    date: img.mtime.toISOString().slice(0, 10),
    image: {
      publicPath,
      sourcePath: img.abs,
      filename: basename(img.abs),
      folderContext,
      mtime: img.mtime.toISOString(),
      caption: ctx.caption ?? undefined,
      purpose: ctx.purpose ?? undefined,
    }
  });
}

console.log(`📋 manifest 생성: ${manifest.length}건 (복사: ${copiedCount}건)`);

if (DRY) {
  console.log('🔍 DRY-RUN — 미리보기 5건');
  for (const m of manifest.slice(0, 5)) {
    console.log(`  [${m.projectId}] ${m.date} ${m.image.filename}`);
    console.log(`     📁 ${m.image.folderContext}`);
    if (m.image.caption) console.log(`     📝 ${m.image.caption.slice(0, 80)}`);
  }
  process.exit(0);
}

// ─── weekly JSON 갱신: daily[].entries[].images[]
//     단일 주차 또는 backfill 모드에 따라 대상 weekly 결정
function applyToWeekly(targetWeekId) {
  const weeklyPath = join(WEEKLY_DIR, `${targetWeekId}.json`);
  if (!existsSync(weeklyPath)) return { found: false, attached: 0 };
  const w = JSON.parse(readFileSync(weeklyPath, 'utf-8'));
  let attached = 0;
  for (const day of w.daily) {
    const dayImages = manifest.filter((m) => m.date === day.date);
    if (dayImages.length === 0) continue;
    const byProject = new Map();
    for (const m of dayImages) {
      if (!byProject.has(m.projectId)) byProject.set(m.projectId, []);
      byProject.get(m.projectId).push(m.image);
    }
    if (!day.entries) day.entries = [];
    for (const [pid, images] of byProject) {
      const top = images.slice(0, 12);
      const existing = day.entries.find((e) => e.projectId === pid);
      if (existing) {
        existing.images = top;
      } else {
        day.entries.push({
          projectId: pid,
          did: `[이미지 ${images.length}장] ${[...new Set(top.map((i) => i.folderContext.split(' / ').pop()))].join(' · ')}`,
          images: top,
        });
        if (!day.topProjectIds.includes(pid)) day.topProjectIds.push(pid);
      }
      attached += top.length;
    }
  }
  w.buildAt = new Date().toISOString();
  writeFileSync(weeklyPath, JSON.stringify(w, null, 2) + '\n', 'utf-8');
  return { found: true, attached };
}

if (BACKFILL) {
  // mtime → week 그룹핑 후 각 weekly 일괄 갱신
  const byWeek = new Map();
  for (const m of manifest) {
    const wid = dateToWeekId(new Date(m.image.mtime));
    if (!byWeek.has(wid)) byWeek.set(wid, 0);
    byWeek.set(wid, byWeek.get(wid) + 1);
  }
  const sorted = [...byWeek.keys()].sort();
  console.log(`📦 영향 weekly: ${sorted.length}개`);
  let totalAttached = 0, missing = [];
  for (const wid of sorted) {
    const { found, attached } = applyToWeekly(wid);
    if (found) {
      console.log(`  ✅ ${wid}: ${attached} attached (${byWeek.get(wid)} 후보)`);
      totalAttached += attached;
    } else {
      missing.push(wid);
      console.log(`  ⚠️  ${wid}: weekly JSON 없음 (${byWeek.get(wid)} 후보 스킵)`);
    }
  }
  console.log(`\n✅ 총 ${totalAttached} 이미지 attached, ${missing.length} 주차 스킵 (${missing.slice(0,5).join(', ')}${missing.length>5?' ...':''})`);
} else {
  const { found, attached } = applyToWeekly(weekId);
  if (!found) { console.error(`❌ ${weekId}.json 없음`); process.exit(1); }
  console.log(`✅ ${weekId}.json 갱신 — ${attached} 이미지 attached`);
}
