#!/usr/bin/env node
/**
 * build-kaywon-portfolio.mjs
 * 021_계원 입시 커뮤니케이션(02_Communication_Kaywon)의 제작 프로세스와
 * 캐러셀 버전 아카이브를 workDashboard의 public/kaywon-process/ 로 빌드한다.
 *
 * - 공개 대상: 렌더된 캐러셀 PNG(콘셉트 시안)와 제작 프로세스 서술
 * - 비공개: 입시 원자료 · 🔴 내부 전용 타게팅 분석 원문 · 합성 패널 문안 투표 원문
 * - PNG → JPEG(q80, 최대 1080px / 보드 2000px) 변환으로 195MB → 수십 MB
 *
 * 실행: node scripts/build-kaywon-portfolio.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { LIGHTBOX_CSS, LIGHTBOX_JS } from './lib/lightbox.mjs';

const SRC = '/Users/jinhyunpark/Documents/cloude_Code/02_Communication_Kaywon';
const DEST = path.resolve(import.meta.dirname, '../app/public/kaywon-process');
const BASE = '/kaywon-process';

/* ── 버전 아카이브 정의 (최신순) ── */
const VERSIONS = [
  {
    slug: 'sets345-v2', tag: 'v2', date: '2026-09-18', final: true,
    title: 'SET C·D·E 모바일 업그레이드 v2',
    lede: '기준 세트(SET A v2)의 타이포·자간 체계를 C·D·E에 옮겼다. 배경이 약했던 C-07·E-02·E-07·E-08은 기존 맥락 이미지를 다시 드러내고, 정보가 짧았던 D-07·E-03·E-04·E-06은 설명을 보강했다. 새 이미지는 한 장도 생성하지 않았다.',
    note: '제목 Pretendard 650 · 자간 0.008em(표지 0.012em) · 설명 자간 0.012em · 행간 1.48–1.56',
    src: '05_outputs/03_new_renders/autonomous_major_sets345_v2',
    groups: [
      { label: 'SET C · 전공 하나만 고르기엔, 하고 싶은 게 너무 많아 (오커)', dir: 'abundance' },
      { label: 'SET D · 내 취향은 직접 해봐야 알지 (그린)', dir: 'tactile' },
      { label: 'SET E · 첫 학기는 탐색, 다음 학기는 내 전공으로 (딥블루)', dir: 'structure' },
    ],
    boards: ['board_abundance.png', 'board_structure.png', 'board_tactile.png'],
  },
  {
    slug: 'sets345-v1', tag: 'v1', date: '2026-09-16',
    title: 'SET C·D·E 독립 제작 1차',
    lede: 'SET A에서 확정한 8단계 순서(콘셉트 규정 → 페이지별 이미지 계획 → 키/파생 이미지 → 조판 → 모바일 검수 → 보드 검수 → 국소 수정 → 최종 출력)를 세 세트에 처음 적용한 판. 공통 그리드와 브랜드 규칙은 유지하되 이미지·강조색·페이지 조형은 세트마다 독립 설계했다.',
    note: '모바일 검수에서 제목 굵기와 배경 밀도가 세트마다 흔들리는 것이 드러나 v2로 넘어갔다.',
    src: '05_outputs/06_autonomous_major_sets345_v1',
    groups: [
      { label: 'SET C · 오커', dir: 'abundance' },
      { label: 'SET D · 그린', dir: 'tactile' },
      { label: 'SET E · 딥블루', dir: 'structure' },
    ],
    boards: ['board_abundance.png', 'board_structure.png', 'board_tactile.png'],
  },
  {
    slug: 'set1-v2', tag: 'v2 · 기준', date: '2026-09-16',
    title: 'SET A 모바일 재설계 — 이후 모든 세트의 기준',
    lede: '1차 40페이지를 모바일에서 다시 보고 네 가지를 되돌렸다. 이미지 위 각진 흰색 박스를 없애고 이미지의 네거티브 스페이스에 글을 앉혔고, 표지만 강한 키 이미지를 유지한 채 세부 페이지에는 저밀도 파생 이미지를 따로 만들었다. 경험 정보면은 단색 SVG 아이콘으로 재구성했고, 화면의 근거 표기는 지우되 evidence와 README에는 남겼다.',
    note: '이 8페이지에서 확정된 순서가 C·D·E에 그대로 적용됐다.',
    src: '05_outputs/05_autonomous_major_set1_v2',
    groups: [{ label: 'SET A · 좋아하는 게 하나가 아니라면? (레드)', dir: '', match: /^set1_v2_\d+\.png$/ }],
    boards: ['board_set1_v2.png'],
  },
  {
    slug: 'sets-a-e-v1', tag: 'v1', date: '2026-09-16',
    title: '5개 독립 캐러셀 A~E 1차 — 40페이지',
    lede: '다섯 문안을 한 캐러셀에 섞지 않고 각각 8페이지 독립 캐러셀로 확장했다. 모든 세트가 단독 게시될 수 있고, 공통 정보는 유지하되 독자의 진입 동기와 시각 문법을 다르게 잡았다. 이 판에서 모바일 가독성·이미지 밀도·기계적인 카드 구성·하단 여백 문제가 드러난다.',
    note: 'SET B(경험 우선형)는 이후 프로세스에서 제외됐다. A·C·D·E 32페이지만 v2로 이어진다.',
    src: '05_outputs/04_autonomous_major_carousels',
    groups: [
      { label: 'SET A · 좋아하는 게 하나가 아니라면? (레드)', dir: 'multiple' },
      { label: 'SET B · 내 전공, 경험해보고 고를래 (블루) — 이후 제외', dir: 'experience' },
      { label: 'SET C · 하고 싶은 게 너무 많아 (오커)', dir: 'abundance' },
      { label: 'SET D · 직접 해봐야 알지 (그린)', dir: 'tactile' },
      { label: 'SET E · 첫 학기는 탐색 (딥블루)', dir: 'structure' },
    ],
    boards: ['board_multiple.png', 'board_experience.png', 'board_abundance.png', 'board_tactile.png', 'board_structure.png'],
  },
  {
    slug: 'character-major', tag: 'β', date: '2026-08-26',
    title: '캐릭터 관련 전공 비교 캐러셀',
    lede: '“캐릭터를 하고 싶다”는 하나의 관심이 애니메이션·게임미디어·XR 세 전공으로 갈라지는 지점을 비교로 보여주는 판. PLAY 5.5 β의 계열 Main Color를 전공별 시각색으로만 쓰고 임의색으로 승격하지 않았다.',
    note: '기획·시안 제작까지 완료. 게시용 페이지별 한글 조판은 미확정 상태로 남아 있다.',
    src: '05_outputs/02_character_major_outputs',
    groups: [{ label: '캐릭터 전공 비교 · 9페이지 (green)', dir: '', match: /^character_major_\d+_green\.png$/ }],
    boards: ['board_character_major_green_image2_balanced_4x5.png', 'board_character_major_green_image2_playful.png', 'board_character_major_green.png'],
  },
  {
    slug: 'play55-pilot', tag: 'pilot', date: '2026-08-10',
    title: 'PLAY 5.5 캐러셀 3종 파일럿 — 80점 게이트의 출발점',
    lede: '수시 2차 안내 · 원서접수 실수 방지 · 포트폴리오 vs 면접 세 주제를 각각 7~11페이지로 만들고, 제작 에이전트와 분리된 평가 에이전트로 이중 채점했다. 여기서 “수치 점수”와 “외부 게시 가능 여부”를 분리하는 규칙이 생겼다.',
    note: '모든 페이지에 INTERNAL TEST · NOT FOR PUBLISHING 워터마크가 찍혀 있다. 시안 상태를 지우지 않은 채로 보관한 판이다.',
    src: '05_outputs/01_sync_outputs/preview',
    groups: [
      { label: '2027 수시 2차 안내 · 9페이지 — 총점 84/100', dir: '', match: /^admission_\d+\.png$/ },
      { label: '원서접수 실수 방지 · 9페이지', dir: '', match: /^mistake_\d+\.png$/ },
      { label: '포트폴리오 vs 면접 · 11페이지 — 총점 80/100', dir: '', match: /^portfolio_\d+\.png$/ },
    ],
    boards: ['board_admission.png', 'board_mistakes.png', 'board_portfolio.png'],
  },
];

