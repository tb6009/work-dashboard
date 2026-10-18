#!/usr/bin/env node
/**
 * extract-project-latest.mjs — 프로젝트별 가장 최근 수정 파일 시각
 *
 * 사용법: node scripts/extract-project-latest.mjs
 * 출력:   app/src/data/project-latest.json  { "<id>": "YYYY-MM-DDTHH:mm:ss" }
 *
 * 폴더 → ID 매핑은 extract-from-filesystem.mjs의 EXPLICIT와 같다.
 * 파일명·경로는 저장하지 않는다 (시각만).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKSPACE = resolve(ROOT, '..', '..');
const OUT = join(ROOT, 'app/src/data/project-latest.json');

const src = readFileSync(join(__dirname, 'extract-from-filesystem.mjs'), 'utf-8');
const MAP = Function(`return ${src.match(/const EXPLICIT = (\{[\s\S]*?\n\});/)[1]}`)();

// 카테고리 umbrella (매핑 안 된 하위 폴더는 umbrella ID로) — extract-from-filesystem.mjs catMap과 같음
const projectIds = new Set(JSON.parse(readFileSync(join(ROOT, 'app/src/data/projects.json'), 'utf-8')).map(p => p.id));
const UMBRELLA = { '01_admin': '01', '02_Data_Kaywon': '02', '03_school_project': '03', '05_phD_Research': '05',
  '06_Personal_Project': '06', '08_project': '08', '09_몸과마음의과학': '09', '10_보고살피다': '10' };
const EXPLICIT = { ...Object.fromEntries(Object.entries(UMBRELLA).filter(([, id]) => projectIds.has(id))), ...MAP };

const EXCLUDE_DIR = new Set([
  'node_modules', '.git', '.next', 'venv', '__pycache__', '.venv',
  'dist', 'build', 'out', '.vercel', '_backups', '_drafts', '.smart-env', '.obsidian',
]);
const EXCLUDE_REL = ['00_personal', '10_보고살피다/104_맨프레드교수님'];

const latest = {};

// 각 매핑 폴더를 스캔하되, 더 깊은 매핑 폴더는 그 ID 몫으로 건너뛴다
const prefixes = Object.keys(EXPLICIT);

for (const prefix of prefixes) {
  const id = EXPLICIT[prefix];
  const base = join(WORKSPACE, prefix);
  const nested = prefixes.filter(p => p !== prefix && p.startsWith(prefix + '/'));
  (function scan(dir) {
    let ents;
    try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name.startsWith('.') || EXCLUDE_DIR.has(e.name)) continue;
      const abs = join(dir, e.name);
      const rel = relative(WORKSPACE, abs).normalize('NFC');
      if (EXCLUDE_REL.some(x => rel.startsWith(x))) continue;
      if (e.isDirectory()) {
        if (nested.includes(rel)) continue;
        scan(abs);
      } else if (e.isFile()) {
        const t = statSync(abs).mtimeMs;
        if (!latest[id] || t > latest[id]) latest[id] = t;
      }
    }
  })(base);
}

const p = n => String(n).padStart(2, '0');
const fmt = ms => { const d = new Date(ms); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
const out = Object.fromEntries(Object.entries(latest).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, fmt(v)]));
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`✅ ${Object.keys(out).length}개 프로젝트 → ${OUT}`);
