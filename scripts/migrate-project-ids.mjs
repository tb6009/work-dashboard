#!/usr/bin/env node
/**
 * migrate-project-ids.mjs — 옛 ID → 새 ID 일괄 마이그레이션
 *
 * 1) app/src/data/projects/<old>.json → <new>.json (id 필드도 갱신)
 * 2) app/src/data/weekly/*.json 내 projectId 참조 일괄 치환:
 *    - projects[].id
 *    - decisions[].projectId
 *    - daily[].topProjectIds[]
 *    - daily[].entries[].projectId
 *    - newProjects[]
 *
 * projects.json 자체는 별도로 손으로 갱신 (메타 + aliases 추가가 필요).
 *
 * Dry-run: node scripts/migrate-project-ids.mjs --dry
 * Apply:   node scripts/migrate-project-ids.mjs
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROJECTS_DIR = join(ROOT, 'app/src/data/projects');
const WEEKLY_DIR = join(ROOT, 'app/src/data/weekly');

const DRY = process.argv.includes('--dry');

// old → new 매핑. 폴더 위치 변경으로 ID가 카테고리 prefix를 받게 됨.
const ID_MAPPING = {
  '05': '051',   // DSAPG → 05_phD_Research/DSAPG
  '06': '012',   // AI_Design_skill → 01_admin/AI_Design_skill
  '08': '034',   // MNServe → 03_school_project/MNServe
  '10': '101',   // 일상다반사 → 10_보고살피다/101_일상다반사
  '11': '067',   // 디자인매거진 → 06_Personal_Project/디자인매거진
  '12': '033',   // Data_Study → 03_school_project/Data_Study
  '21': '054',   // 연구논문02(CPSF) → 05_phD_Research/연구논문02
  '22': '02',    // Data_Kaywon → 02_Data_Kaywon (카테고리 ID와 동일)
  '31': '083',   // 촬영용 스크립트 → 08_project/083_촬영용스크립트
  '32': '084',   // 강연시리즈 → 08_project/084_강연시리즈
  '51': '052',   // 페르소나 연구 → 05_phD_Research/페르소나_연구
};

console.log('📦 ID 마이그레이션 — ' + Object.keys(ID_MAPPING).length + '건');
console.log(DRY ? '🔍 DRY-RUN (변경 없음)' : '⚠️  실제 변경 모드');
for (const [oldId, newId] of Object.entries(ID_MAPPING)) {
  console.log(`   ${oldId.padEnd(4)} → ${newId}`);
}

let renamedFiles = 0;
let updatedWeeklies = 0;
let totalRefs = 0;

// ─────────────────────────────────────────────────────────
// 1) project detail JSON 파일명 + id 필드 갱신
// ─────────────────────────────────────────────────────────
console.log('\n[1/2] Project detail JSON 파일 갱신');
for (const [oldId, newId] of Object.entries(ID_MAPPING)) {
  const oldPath = join(PROJECTS_DIR, `${oldId}.json`);
  const newPath = join(PROJECTS_DIR, `${newId}.json`);

  if (!existsSync(oldPath)) {
    console.log(`   ⚠️  ${oldId}.json 없음 — 스킵`);
    continue;
  }
  if (existsSync(newPath)) {
    console.log(`   ❌ ${newId}.json 이미 존재 — 충돌. 수동 처리 필요`);
    continue;
  }

  const data = JSON.parse(readFileSync(oldPath, 'utf-8'));
  data.id = newId;

  if (DRY) {
    console.log(`   📝 [DRY] ${oldId}.json → ${newId}.json (id 필드 ${data.id})`);
  } else {
    writeFileSync(newPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    renameSync(oldPath, oldPath + '.migrated');  // 안전: 일단 .migrated suffix
    console.log(`   ✅ ${oldId}.json → ${newId}.json`);
    renamedFiles++;
  }
}

// ─────────────────────────────────────────────────────────
// 2) weekly JSON 내 projectId 참조 일괄 치환
// ─────────────────────────────────────────────────────────
console.log('\n[2/2] Weekly JSON projectId 참조 치환');
for (const f of readdirSync(WEEKLY_DIR).sort()) {
  if (!f.endsWith('.json')) continue;
  const path = join(WEEKLY_DIR, f);
  const w = JSON.parse(readFileSync(path, 'utf-8'));
  let refCount = 0;
  const remap = (id) => {
    if (ID_MAPPING[id]) {
      refCount++;
      return ID_MAPPING[id];
    }
    return id;
  };

  // projects[].id
  for (const p of w.projects || []) p.id = remap(p.id);
  // decisions[].projectId
  for (const d of w.decisions || []) d.projectId = remap(d.projectId);
  // daily[].topProjectIds[] + daily[].entries[].projectId
  for (const day of w.daily || []) {
    if (Array.isArray(day.topProjectIds)) day.topProjectIds = day.topProjectIds.map(remap);
    for (const e of day.entries || []) e.projectId = remap(e.projectId);
  }
  // newProjects[]
  if (Array.isArray(w.newProjects)) w.newProjects = w.newProjects.map(remap);

  if (refCount === 0) {
    console.log(`   - ${f} (변경 없음)`);
    continue;
  }
  if (DRY) {
    console.log(`   📝 [DRY] ${f} — ${refCount} 참조 치환`);
  } else {
    w.buildAt = new Date().toISOString();
    writeFileSync(path, JSON.stringify(w, null, 2) + '\n', 'utf-8');
    console.log(`   ✅ ${f} — ${refCount} 참조 치환`);
    updatedWeeklies++;
    totalRefs += refCount;
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (DRY) {
  console.log('🔍 DRY-RUN 완료 — 변경 없음');
  console.log('   실행: node scripts/migrate-project-ids.mjs');
} else {
  console.log(`✅ 마이그레이션 완료`);
  console.log(`   - Project detail 파일 ${renamedFiles}개 rename`);
  console.log(`   - Weekly JSON ${updatedWeeklies}개 갱신 (총 ${totalRefs} 참조 치환)`);
  console.log(`   - 옛 파일은 .migrated suffix로 보존됨 — 검증 후 별도 삭제`);
}
console.log('\n⚠️  projects.json은 수동 갱신 필요:');
console.log('   - 옛 ID 메타 삭제 + 새 ID로 재작성');
console.log('   - aliases: [oldId] 필드 추가');
console.log('   - 신규 프로젝트 13개 추가 (001_블로그·기초디자인·코첼라·aSSIST·053·056·066·082·092 등)');
console.log('   - 04 antigravity, 07 AIDX 메타 삭제 (폴더 없음, 활동 없음)');