/* ── 과정·되돌림 자료 (버전 페이지 안에서 함께 본다) ── */
const KV = '04_production/02_assets/autonomous_major_keyvisuals_v0.1';

const DRAFTS = {
  'sets345-v2': {
    title: '되돌린 자리 — v1에서 무엇이 바뀌었나',
    intro: '24페이지 전부 제목·설명의 자간과 굵기를 기준 세트에 맞췄다. 그 위에 개별 문제가 있던 8페이지만 따로 손봤다. 왼쪽이 v1, 오른쪽이 v2다.',
    pairs: [
      { before: ['05_outputs/06_autonomous_major_sets345_v1/abundance/set_C_07.png', 'C-07 · v1'],
        after:  ['05_outputs/03_new_renders/autonomous_major_sets345_v2/abundance/set_C_07.png', 'C-07 · v2'],
        why: '배경이 약해 페이지가 비어 보였다. 새 이미지를 만들지 않고 기존 맥락 이미지를 다시 드러냈다.' },
      { before: ['05_outputs/06_autonomous_major_sets345_v1/structure/set_E_02.png', 'E-02 · v1'],
        after:  ['05_outputs/03_new_renders/autonomous_major_sets345_v2/structure/set_E_02.png', 'E-02 · v2'],
        why: '같은 이유. 배경 보정.' },
      { before: ['05_outputs/06_autonomous_major_sets345_v1/structure/set_E_07.png', 'E-07 · v1'],
        after:  ['05_outputs/03_new_renders/autonomous_major_sets345_v2/structure/set_E_07.png', 'E-07 · v2'],
        why: '같은 이유. 배경 보정.' },
      { before: ['05_outputs/06_autonomous_major_sets345_v1/structure/set_E_08.png', 'E-08 · v1'],
        after:  ['05_outputs/03_new_renders/autonomous_major_sets345_v2/structure/set_E_08.png', 'E-08 · v2'],
        why: 'CTA 페이지. 배경 보정.' },
      { before: ['05_outputs/06_autonomous_major_sets345_v1/tactile/set_D_07.png', 'D-07 · v1'],
        after:  ['05_outputs/03_new_renders/autonomous_major_sets345_v2/tactile/set_D_07.png', 'D-07 · v2'],
        why: '정보가 짧아 페이지가 근거 없이 보였다. 설명 문장을 보강했다.' },
      { before: ['05_outputs/06_autonomous_major_sets345_v1/structure/set_E_03.png', 'E-03 · v1'],
        after:  ['05_outputs/03_new_renders/autonomous_major_sets345_v2/structure/set_E_03.png', 'E-03 · v2'],
        why: '같은 이유. 설명 보강.' },
      { before: ['05_outputs/06_autonomous_major_sets345_v1/structure/set_E_04.png', 'E-04 · v1'],
        after:  ['05_outputs/03_new_renders/autonomous_major_sets345_v2/structure/set_E_04.png', 'E-04 · v2'],
        why: '같은 이유. 설명 보강.' },
      { before: ['05_outputs/06_autonomous_major_sets345_v1/structure/set_E_06.png', 'E-06 · v1'],
        after:  ['05_outputs/03_new_renders/autonomous_major_sets345_v2/structure/set_E_06.png', 'E-06 · v2'],
        why: '같은 이유. 설명 보강.' },
    ],
  },

  'set1-v2': {
    title: '되돌린 자리 — 1차 8페이지를 모바일에서 다시 보다',
    intro: '왼쪽이 1차(A~E v1의 SET A), 오른쪽이 재설계본이다. 되돌린 것은 네 가지 — ① 이미지 위 각진 흰색 박스를 없애고 이미지의 네거티브 스페이스에 글을 앉혔다 ② 표지만 강한 키 이미지를 남기고 세부 페이지용 저밀도 파생 이미지를 따로 만들었다 ③ 세로 카드 나열을 2×2 면으로 묶었다 ④ 화면의 근거 표기를 지우고 evidence와 README에만 남겼다.',
    pairs: Array.from({ length: 8 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return {
        before: [`05_outputs/04_autonomous_major_carousels/multiple/set_A_${n}.png`, `A-${n} · 1차`],
        after:  [`05_outputs/05_autonomous_major_set1_v2/set1_v2_${n}.png`, `A-${n} · 재설계`],
        why: '',
      };
    }),
  },

  'sets-a-e-v1': {
    title: '이미지는 어떻게 만들어졌나 — source → 규격화 → 파생',
    intro: '콘셉트마다 독립 키비주얼을 한 장 만들고(source), 1080×1350으로 규격화한 뒤, 페이지별 장면을 그 키비주얼에서 파생시켰다. 보존된 PNG 30개 중 AI 생성·편집 결과는 25개, 나머지 5개는 단순 규격화본이라 새 생성으로 세지 않는다. 프로젝트 전용 학습·파인튜닝은 0회.',
    lineages: [
      { label: 'SET A · 좋아하는 게 하나가 아니라면 (레드)', items: [
        [`${KV}/01_multiple_interests_source.png`, 'source', '최초 키비주얼'],
        [`${KV}/01_multiple_interests_1080x1350.png`, '규격화', '크롭·리사이즈. 새 생성 아님'],
        [`${KV}/01_multiple_interests_support_v2.png`, '파생 v2', '저밀도 지원 이미지'],
        [`${KV}/01_page02_multiple_interests_v3.png`, '파생 v3', 'p02 장면'],
        [`${KV}/01_page03_discovery_v3.png`, '파생 v3', 'p03 장면'],
        [`${KV}/01_page05_process_v3.png`, '파생 v3', 'p05 장면'],
        [`${KV}/01_page06_target_v3.png`, '파생 v3', 'p06 장면'],
        [`${KV}/01_page07_flow_v3.png`, '파생 v3', 'p07 장면'],
        [`${KV}/01_page08_cta_v3.png`, '파생 v3', 'p08 CTA 1안'],
        [`${KV}/01_page08_cta_ipad_v4.png`, '파생 v4', 'p08 CTA 2안 — 채택'],
      ] },
      { label: 'SET B · 내 전공, 경험해보고 고를래 (블루) — 여기서 멈췄다', items: [
        [`${KV}/02_experience_then_choose_source.png`, 'source', '최초 키비주얼'],
        [`${KV}/02_experience_then_choose_1080x1350.png`, '규격화', '파생 이미지가 없다. SET B는 이후 프로세스에서 제외됐다'],
      ] },
      { label: 'SET C · 하고 싶은 게 너무 많아 (오커)', items: [
        [`${KV}/03_too_many_interests_source.png`, 'source', '최초 키비주얼'],
        [`${KV}/03_too_many_interests_1080x1350.png`, '규격화', ''],
        [`${KV}/03_connected_interests_v3.png`, '파생 v3', '연결 장면'],
        [`${KV}/03_experience_modules_v3.png`, '파생 v3', '경험 모듈'],
        [`${KV}/03_support_compare_v2.png`, '파생 v2', '비교 장면'],
        [`${KV}/03_support_organize_v2.png`, '파생 v2', '정리 장면'],
      ] },
      { label: 'SET D · 직접 해봐야 알지 (그린)', items: [
        [`${KV}/04_try_to_know_source.png`, 'source', '최초 키비주얼'],
        [`${KV}/04_try_to_know_1080x1350.png`, '규격화', ''],
        [`${KV}/04_four_experiments_v3.png`, '파생 v3', '실험 장면'],
        [`${KV}/04_feedback_v3.png`, '파생 v3', '피드백 장면'],
        [`${KV}/04_support_try_v2.png`, '파생 v2', '시도 장면'],
        [`${KV}/04_support_progress_v2.png`, '파생 v2', '진행 장면'],
      ] },
      { label: 'SET E · 첫 학기는 탐색 (딥블루)', items: [
        [`${KV}/05_semester_transition_source.png`, 'source', '최초 키비주얼'],
        [`${KV}/05_semester_transition_1080x1350.png`, '규격화', ''],
        [`${KV}/05_support_flow_v2.png`, '파생 v2', '흐름 장면'],
        [`${KV}/05_preparation_v3.png`, '파생 v3', '준비 장면'],
        [`${KV}/05_support_system_v3.png`, '파생 v3', '지원 장면'],
        [`${KV}/05_support_cta_v2.png`, '파생 v2', 'CTA 장면'],
      ] },
    ],
  },

  'character-major': {
    title: '초안과 수정본 — 색을 바꾸고, 보드를 세 번 다시 짰다',
    intro: '왼쪽이 초안, 오른쪽이 계열 Main Color를 적용한 수정본이다. 전체 보드는 이미지 배치를 바꿔 세 번 다시 뽑았다.',
    pairs: Array.from({ length: 9 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return {
        before: [`05_outputs/02_character_major_outputs/character_major_${n}.png`, `p${n} · 초안`],
        after:  [`05_outputs/02_character_major_outputs/character_major_${n}_green.png`, `p${n} · 색 적용`],
        why: '',
      };
    }),
  },
};

