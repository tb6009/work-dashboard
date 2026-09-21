#!/usr/bin/env node
/**
 * build-ien-portfolio.mjs
 * 089_임차in(아이엔) 프로젝트의 공개 가능한 HTML 산출물을
 * workDashboard의 public/ien-process/ 로 복사·경량화한다.
 *
 * - 기밀 자산(대표님 자료 · 00_GPT 세션 원문 · 내부메모 · 클라이언트 보고서 md)은 복사하지 않는다
 * - PNG → JPEG(q80) 변환 + HTML/CSS 참조 일괄 치환
 * - 폰트는 _fonts/ 로 중복 제거 후 절대경로로 치환
 * - 허브 페이지(05_리서치프로세스/index.html) → ien-process/index.html
 *
 * 실행: node scripts/build-ien-portfolio.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SRC = '/Users/jinhyunpark/Documents/cloude_Code/08_project/089_임차in';
const DEST = path.resolve(import.meta.dirname, '../app/public/ien-process');
const BASE = '/ien-process';

const ASSET_EXT = new Set(['.html', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ttf', '.otf']);
const FONT_EXT = new Set(['.ttf', '.otf']);
const TEXT_EXT = new Set(['.html', '.css']);

/** 복사 대상 루트 (SRC 기준 상대경로) */
const ROOTS = [
  '04_산출물',
  '02_브랜드컨셉',
  '01_리서치/실제기업_브랜드레퍼런스/04_요소별_HTML',
  '01_리서치/실제기업_브랜드레퍼런스/07_시각분석',
  '01_리서치/이미지리서치/03_contact_sheets',
  'docs/assets/로고',
];

/** 어떤 경로든 이 조각을 포함하면 제외 */
const EXCLUDE_FRAGMENTS = [
  '/qa/', '/qa_', 'qa_page_', '대표님 자료', '00_GPT',
  '내부메모', '_무드부적합', '_접근실패', '.DS_Store',
];

const isExcluded = (rel) => EXCLUDE_FRAGMENTS.some((f) => rel.includes(f));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/* ── 1. 초기화 ── */
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(path.join(DEST, '_fonts'), { recursive: true });

const fonts = new Set();
let copied = 0, converted = 0, skipped = 0;

/* ── 2. 자산 복사 ── */
for (const root of ROOTS) {
  const abs = path.join(SRC, root);
  if (!fs.existsSync(abs)) { console.warn(`  ! 없음: ${root}`); continue; }

  for (const file of walk(abs)) {
    const rel = path.relative(SRC, file);
    const ext = path.extname(file).toLowerCase();
    if (!ASSET_EXT.has(ext) || isExcluded('/' + rel)) { skipped++; continue; }

    // 폰트는 _fonts/ 로 중복 제거
    if (FONT_EXT.has(ext)) {
      const name = path.basename(file);
      if (!fonts.has(name)) {
        fs.copyFileSync(file, path.join(DEST, '_fonts', name));
        fonts.add(name);
        copied++;
      }
      continue;
    }

    const target = path.join(DEST, ext === '.png' ? rel.replace(/\.png$/i, '.jpg') : rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });

    if (ext === '.png') {
      // PNG → JPEG(q80). 알파 없는 사진·렌더 이미지만 대상이라 손실 없음
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', file, '--out', target], { stdio: 'ignore' });
      converted++;
    } else {
      fs.copyFileSync(file, target);
      copied++;
    }
  }
}