/* 평가 점수 변화는 이미지가 아니라 표로 — play55-pilot 전용 */
const EVAL_DELTA = `
  <h3>평가는 두 번 돌았다</h3>
  <p>파일럿 3종 모두 v0.1에서 지적을 받고 고친 뒤 v0.2에서 다시 채점했다. 점수가 오른 자리가 곧 되돌린 자리다.</p>
  <table>
    <tr><th style="width:230px">파일럿</th><th class="n" style="width:80px">v0.1</th><th class="n" style="width:80px">v0.2</th><th>무엇을 고쳤나</th></tr>
    <tr class="hi"><td><strong>포트폴리오 vs 면접</strong></td><td class="n">80</td><td class="n">92</td><td>p3의 혼합 작품 썸네일을 빼서 단일 작품의 공식 증거 페이지로 의미를 맞췄다. 학교의 지시처럼 들리던 <code>보여주세요</code>를 학생의 연습 행동인 <code>정리해보세요</code>로 바꿨다.</td></tr>
    <tr><td><strong>2027 수시 2차 안내</strong></td><td class="n">—</td><td class="n">86</td><td>p1 브랜드 대비·p4 공식 문구·p7 공식 딥링크와 이미지 증거를 보강했다.</td></tr>
    <tr><td><strong>원서접수 실수 방지</strong></td><td class="n">—</td><td class="n">89</td><td>수험생 관점 46/50. 본문 42px·카드 38px로 모바일 가독성을 올렸다.</td></tr>
  </table>
  <p>그래도 셋 다 외부 게시로 올라가지 못했다. 점수가 아니라 <strong>하드게이트</strong> 때문이다 — 작품명·제작진·연도·재사용 권리가 비어 있었고, PLAY 로고는 PDF에서 추출한 테스트 자산이었다. 그래서 모든 페이지에 <code>INTERNAL TEST · NOT FOR PUBLISHING</code> 워터마크가 그대로 남아 있다.</p>`;

/* ── 이미지 변환 ── */
let converted = 0;
function jpeg(srcAbs, destAbs, maxPx) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80',
    '-Z', String(maxPx), srcAbs, '--out', destAbs], { stdio: 'ignore' });
  converted++;
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });

for (const v of VERSIONS) {
  const srcRoot = path.join(SRC, v.src);
  const outImg = path.join(DEST, 'v', v.slug, 'img');
  v._groups = [];
  for (const g of v.groups) {
    const dir = g.dir ? path.join(srcRoot, g.dir) : srcRoot;
    if (!fs.existsSync(dir)) { console.warn(`  ! 없음: ${v.slug}/${g.dir}`); continue; }
    const files = fs.readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.png'))
      .filter((f) => (g.match ? g.match.test(f) : !f.startsWith('board_')))
      .sort();
    const out = [];
    for (const f of files) {
      const name = `${g.dir || 'p'}_${f.replace(/\.png$/i, '.jpg')}`;
      jpeg(path.join(dir, f), path.join(outImg, name), 1350);
      out.push({ file: name, label: f.replace(/\.png$/i, '') });
    }
    v._groups.push({ label: g.label, items: out });
  }
  v._boards = [];
  for (const b of v.boards || []) {
    const abs = path.join(srcRoot, b);
    if (!fs.existsSync(abs)) { console.warn(`  ! 보드 없음: ${v.slug}/${b}`); continue; }
    const name = `board_${b.replace(/\.png$/i, '.jpg').replace(/^board_/, '')}`;
    jpeg(abs, path.join(outImg, name), 2400);
    v._boards.push({ file: name, label: b.replace(/\.png$/i, '').replace(/^board_/, '') });
  }
  v._pageCount = v._groups.reduce((s, g) => s + g.items.length, 0);
}

/* ── 과정 자료 이미지 변환 ── */
let draftCount = 0;
function draftImg(slug, relPath) {
  const abs = path.join(SRC, relPath);
  if (!fs.existsSync(abs)) { console.warn(`  ! 과정자료 없음: ${relPath}`); return null; }
  const name = 'd_' + relPath.replace(/[^\w.-]+/g, '_').replace(/\.png$/i, '.jpg');
  const out = path.join(DEST, 'v', slug, 'img', name);
  if (!fs.existsSync(out)) { jpeg(abs, out, 1350); draftCount++; }
  return name;
}

for (const v of VERSIONS) {
  const d = DRAFTS[v.slug];
  if (!d) continue;
  for (const pr of d.pairs || []) {
    pr._b = draftImg(v.slug, pr.before[0]);
    pr._a = draftImg(v.slug, pr.after[0]);
  }
  for (const ln of d.lineages || []) {
    ln._items = (ln.items || []).map(([rel, tag, note]) => ({ file: draftImg(v.slug, rel), tag, note }))
      .filter((x) => x.file);
  }
  v._drafts = d;
}

const TOTAL_PAGES = VERSIONS.reduce((s, v) => s + v._pageCount, 0);
for (const v of VERSIONS) {
  const d = v._drafts;
  const n = d ? ((d.pairs || []).filter((x) => x._b && x._a).length
    + (d.lineages || []).reduce((s2, l) => s2 + l._items.length, 0)) : 0;
  v._draftBadge = n ? ` · <strong style="color:var(--mid)">과정 시안 ${n}</strong>`
    : (v.slug === 'play55-pilot' ? ' · <strong style="color:var(--mid)">평가 2회차 기록</strong>' : '');
}
console.log(`이미지 변환 ${converted}건(과정자료 ${draftCount}) · 버전 ${VERSIONS.length} · 페이지 ${TOTAL_PAGES}`);

/* ── 공통 스타일 ── */
const CSS = `
:root{
  --ink:#141519; --ink-70:rgba(20,21,25,.70); --ink-45:rgba(20,21,25,.45);
  --deep:#1B2A6B; --mid:#31459E; --sig:#0000FE; --pale:#DCE2F5; --wash:#F2F4FA;
  --warn:#B4341F; --line:#E4E6EE; --bg:#fff;
  --gut:clamp(18px,4vw,64px);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--ink);line-height:1.68;
 font-family:Pretendard,'Pretendard Variable',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
 -webkit-font-smoothing:antialiased;font-feature-settings:"tnum"}
.wrap{max-width:1160px;margin:0 auto;padding:0 var(--gut)}
img{max-width:100%;height:auto;display:block}

nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.93);backdrop-filter:blur(10px);
 border-bottom:1px solid var(--line)}
nav .wrap{display:flex;gap:24px;align-items:center;height:56px;overflow-x:auto;white-space:nowrap}
nav b{font-size:13px;font-weight:700;letter-spacing:-.01em;color:var(--deep)}
nav a{font-size:13px;color:var(--ink-45);text-decoration:none}
nav a:hover{color:var(--deep)}

header{padding:clamp(76px,13vh,168px) 0 clamp(64px,10vh,128px)}
h1{font-size:clamp(36px,6.8vw,82px);font-weight:800;letter-spacing:-.045em;line-height:1.05}
h1 em{font-style:normal;color:var(--mid)}
.lede{margin-top:28px;font-size:clamp(15px,1.5vw,18px);color:var(--ink-70);max-width:52ch}
.thesis{margin-top:52px;padding:26px 30px;background:var(--wash);border-left:3px solid var(--sig);
 font-size:clamp(17px,2vw,23px);font-weight:700;letter-spacing:-.02em;line-height:1.5}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:1px;background:var(--line);
 border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:52px}
.stat{background:#fff;padding:22px 18px}
.stat b{display:block;font-size:clamp(24px,3.4vw,38px);font-weight:800;letter-spacing:-.04em;line-height:1.1;color:var(--deep)}
.stat span{display:block;margin-top:5px;font-size:12px;color:var(--ink-45)}
.stat.warn b{color:var(--warn)}

section{padding:clamp(60px,8.5vh,110px) 0;border-top:1px solid var(--line)}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.09em;color:var(--mid);text-transform:uppercase}
h2{margin-top:12px;font-size:clamp(27px,4.2vw,50px);font-weight:800;letter-spacing:-.035em;line-height:1.14}
h3{margin:52px 0 6px;font-size:clamp(19px,2.2vw,25px);font-weight:700;letter-spacing:-.025em}
p{margin-top:14px;max-width:70ch}
.sub{color:var(--ink-45);font-size:14px;margin-top:8px}
strong{font-weight:700}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em;background:var(--wash);padding:1px 5px}

table{width:100%;border-collapse:collapse;margin-top:26px;font-size:14.5px}
th,td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--ink-45);text-transform:uppercase;
 border-bottom:1px solid var(--ink)}
tr.hi td{background:var(--wash)}
td.n{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--ink-45)}

.gates{margin-top:30px;border-top:1px solid var(--line)}
.gate{display:grid;grid-template-columns:76px 1fr;gap:0 20px;padding:18px 0;border-bottom:1px solid var(--line)}
.gate .gid{font-size:13px;font-weight:800;color:var(--mid);font-variant-numeric:tabular-nums}
.gate .gt{font-size:16.5px;font-weight:700;letter-spacing:-.02em}
.gate .gd{grid-column:2;font-size:14px;color:var(--ink-70);margin-top:4px}
.gate .gp{grid-column:2;margin-top:8px;font-size:12.5px;color:var(--mid);font-weight:700}
@media(max-width:640px){.gate{grid-template-columns:1fr}.gate .gd,.gate .gp{grid-column:1}}

/* 버전 아카이브 */
.varch{margin-top:34px;border-top:1px solid var(--line)}
.vrow{display:grid;grid-template-columns:104px 96px 1fr;gap:0 20px;align-items:baseline;
 padding:20px 0;border-bottom:1px solid var(--line);text-decoration:none;color:inherit}
.vrow:hover{background:var(--wash)}
.vrow .vv{font-size:12px;font-weight:800;letter-spacing:.04em;color:var(--mid);font-variant-numeric:tabular-nums}
.vrow .vd{font-size:12px;color:var(--ink-45);font-variant-numeric:tabular-nums}
.vrow .vt{font-size:17px;font-weight:700;letter-spacing:-.02em}
.vrow .vn{grid-column:3;font-size:13.5px;color:var(--ink-70);margin-top:3px}
.vrow .vm{grid-column:3;margin-top:9px;font-size:12px;color:var(--ink-45);font-variant-numeric:tabular-nums}
.vrow.is-final{background:var(--wash)}
.vrow.is-final .vv{color:var(--deep)}
@media(max-width:700px){.vrow{grid-template-columns:1fr;gap:2px}.vrow .vn,.vrow .vm{grid-column:1}}

/* 갤러리 */
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:20px;margin-top:22px}
.gal figure{margin:0}
.gal img{border:1px solid var(--line);background:var(--wash)}
.gal figcaption{margin-top:7px;font-size:11.5px;color:var(--ink-45);font-variant-numeric:tabular-nums}
.board{margin-top:26px}
.board img{border:1px solid var(--line)}
.board figcaption{margin-top:9px;font-size:12.5px;color:var(--ink-45)}

.back{display:inline-block;margin-top:26px;font-size:13px;font-weight:700;color:var(--mid);
 text-decoration:none;border-bottom:1px solid currentColor}
.notice{margin-top:30px;padding:18px 22px;border:1px solid var(--pale);background:var(--wash);
 font-size:13.5px;color:var(--ink-70)}
.notice b{color:var(--warn)}

footer{padding:60px 0 90px;border-top:1px solid var(--ink);font-size:13.5px;color:var(--ink-70)}
footer b{color:var(--ink);font-weight:700}
footer p+p{margin-top:16px}

/* 과정 · 되돌림 */
.pairs{margin-top:30px;display:grid;gap:34px}
.pair{border-top:1px solid var(--line);padding-top:20px}
.pair .shots{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.pair figure{margin:0;position:relative}
.pair img{border:1px solid var(--line);background:var(--wash);width:100%}
.pair .tag{position:absolute;top:8px;left:8px;font-size:10.5px;font-weight:800;letter-spacing:.06em;
 padding:3px 8px;color:#fff;background:rgba(20,21,25,.72)}
.pair .tag.after{background:var(--sig)}
.pair figcaption{margin-top:7px;font-size:11.5px;color:var(--ink-45);font-variant-numeric:tabular-nums}
.pair .why{margin-top:12px;font-size:13.5px;color:var(--ink-70);max-width:70ch}
.pair .why:empty{display:none}
@media(max-width:560px){.pair .shots{grid-template-columns:1fr}}

.lineage{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:16px}
.lineage figure{margin:0}
.lineage img{border:1px solid var(--line);background:var(--wash);width:100%}
.lineage .tag{display:inline-block;margin-top:7px;font-size:10px;font-weight:800;letter-spacing:.06em;
 padding:2px 7px;color:#fff;background:var(--mid)}
.lineage .tag.src{background:var(--deep)}
.lineage .tag.norm{background:var(--ink-45)}
.lineage figcaption{margin-top:5px;font-size:11.5px;color:var(--ink-45);line-height:1.5}

.rej{margin-top:22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px}
.rej-item figure{margin:0}
.rej-item img{border:1px solid var(--line);width:100%;filter:grayscale(.15)}
.rej-item .why{margin-top:9px;font-size:12.5px;color:var(--ink-70);line-height:1.55}
.rej-item .why b{color:var(--warn)}
`;