/* ── 3. HTML/CSS 참조 치환 ── */
function rewrite(text) {
  let out = text.replace(/\.png(["')\s])/gi, '.jpg$1');
  // PDF 원본(합계 187MB)은 공개본에서 제외 — 링크를 죽은 링크가 아니라 일반 텍스트로
  out = out.replace(/href="[^"]*\.pdf"/gi, 'data-omitted="pdf" title="PDF 원본은 공개본에서 제외됨"');
  for (const name of fonts) {
    // url('X.ttf') · url("./X.ttf") · url(X.ttf) 모든 형태를 절대경로로
    out = out.replace(
      new RegExp(`(url\\(\\s*['"]?)(?:\\.{0,2}\\/)*${name.replace(/\./g, '\\.')}`, 'g'),
      `$1${BASE}/_fonts/${name}`,
    );
  }
  return out;
}

for (const file of walk(DEST)) {
  if (!TEXT_EXT.has(path.extname(file).toLowerCase())) continue;
  fs.writeFileSync(file, rewrite(fs.readFileSync(file, 'utf8')));
}

console.log(`자산: 복사 ${copied} · JPEG 변환 ${converted} · 제외 ${skipped} · 폰트 ${fonts.size}`);
console.log(`→ ${DEST}`);

/* ── 4. 버전 아카이브 정의 (최신순) ── */
const VERSIONS = [
  { v: 'INFO v0.1', d: '09-21 11:29', t: '브랜드전략 인포그래픽 · 전체 13P (A4 가로)', n: '리서치 전 과정을 13페이지 인포그래픽으로 재구성한 전체판',
    href: '04_산출물/20260921_브랜드전략_인포그래픽_전체13P_A4가로_v0.1/index.html' },
  { v: 'INFO v0.3', d: '09-21 09:49', t: '인포그래픽 핵심페이지 (A4 가로)', n: '살핌·발견·준비·지원 4단계 한 장 요약 — 최종본',
    href: '04_산출물/20260921_브랜드전략_인포그래픽_핵심페이지_A4가로_v0.3/index.html' },
  { v: 'INFO v0.2', d: '09-21 09:37', t: '인포그래픽 핵심페이지 (A4 가로)', n: '가로 판형 1차. 여백·위계 조정 전',
    href: '04_산출물/20260921_브랜드전략_인포그래픽_핵심페이지_A4가로_v0.2/index.html' },
  { v: 'INFO v0.1', d: '09-21 09:35', t: '인포그래픽 핵심페이지 (A4 세로)', n: '세로 판형 최초안',
    href: '04_산출물/20260921_브랜드전략_인포그래픽_핵심페이지_v0.1/index.html' },
  { v: 'v0.8', d: '09-21 07:18', t: '타깃확장 컨셉 3세트 — 최종 시안', n: '5그룹 타깃 반영 · 3컨셉 × 7페이지 · 신규 이미지 12장', final: true,
    href: '04_산출물/20260921_타깃확장_컨셉3세트_v0.8/index.html',
    subs: [
      { t: '01 잔잔한 온기', href: '04_산출물/20260921_타깃확장_컨셉3세트_v0.8/01_잔잔한온기/index.html' },
      { t: '02 맑은 시선',   href: '04_산출물/20260921_타깃확장_컨셉3세트_v0.8/02_맑은시선/index.html' },
      { t: '03 일상의 여백', href: '04_산출물/20260921_타깃확장_컨셉3세트_v0.8/03_일상의여백/index.html' },
    ] },
  { v: 'IMG v0.1', d: '09-21 06:48', t: '5그룹 인물·생활 이미지', n: '첫 독립 · 혼자 사는 생활 · 둘의 새 살림 · 친구 공동거주 · 가족과 돌봄',
    href: '04_산출물/20260921_5그룹_인물생활이미지_v0.1/index.html' },
  { v: 'v0.7', d: '09-21 00:12', t: '일상의 여백 — 생활 연결 재제작', n: '연속성 앵커 도입. 같은 인물·같은 동네로 4단계를 잇는다',
    href: '04_산출물/20260921_일상의여백_생활연결_v0.7/index.html' },
  { v: 'v0.6', d: '09-21 00:18', t: '독립컨셉 3세트 — 모바일 UI + A4', n: '모바일 화면 목업 추가 · 컨셉별 서체 차별화',
    href: '04_산출물/20260920_독립컨셉_3세트_모바일UI_A4_v0.6/index.html',
    subs: [
      { t: '01 잔잔한 온기', href: '04_산출물/20260920_독립컨셉_3세트_모바일UI_A4_v0.6/01_잔잔한온기/index.html' },
      { t: '02 맑은 시선',   href: '04_산출물/20260920_독립컨셉_3세트_모바일UI_A4_v0.6/02_맑은시선/index.html' },
      { t: '03 일상의 여백', href: '04_산출물/20260920_독립컨셉_3세트_모바일UI_A4_v0.6/03_일상의여백/index.html' },
    ] },
  { v: 'v0.5', d: '09-20 23:47', t: '독립컨셉 3세트 — 18페이지', n: '컨셉을 독립 문서로 분리 · 촬영 디렉션 포함',
    href: '04_산출물/20260920_독립컨셉_3세트_v0.5/index.html',
    subs: [
      { t: '01 잔잔한 온기', href: '04_산출물/20260920_독립컨셉_3세트_v0.5/01_잔잔한온기/index.html' },
      { t: '02 맑은 시선',   href: '04_산출물/20260920_독립컨셉_3세트_v0.5/02_맑은시선/index.html' },
      { t: '03 일상의 여백', href: '04_산출물/20260920_독립컨셉_3세트_v0.5/03_일상의여백/index.html' },
    ] },
  { v: 'v0.4', d: '09-20 23:39', t: '맑은 시선 — 코랄 4단계', n: '4단계를 장면으로 풀고 코랄을 포인트로',
    href: '04_산출물/20260920_맑은시선_코랄_4단계_v0.4/index.html' },
  { v: 'v0.3', d: '09-20 23:26', t: '색상 이미지 통합 시안', n: '웜톤 화이트 · Iris→Sky 4단. 세 컨셉의 색을 통합',
    href: '04_산출물/20260920_색상이미지_통합시안_v0.3/index.html' },
  { v: 'COLOR', d: '09-20 23:13', t: '신규 색상 디자인컨셉 3안 프리뷰', n: '기존 BI를 벗어난 신규 색 방향 3안',
    href: '02_브랜드컨셉/05_신규색상_디자인컨셉_3안_프리뷰.html' },
  { v: 'COLOR', d: '09-20 22:38', t: '색 체계 3안 보드', n: '대비비 실측 기반 3안 비교 + 화면 목업',
    href: '02_브랜드컨셉/06_색상체계_3안_보드.html' },
  { v: 'REF', d: '09-20 15:33', t: '디자인 요소 — 시각 분석', n: '41개 기업 실측을 타이포·레이아웃·색톤으로 분해',
    href: '01_리서치/실제기업_브랜드레퍼런스/04_요소별_HTML/05_디자인요소_시각.html' },
  { v: 'REF', d: '09-20 14:54', t: '디자인 요소 — 추출', n: '레퍼런스에서 재사용 가능한 요소만 걷어낸 표',
    href: '01_리서치/실제기업_브랜드레퍼런스/04_요소별_HTML/04_디자인요소_추출.html' },
  { v: 'REF', d: '09-20 14:33', t: '레퍼런스 — 03 일상의 여백', n: '컨셉별 실제 기업 레퍼런스 보드',
    href: '01_리서치/실제기업_브랜드레퍼런스/04_요소별_HTML/03_일상의여백.html' },
  { v: 'REF', d: '09-20 14:33', t: '레퍼런스 — 02 맑은 시선', n: '컨셉별 실제 기업 레퍼런스 보드',
    href: '01_리서치/실제기업_브랜드레퍼런스/04_요소별_HTML/02_맑은시선.html' },
  { v: 'REF', d: '09-20 14:33', t: '레퍼런스 — 01 잔잔한 온기', n: '컨셉별 실제 기업 레퍼런스 보드',
    href: '01_리서치/실제기업_브랜드레퍼런스/04_요소별_HTML/01_잔잔한온기.html' },
  { v: 'v0.2', d: '09-19', t: '브랜드 무드보드 3안 — 세 컨셉 확정', n: '컨택트시트를 참조로 투입. 잔잔한 온기 · 맑은 시선 · 일상의 여백',
    href: '04_산출물/20260919_브랜드무드보드_v0.2/index.html' },
  { v: 'v0.1', d: '09-19', t: 'A3 무드보드 3안 — 전면 기각', n: '대담한 온기 · 선명한 전문성 · 생기 있는 생활. 기준 없이 그려 전부 되돌림',
    href: '04_산출물/20260919_브랜드무드보드_v0.1/index.html' },
];

/* ── 5. 무드보드 v0.1·v0.2 인덱스 페이지 생성 (원본에 HTML이 없음) ── */
const MOODBOARDS = [
  { dir: '04_산출물/20260919_브랜드무드보드_v0.1', title: 'A3 무드보드 3안 — v0.1',
    lede: '기준 없이 먼저 그린 첫 시안. 세 방향 모두 전면 기각됐다.',
    imgs: [['01_대담한온기.jpg', '01 대담한 온기'], ['02_선명한전문성.jpg', '02 선명한 전문성'], ['03_생기있는생활.jpg', '03 생기 있는 생활']] },
  { dir: '04_산출물/20260919_브랜드무드보드_v0.2', title: '브랜드 무드보드 3안 — v0.2',
    lede: '컨택트시트 939장을 참조로 투입한 뒤 다시 그렸다. 여기서 세 컨셉이 확정됐다.',
    imgs: [['01_잔잔한온기.jpg', '01 잔잔한 온기'], ['02_맑은시선.jpg', '02 맑은 시선'], ['03_일상의여백.jpg', '03 일상의 여백']] },
];

const MB_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;color:#1C2422;line-height:1.68;font-family:Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1160px;margin:0 auto;padding:0 clamp(18px,4vw,64px)}
header{padding:clamp(60px,10vh,120px) 0 48px;border-bottom:1px solid #E3EAE7}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.09em;color:#2D764A;text-transform:uppercase}
h1{margin-top:12px;font-size:clamp(30px,5vw,56px);font-weight:800;letter-spacing:-.04em;line-height:1.1}
.lede{margin-top:20px;font-size:16px;color:rgba(28,36,34,.70);max-width:56ch}
.back{display:inline-block;margin-top:28px;font-size:13px;color:#2D764A;text-decoration:none;border-bottom:1px solid currentColor}
main{padding:56px 0 100px;display:grid;gap:56px}
figure img{width:100%;height:auto;display:block;border:1px solid #E3EAE7}
figcaption{margin-top:12px;font-size:13px;color:rgba(28,36,34,.45)}`;

for (const mb of MOODBOARDS) {
  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${mb.title} · 임차in케어</title>
<style>${MB_CSS}</style></head><body>
<header><div class="wrap">
  <div class="eyebrow">임차in케어 · 시안 아카이브</div>
  <h1>${mb.title}</h1>
  <p class="lede">${mb.lede}</p>
  <a class="back" href="${BASE}/index.html#versions">← 전체 프로세스 기록으로</a>
</div></header>
<main><div class="wrap" style="display:grid;gap:56px">
${mb.imgs.map(([src, cap]) => `  <figure><img src="${src}" alt="${cap}"><figcaption>${cap}</figcaption></figure>`).join('\n')}
</div></main>
</body></html>`;
  fs.writeFileSync(path.join(DEST, mb.dir, 'index.html'), html);
}

/* ── 6. 허브 페이지 생성 ── */
const HUB_CSS = `
/* 버전 아카이브 */
.varch{margin-top:34px;border-top:1px solid var(--line)}
.vrow{display:grid;grid-template-columns:104px 84px 1fr;gap:0 20px;align-items:baseline;
 padding:20px 0;border-bottom:1px solid var(--line);text-decoration:none;color:inherit}
.vrow:hover{background:var(--wash)}
.vrow .vv{font-size:12px;font-weight:800;letter-spacing:.04em;color:var(--mid);font-variant-numeric:tabular-nums}
.vrow .vd{font-size:12px;color:var(--ink-45);font-variant-numeric:tabular-nums}
.vrow .vt{font-size:17px;font-weight:700;letter-spacing:-.02em}
.vrow .vn{grid-column:3;font-size:13.5px;color:var(--ink-70);margin-top:3px}
.vrow.is-final{background:var(--wash)}
.vrow.is-final .vv{color:var(--deep)}
.vsubs{grid-column:3;display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
.vsubs a{font-size:12px;font-weight:700;color:var(--deep);text-decoration:none;
 border:1px solid var(--pale);background:#fff;padding:5px 10px;border-radius:2px}
.vsubs a:hover{border-color:var(--mid)}
.vwrap{border-bottom:1px solid var(--line)}
.vwrap:last-child{border-bottom:0}
.vwrap .vrow{border-bottom:0}
.vwrap .vsubs{padding:0 0 18px 208px}
@media(max-width:700px){
  .vrow{grid-template-columns:1fr;gap:2px}
  .vrow .vn,.vsubs{grid-column:1}
  .vwrap .vsubs{padding-left:0}
}
`;

function versionRow(x) {
  const row = `<a class="vrow${x.final ? ' is-final' : ''}" href="${x.href}" target="_blank" rel="noopener">`
    + `<span class="vv">${x.v}</span><span class="vd">${x.d}</span>`
    + `<span class="vt">${x.t} ↗</span><span class="vn">${x.n}</span></a>`;
  if (!x.subs) return row;
  return `<div class="vwrap">${row}<div class="vsubs">`
    + x.subs.map((s) => `<a href="${s.href}" target="_blank" rel="noopener">${s.t} ↗</a>`).join('')
    + `</div></div>`;
}

const VERSION_SECTION = `
<!-- 버전 아카이브 -->
<section id="versions"><div class="wrap">
  <div class="eyebrow">06 · Versions</div>
  <h2>시안 버전 전체 — 최신순</h2>
  <p class="sub">사흘간 만든 HTML 산출물 ${VERSIONS.length}종. 위가 가장 최신이다. 각 항목은 새 탭에서 열린다.</p>
  <div class="varch">
${VERSIONS.map(versionRow).join('\n')}
  </div>
</div></section>
`;

let hub = fs.readFileSync(path.join(SRC, '05_리서치프로세스/index.html'), 'utf8');

// 경로 기준을 프로젝트 루트 → ien-process 루트로 (허브가 한 단계 위로 올라옴)
hub = hub.replace(/(src|href)="\.\.\//g, '$1="');
hub = hub.replace(/\.png(["')\s])/gi, '.jpg$1');

// 공개본에 포함하지 않는 기밀 자료 링크 2건 제거
hub = hub.replace(/^.*href="(?:04_산출물\/01_브랜드리서치_종합보고서|00_GPT\/).*$\n?/gm, '');

// 스타일 · 내비 · 섹션 삽입
hub = hub.replace('</style></head>', `${HUB_CSS}</style></head>`);
hub = hub.replace('<a href="#index">자료 인덱스</a>', '<a href="#versions">버전 아카이브</a><a href="#index">자료 인덱스</a>');
hub = hub.replace('<!-- 인덱스 -->', `${VERSION_SECTION}\n<!-- 인덱스 -->`);
hub = hub.replace('<div class="eyebrow">06 · Index</div>', '<div class="eyebrow">07 · Index</div>');
hub = hub.replace('<div class="eyebrow">07 · Principles</div>', '<div class="eyebrow">08 · Principles</div>');

// 공개본 고지
hub = hub.replace('</footer>', `  <div class="wrap"><p style="margin-top:18px;font-size:13px;color:var(--ink-45)">
  공개본 안내 — 클라이언트 제공 원본(<code>대표님 자료/</code>), AI 세션 전문(<code>00_GPT/</code>), 내부 메모, 클라이언트 종합 보고서는 이 공개 페이지에 포함하지 않았다. 이미지는 웹 전송을 위해 JPEG로 재인코딩했다.</p></div>
</footer>`);

fs.writeFileSync(path.join(DEST, 'index.html'), hub);
console.log(`허브: index.html · 버전 ${VERSIONS.length}종 · 무드보드 인덱스 ${MOODBOARDS.length}종 생성`);