const NOTICE = `<div class="notice"><b>내부 제작 시안 · 외부 게시 승인 전</b> — 이 페이지의 캐러셀은 학과·입학지원팀 감수를 받지 않은 제작 시안이다. 등장하는 인물·수업·작품 장면은 생성형 콘셉트 이미지이며 실제 계원예술대학교 학생·수업·작품이 아니다. 사실 문장은 2027학년도 공식 모집요강에서 직접 확인한 범위(5·18·42·57·80쪽)를 넘지 않는다.</div>`;

function page({ title, body, css = '' }) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${CSS}${LIGHTBOX_CSS}${css}</style></head><body>
${body}
<script>${LIGHTBOX_JS}</script>
</body></html>`;
}

/* ── 버전별 갤러리 페이지 ── */
for (const v of VERSIONS) {
  const groups = v._groups.map((g) => `
  <h3>${g.label}</h3>
  <div class="gal">
${g.items.map((it) => `    <figure><img src="img/${it.file}" alt="${it.label}" loading="lazy"><figcaption>${it.label}</figcaption></figure>`).join('\n')}
  </div>`).join('\n');

  const boards = v._boards.length ? `
  <h3>전체 보드</h3>
${v._boards.map((b) => `  <figure class="board"><img src="img/${b.file}" alt="${b.label}" loading="lazy"><figcaption>${b.label}</figcaption></figure>`).join('\n')}` : '';

  const d = v._drafts;
  let drafts = '';
  if (d) {
    const pairs = (d.pairs || []).filter((pr) => pr._b && pr._a).map((pr) => `
    <div class="pair">
      <div class="shots">
        <figure><span class="tag">이전</span><img src="img/${pr._b}" alt="${pr.before[1]}" data-title="${pr.before[1]}" data-note="${pr.why || d.intro}" loading="lazy"><figcaption>${pr.before[1]}</figcaption></figure>
        <figure><span class="tag after">이후</span><img src="img/${pr._a}" alt="${pr.after[1]}" data-title="${pr.after[1]}" data-note="${pr.why || d.intro}" loading="lazy"><figcaption>${pr.after[1]}</figcaption></figure>
      </div>
      <div class="why">${pr.why || ''}</div>
    </div>`).join('\n');

    const lineages = (d.lineages || []).map((ln) => `
  <h3>${ln.label}</h3>
  <div class="lineage">
${ln._items.map((it) => {
      const cls = it.tag === 'source' ? ' src' : (it.tag === '규격화' ? ' norm' : '');
      return `    <figure><img src="img/${it.file}" alt="${it.tag}" loading="lazy" data-title="${ln.label} · ${it.tag}" data-note="${it.note || ''}"><span class="tag${cls}">${it.tag}</span><figcaption>${it.note || ''}</figcaption></figure>`;
    }).join('\n')}
  </div>`).join('\n');

    drafts = `
<section id="drafts" data-gallery><div class="wrap">
  <div class="eyebrow">과정 · Drafts</div>
  <h2>${d.title}</h2>
  <p>${d.intro}</p>
${pairs ? `  <div class="pairs">${pairs}\n  </div>` : ''}
${lineages}
${d.extra || ''}
</div></section>`;
  } else if (v.slug === 'play55-pilot') {
    drafts = `
<section id="drafts"><div class="wrap">
  <div class="eyebrow">과정 · Drafts</div>
  <h2>되돌린 자리 — 점수가 오른 곳이 고친 곳이다</h2>
${EVAL_DELTA}
</div></section>`;
  }

  fs.writeFileSync(path.join(DEST, 'v', v.slug, 'index.html'), page({
    title: `${v.title} · 계원 입시 커뮤니케이션`,
    body: `<header><div class="wrap">
  <div class="eyebrow">계원 입시 커뮤니케이션 · 버전 아카이브</div>
  <h1>${v.title}</h1>
  <p class="lede">${v.lede}</p>
  <div class="stats">
    <div class="stat"><b>${v.tag}</b><span>버전</span></div>
    <div class="stat"><b>${v.date.slice(5).replace('-', '.')}</b><span>제작일</span></div>
    <div class="stat"><b>${v._pageCount}</b><span>페이지</span></div>
    <div class="stat"><b>${v._boards.length}</b><span>전체 보드</span></div>
    <div class="stat"><b>1080<span style="font-size:.5em">×1350</span></b><span>규격 · 4:5 PNG</span></div>
  </div>
  <a class="back" href="${BASE}/index.html#versions">← 전체 프로세스 기록으로</a>
</div></header>
<section data-gallery><div class="wrap">
  <p class="sub">${v.note}</p>
  <p class="lb-hint">이미지를 누르면 전체 화면으로 열립니다 · 100% 버튼으로 원본 픽셀 크기 · ← → 로 이동</p>
${groups}
${boards}
</div></section>
${drafts}
<section><div class="wrap">
  ${NOTICE}
</div></section>
<footer><div class="wrap">
  <p><b>계원 입시 커뮤니케이션 통합 시스템</b> — ${v.title}<br>박진현 · 02_Communication_Kaywon</p>
</div></footer>`,
  }));
}

/* ── 허브 페이지 ── */
const GATES = [
  ['G0', '브리프 잠금', '주 대상과 보조 대상, 게시 시점, 독자의 다음 행동을 먼저 정한다. 공식 근거가 없는 날짜·수치는 <code>사용 금지</code> 상태로 둔다.', '목적 1 + 대상 1·2차 + CTA 1 + 공식 근거 목록'],
  ['G1', '공식 자료 수집', '대학 공식 홈페이지 → 입학안내 → 학과 페이지·공식 채널 순으로 훑고, 사실·이미지·작품명·연도·권리 상태를 자산대장으로 만든다.', '모든 사실 문장에 출처 · 모든 이미지에 권리 상태'],
  ['G2', '콘텐츠 설계', 'Hook을 A(작품)·B(공감)·C(과정·진로) 세 갈래로 만들어 보존한다. 5~8페이지의 <code>Hook → 공감 → 증거 → 과정 → 의미 → CTA</code>를 설계한다.', '페이지당 핵심 메시지 1개 · 본문 60~110자 · 정보 단위 9개 미만'],
  ['G3', '페이지 수·레이아웃 결정', '정보 구성 → 그루핑 → 위계 → 정보 체계 → 레이아웃 → 비주얼 순서로 간다. 이미지가 증거면 이미지 1차, 일정·수치가 핵심이면 텍스트 1차.', '페이지마다 1차 진입점과 이미지 역할을 한 문장으로 설명 가능'],
  ['G4', 'PLAY 5.5 적용', '계열 Main Color를 주색으로, Tint & Shade를 보조로. 로고 회전·왜곡·임의색·효과·복잡한 배경 위 배치는 금지.', '브랜드 하드게이트 위반 0건'],
  ['G5', '초기 시안', '1080×1350 기준이되 2× 렌더 가능한 HTML 구조로 만든다. 파일럿 한 개를 먼저 완성해 평가한다. <code>audit.mjs</code>가 크기·오버플로·서체 로딩을 자동 검사한다.', '모바일에서 확대 없이 읽힘 · 자동 검사 오버플로 0건'],
  ['G6', '독립 평가', '평가 에이전트를 제작 에이전트와 분리한다. 사용자 관점 50점(적절성·Hook·가독성·이미지·흐름·행동 유용성·정서) + 제작자 관점 50점(공식성·정합성·브랜드·레이아웃·정보량·권리·확장성·CTA).', '총점 80 이상 · 사용자 40/50 이상 · 제작자 40/50 이상'],
  ['G7', '수정 또는 대안 전환', '부분 문제면 해당 페이지를 유지/수정/교체/삭제/분리한다. 방향 문제면 A를 반복하지 않고 B·C 스토리보드로 갈아탄다. 공식 자산이 없으면 이미지 생성으로 위장하지 않고 <strong>자산 요청 질문으로 전환</strong>한다.', ''],
  ['G8', '고해상도 제작', '원본 2160×2700 / 게시본 1080×1350 sRGB PNG. 텍스트는 생성 이미지가 아니라 레이아웃 엔진에서 조판한다.', '페이지별 PNG + 전체 보드'],
  ['G9', '최종 QA·게시 패키지', '작품명·학생명·학과명·교과명·연도를 원문과 대조하고 200% 확대에서 로고·텍스트·이미지 결함을 본다.', '하드게이트 4종 전부 PASS일 때만 READY_TO_PUBLISH'],
];

function versionRow(v) {
  return `<a class="vrow${v.final ? ' is-final' : ''}" href="v/${v.slug}/index.html">`
    + `<span class="vv">${v.tag}</span><span class="vd">${v.date.slice(5).replace('-', '.')}</span>`
    + `<span class="vt">${v.title} →</span>`
    + `<span class="vn">${v.lede.split('. ')[0]}.</span>`
    + `<span class="vm">${v._pageCount}페이지 · 보드 ${v._boards.length}장${v._draftBadge || ''}</span></a>`;
}

const HUB = page({
  title: '계원 입시 커뮤니케이션 — 공식 근거와 80점 게이트의 기록',
  body: `
<nav><div class="wrap">
<b>계원 입시 커뮤니케이션 · 제작 기록</b>
<a href="#process">프로세스</a><a href="#evidence">근거의 층</a><a href="#undo">되돌림</a>
<a href="#gate">80점 게이트</a><a href="#versions">버전 아카이브</a><a href="#gap">안 된 것</a>
</div></nav>

<header><div class="wrap">
  <div class="eyebrow">2026.08.09 – 09.18 · 02_Communication_Kaywon</div>
  <h1>공식 자료만으로<br>입시 콘텐츠를 만든다는 것 <em>— 80점 게이트의 기록</em></h1>
  <p class="lede">계원예술대학교 입시홍보 SNS 캐러셀의 기획·제작·평가 시스템. 사실은 공식 모집요강에서만 가져오고, 만든 사람이 아닌 별도 평가자가 채점하고, 80점을 넘겨도 외부 게시 승인은 따로 받는다.</p>
  <div class="thesis">점수를 통과했다는 것과 내보내도 된다는 것은 다른 판정이다.</div>
  <div class="stats">
    <div class="stat"><b>${VERSIONS.length}</b><span>캐러셀 버전</span></div>
    <div class="stat"><b>${TOTAL_PAGES}</b><span>렌더된 페이지</span></div>
    <div class="stat"><b>10</b><span>제작 게이트 G0–G9</span></div>
    <div class="stat"><b>80</b><span>고해상도 진입 점수</span></div>
    <div class="stat"><b>25</b><span>AI 이미지 생성·편집 (학습 0회)</span></div>
    <div class="stat warn"><b>0</b><span>외부 게시 승인</span></div>
  </div>
</div></header>

<section id="process"><div class="wrap">
  <div class="eyebrow">01 · Process</div>
  <h2>열 개의 게이트</h2>
  <p>한 장짜리 이미지 실험에서 시작해, 하나의 주제를 여러 페이지의 이야기로 설계하고 이중 평가를 통과한 것만 고해상도로 내보내는 파이프라인으로 바뀌었다. 각 게이트에는 통과 조건이 붙어 있고, 조건을 못 채우면 다음으로 가지 않는다.</p>
  <div class="gates">
${GATES.map(([id, t, d, p]) => `    <div class="gate"><span class="gid">${id}</span><span class="gt">${t}</span><span class="gd">${d}</span>${p ? `<span class="gp">통과 조건 — ${p}</span>` : ''}</div>`).join('\n')}
  </div>
</div></section>

<section id="evidence"><div class="wrap">
  <div class="eyebrow">02 · Evidence</div>
  <h2>무엇이 실제이고 무엇이 합성인가</h2>
  <p>시안은 <strong>실제 학생 100명을 조사한 결과가 아니다.</strong> 공식 사실, 행정데이터에서 관찰한 행동, 그 관찰로 만든 규칙 기반 합성 패널 — 세 층을 섞지 않고 각각 무엇을 할 수 있는지 따로 적었다. 이 구분을 문서에 박아두지 않으면 합성 결과가 나중에 “조사 결과”로 둔갑한다.</p>
  <table>
    <tr><th style="width:150px">층위</th><th style="width:90px">성격</th><th>시안에서 맡은 역할</th></tr>
    <tr class="hi"><td><strong>공식 모집요강</strong></td><td>공식 사실</td><td>학과명 · 2년제 · 입학정원 · 전형과 인원 · 전공발견학기제 · 4단계 지원 · 문의처. <strong>화면의 모든 숫자와 제도 설명은 이 범위를 넘지 않는다.</strong></td></tr>
    <tr><td><strong>입시행동 데이터</strong></td><td>실제 관찰값</td><td>“전공을 못 정했다”는 심리는 행정데이터로 직접 잴 수 없다. 대신 <strong>같은 입시연도에 서로 다른 학과에 지원한 행동</strong>을 전공 탐색 수요의 대리변수로 썼다. 개인 식별값은 집계에만 쓰고 문서에 남기지 않았다.</td></tr>
    <tr><td><strong>합성 페르소나</strong></td><td>합성</td><td>관찰된 비율을 정수로 할당해 만든 반응 모형. 표지 문안 후보를 비교하는 데만 썼다. <strong>실제 응답이 아니다.</strong></td></tr>
    <tr><td><strong>합성 평가 연산</strong></td><td>규칙 기반 계산</td><td>복합점수와 평가요소값은 <strong>계산량이지 응답 수가 아니다.</strong> 문서에 “독립 응답 N건”으로 쓰지 않았다.</td></tr>
    <tr><td><strong>생성 비주얼</strong></td><td>AI 생성</td><td>보존된 PNG 30개 중 AI 생성·편집 결과 25개, 단순 규격화 5개. 프로젝트 전용 학습·파인튜닝은 <strong>0회</strong>. 폐기된 시안은 셀 수 없으므로 25는 <strong>확인 가능한 최소치</strong>다.</td></tr>
  </table>
  <p class="sub">지원자 단위 수치와 세그먼트 표는 🔴 내부 기획 전용으로 분류되어 이 공개 기록에 싣지 않는다.</p>
</div></section>

<section id="undo"><div class="wrap">
  <div class="eyebrow">03 · Undo</div>
  <h2>되돌린 것들</h2>
  <p>1차 40페이지를 모바일에서 다시 보고 되돌렸다. 되돌림은 취향 문제가 아니라 대부분 <strong>“작게 보면 안 읽힌다”</strong>와 <strong>“근거가 모자란다”</strong> 둘 중 하나였다.</p>
  <table>
    <tr><th style="width:190px">되돌린 것</th><th>왜</th><th style="width:110px">반영</th></tr>
    <tr class="hi"><td><strong>이미지 위 각진 흰색 박스</strong></td><td>글을 얹으려고 사진 위에 흰 판을 깔면 이미지가 배경으로 죽는다. 이미지의 네거티브 스페이스를 찾아 그 자리에 글을 앉혔다.</td><td class="n">SET A v2</td></tr>
    <tr class="hi"><td><strong>전 페이지 고밀도 키 이미지</strong></td><td>표지의 강한 이미지를 모든 페이지에 쓰니 글이 묻혔다. 표지만 키 이미지를 유지하고 세부 페이지용 저밀도 파생 이미지를 따로 만들었다.</td><td class="n">SET A v2</td></tr>
    <tr><td><strong>기계적인 카드 나열</strong></td><td>네 개의 지원을 세로 카드 4장으로 늘어놓으니 정보가 아니라 표처럼 보였다. 2×2 면으로 묶고 면마다 한 줄 설명만 남겼다.</td><td class="n">SET A v2</td></tr>
    <tr><td><strong>화면 위 근거 표기</strong></td><td>출처를 화면에 노출하니 SNS 카드로서 읽히지 않았다. 화면에서는 지우고 <code>evidence/</code>와 README에는 그대로 보존했다.</td><td class="n">SET A v2</td></tr>
    <tr><td><strong>SET B(경험 우선형)</strong></td><td>다섯 세트 중 하나를 이후 프로세스에서 제외했다. A·C·D·E 32페이지만 v2로 이어진다.</td><td class="n">v2 계보</td></tr>
    <tr class="hi"><td><strong>“새 이미지를 더 만든다”</strong></td><td>C·D·E v2에서 배경이 약한 페이지를 보완할 때 새로 생성하지 않고 <strong>기존 맥락 이미지를 다시 드러냈다.</strong> 기준 세트와의 시각적 일관성이 새 그림보다 중요했다.</td><td class="n">C·D·E v2</td></tr>
    <tr><td><strong>전체 재제작</strong></td><td>아이콘 하나 같은 국소 수정은 그 요소만 바꾸고 전체를 재렌더해 회귀만 확인했다.</td><td class="n">전 세트</td></tr>
  </table>
</div></section>

<section id="gate"><div class="wrap">
  <div class="eyebrow">04 · Gate</div>
  <h2>80점은 게시 허가가 아니다</h2>
  <p>평가 에이전트는 제작 에이전트와 분리한다. 사용자 관점 50점과 제작자 관점 50점을 따로 매기고, 총점 80·각 관점 40을 모두 넘겨야 고해상도로 간다. 그런데 파일럿에서 <strong>점수는 넘었는데 내보낼 수 없는 상태</strong>가 나왔다.</p>
  <table>
    <tr><th style="width:230px">파일럿</th><th class="n" style="width:90px">총점</th><th>판정</th></tr>
    <tr class="hi"><td><strong>2027 수시 2차 안내</strong></td><td class="n">84 / 100</td><td>사용자 44 · 제작자 40. 수치·하위 점수·자동 감사 모두 통과 → <strong>고해상도 내부 검토본 제작 승인</strong>. 외부 게시는 불가.</td></tr>
    <tr><td><strong>포트폴리오 vs 면접</strong></td><td class="n">80 / 100</td><td>사용자 43 · 제작자 37로 제작자 관점 통과선 미달. 작품명·제작진·연도·재사용 권리가 비어 있었다.</td></tr>
  </table>
  <p>그래서 규칙을 하나 더 넣었다 — <strong>수치 점수와 외부 게시 가능 여부를 분리한다.</strong> 하드게이트(사실 오류·로고 오용·미확인 권리·최소 글자)가 하나라도 FAIL이면 점수와 무관하게 <code>READY_TO_PUBLISH</code>로 올리지 않는다. 시안에 박힌 <code>INTERNAL TEST · NOT FOR PUBLISHING</code> 워터마크도 미관 감점이 아니라 <strong>상태 표지</strong>로 취급한다.</p>
</div></section>

<section id="versions"><div class="wrap">
  <div class="eyebrow">05 · Versions</div>
  <h2>캐러셀 버전 전체 — 최신순</h2>
  <p class="sub">렌더된 캐러셀 ${TOTAL_PAGES}페이지, 버전 ${VERSIONS.length}종. 위가 가장 최신이다.</p>
  <p>각 버전 페이지 안에는 완성본만이 아니라 <strong>그 버전에서 되돌린 자리</strong>가 같이 들어 있다 — 이전·이후 나란히 보기, 키비주얼이 source에서 파생으로 갈라지는 계보, 평가 점수가 오른 지점. 이미지를 누르면 전체 화면으로 열리고 <code>100%</code>에서 원본 픽셀로 본다.</p>
  <div class="varch">
${VERSIONS.map(versionRow).join('\n')}
  </div>
</div></section>

<section id="gap"><div class="wrap">
  <div class="eyebrow">06 · Gap</div>
  <h2>안 된 것 · 아직 모르는 것</h2>
  <p>질문 로그에 남긴 미해결 항목이다. 추정으로 메우지 않고 <code>미확인 · 교체 필요 · 승인 필요</code>로 표시해 남겼다.</p>
  <table>
    <tr><th style="width:80px">ID</th><th>질문</th><th style="width:110px">상태</th></tr>
    <tr class="hi"><td class="n">Q04</td><td>공식 홈페이지의 학생 작품 이미지가 입시홍보 SNS 재사용까지 허가되어 있는가</td><td class="n">미확인</td></tr>
    <tr class="hi"><td class="n">Q05</td><td>학생 얼굴·작업 장면의 게시 동의 범위와 철회 절차가 있는가</td><td class="n">미확인</td></tr>
    <tr><td class="n">Q06</td><td>2027학년도 수시 모집요강의 확정 공개일</td><td class="n">미확인</td></tr>
    <tr><td class="n">Q07</td><td>2027 오픈캠퍼스 일정·프로그램·신청 URL</td><td class="n">미확인</td></tr>
    <tr><td class="n">Q08</td><td>19개 학과의 최신 명칭과 계열 구분의 확정 기준</td><td class="n">대조 필요</td></tr>
    <tr><td class="n">Q09</td><td>학과별 대표 작품과 학생명·작품명·연도 메타데이터</td><td class="n">미확인</td></tr>
    <tr><td class="n">—</td><td>자율전공학과의 선택 가능 전공 목록과 전공 배정 기준 — 모집요강에서 확인되지 않아 확정 표현을 피했다</td><td class="n">미확인</td></tr>
    <tr><td class="n">—</td><td>공식 벡터 로고와 대학 BI 원본 — 현재 PLAY 로고는 PDF 추출 테스트 자산이다</td><td class="n">확보 필요</td></tr>
  </table>
  <p>게시용 페이지별 최종 한글 조판도 아직 확정하지 않았다. 재개 시 먼저 할 일은 근거 manifest에 파일별 해시·갱신일을 붙이고 공개등급 자동 검사 스크립트를 만드는 것이다.</p>
</div></section>

<section><div class="wrap">
  <div class="eyebrow">07 · Principles</div>
  <h2>정리 — 여덟 개</h2>
  <table>
    <tr><td class="n" style="width:40px">1</td><td><strong>공식 근거가 없는 숫자는 쓰지 않는다.</strong> 비워두고 질문으로 넘긴다</td></tr>
    <tr class="hi"><td class="n">2</td><td><strong>만든 사람이 채점하지 않는다.</strong> 평가 에이전트를 분리한다</td></tr>
    <tr class="hi"><td class="n">3</td><td><strong>점수와 게시 허가는 다른 판정이다.</strong> 하드게이트 하나면 점수는 무효다</td></tr>
    <tr><td class="n">4</td><td><strong>실제와 합성을 문서에서 갈라둔다.</strong> 계산량을 응답 수로 쓰지 않는다</td></tr>
    <tr><td class="n">5</td><td><strong>“공식 사이트에 있음”과 “재사용 허가”는 다른 말이다</strong></td></tr>
    <tr><td class="n">6</td><td><strong>모바일에서 안 읽히면 글자를 줄이지 말고 문장을 줄이거나 페이지를 나눈다</strong></td></tr>
    <tr class="hi"><td class="n">7</td><td><strong>보완은 새로 만드는 것보다 이미 있는 것을 다시 드러내는 쪽을 먼저 본다</strong></td></tr>
    <tr><td class="n">8</td><td><strong>시안 상태 표지를 지우지 않는다.</strong> 워터마크는 감점 요소가 아니라 상태다</td></tr>
  </table>
  ${NOTICE}
</div></section>

<footer><div class="wrap">
  <p><b>계원 입시 커뮤니케이션 통합 시스템 — 제작 프로세스 기록</b><br>
  박진현 · 2026.08.09 – 09.18 · 기록 2026.09.21</p>
  <p>공개본 안내 — 입시 원자료, 지원자 단위 집계와 세그먼트 표, 합성 패널 문안 투표 원문은 내부 기획 전용으로 분류되어 이 기록에 포함하지 않았다. 이미지는 웹 전송을 위해 JPEG로 재인코딩했다.</p>
</div></footer>`,
});

fs.writeFileSync(path.join(DEST, 'index.html'), HUB);
console.log(`허브: index.html · 버전 페이지 ${VERSIONS.length}종 생성`);
