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
import { LIGHTBOX_CSS, LIGHTBOX_JS } from './lib/lightbox.mjs';

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
  // 과정·반려 자산 — 되돌림과 실패를 함께 보여주기 위해 공개본에 포함
  '01_리서치/실제기업_브랜드레퍼런스/_무드부적합',
  '01_리서치/실제기업_브랜드레퍼런스/_접근실패',
  '01_리서치/이미지리서치/_INVALID_adobestock',
  '01_리서치/이미지리서치/_INVALID_bing/grids',
];

/** 어떤 경로든 이 조각을 포함하면 제외 */
const EXCLUDE_FRAGMENTS = [
  '/qa/', '/qa_', 'qa_page_', '대표님 자료', '00_GPT',
  '내부메모', '.DS_Store',
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

/* ── 3-b. 과정·되돌림 블록을 버전 페이지 안에 주입 ── */

const PD_CSS = `
.pdrafts{max-width:1160px;margin:0 auto;padding:clamp(56px,8vh,104px) clamp(18px,4vw,64px) clamp(70px,10vh,120px);
 border-top:1px solid #E3EAE7;
 font-family:Pretendard,'Pretendard Variable',-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
 color:#1C2422;line-height:1.68;-webkit-font-smoothing:antialiased}
.pdrafts *{box-sizing:border-box}
.pdrafts .eyebrow{font-size:12px;font-weight:700;letter-spacing:.09em;color:#2D764A;text-transform:uppercase}
.pdrafts h2{margin-top:12px;font-size:clamp(26px,4vw,46px);font-weight:800;letter-spacing:-.035em;line-height:1.14}
.pdrafts h3{margin:44px 0 6px;font-size:clamp(18px,2vw,23px);font-weight:700;letter-spacing:-.025em}
.pdrafts p{margin-top:14px;max-width:72ch;font-size:15px}
.pdrafts .hint{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:rgba(28,36,34,.45);margin-top:12px}
.pdrafts .hint::before{content:"⤢"}
.pdrafts .pairs{margin-top:28px;display:grid;gap:34px}
.pdrafts .pair{border-top:1px solid #E3EAE7;padding-top:20px}
.pdrafts .shots{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.pdrafts figure{margin:0;position:relative}
.pdrafts .pair img,.pdrafts .rej img{width:100%;height:auto;display:block;border:1px solid #E3EAE7;background:#F0F5F2;cursor:zoom-in}
.pdrafts .tag{position:absolute;top:8px;left:8px;font-size:10.5px;font-weight:800;letter-spacing:.06em;
 padding:3px 8px;color:#fff;background:rgba(28,36,34,.72)}
.pdrafts .tag.after{background:#194D2E}
.pdrafts figcaption{margin-top:7px;font-size:11.5px;color:rgba(28,36,34,.45)}
.pdrafts .why{margin-top:12px;font-size:13.5px;color:rgba(28,36,34,.70);max-width:70ch}
.pdrafts .why:empty{display:none}
.pdrafts .rej{margin-top:22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:22px}
.pdrafts .rej .why{margin-top:9px;font-size:12.5px;line-height:1.55}
.pdrafts .rej .why b{color:#B45309}
@media(max-width:560px){.pdrafts .shots{grid-template-columns:1fr}}
`;

/** 한 버전 페이지 안에 들어갈 과정 블록. path는 DEST 기준 상대경로 */
function pairBlock(pairs, depth) {
  const up = '../'.repeat(depth);
  return pairs.map((pr) => `
    <div class="pair">
      <div class="shots">
        <figure><span class="tag">${pr.bt}</span><img src="${up}${pr.b}" alt="${pr.bc}" data-title="${pr.bc}" data-note="${pr.why || ''}" loading="lazy"><figcaption>${pr.bc}</figcaption></figure>
        <figure><span class="tag after">${pr.at}</span><img src="${up}${pr.a}" alt="${pr.ac}" data-title="${pr.ac}" data-note="${pr.why || ''}" loading="lazy"><figcaption>${pr.ac}</figcaption></figure>
      </div>
      <div class="why">${pr.why || ''}</div>
    </div>`).join('\n');
}

const CONCEPTS = [
  ['01_잔잔한온기', '잔잔한 온기'],
  ['02_맑은시선', '맑은 시선'],
  ['03_일상의여백', '일상의 여백'],
];
const STEPS = ['살핌', '발견', '준비', '지원'];

/** 주입 대상: [DEST 기준 파일경로, 깊이, 블록 HTML] */
const INJECT = [];

// v0.8 컨셉별 — original(v0.7 시점) vs new(5그룹 반영)
for (const [dir, name] of CONCEPTS) {
  const base = `04_산출물/20260921_타깃확장_컨셉3세트_v0.8/${dir}`;
  const pairs = STEPS.map((step, i) => ({
    b: `${base}/original-${i + 1}.jpg`, bt: '이전', bc: `${step} · v0.7 시점`,
    a: `${base}/new-${i + 1}.jpg`, at: '이후', ac: `${step} · v0.8 · 5그룹 반영`,
    why: '',
  }));
  INJECT.push([`${base}/index.html`, 3, `
<section class="pdrafts" data-gallery>
  <div class="eyebrow">과정 · Drafts</div>
  <h2>이 컨셉이 바뀐 자리 — ${name}</h2>
  <p>타깃을 1인 가구 하나에서 <strong>첫 독립 · 혼자 사는 생활 · 둘의 새 살림 · 친구 공동거주 · 가족과 돌봄</strong> 다섯 그룹으로 넓히면서 네 장면을 전부 다시 생성했다. 왼쪽이 v0.7까지 쓰던 장면, 오른쪽이 v0.8이다. 인물 구성과 생활 밀도가 달라진 것이 이번 수정의 전부다.</p>
  <p class="hint">이미지를 누르면 전체 화면 · 100%에서 원본 픽셀 · ← → 로 이동</p>
  <div class="pairs">${pairBlock(pairs, 3)}
  </div>
  <h3>캐스팅 추가분</h3>
  <p>다섯 그룹을 한 장에 모아 확인한 캐스팅 시트다. 기본값(20대 1인 가구)을 명시적으로 깨기 위해 따로 만들었다.</p>
  <figure style="margin-top:16px"><img src="${'../'.repeat(3)}${base}/cast-extra.jpg" alt="${name} · 캐스팅 추가분" data-title="${name} · 캐스팅 추가분" data-note="다섯 타깃 그룹을 한 장에 모아 확인한 시트. 20대 1인 가구라는 기본값을 명시적으로 깨기 위해 만들었다." loading="lazy"></figure>
</section>`]);
}

// v0.7 일상의여백 — v0.5/0.6 장면 vs v0.7 재제작
{
  const before = '04_산출물/20260920_독립컨셉_3세트_모바일UI_A4_v0.6/03_일상의여백';
  const after = '04_산출물/20260921_일상의여백_생활연결_v0.7';
  const files = ['01_살핌', '02_발견', '03_준비', '04_지원'];
  const whys = [
    '작은 집과 허리 높이 창으로 다시 잡았다. 이전 장면은 집이 너무 넓어 세입자의 생활로 읽히지 않았다.',
    '',
    '계약서와 손만 남겼다. 인물 전신이 들어가면 장면이 상담 사진처럼 보인다.',
    '같은 인물·같은 동네로 고정했다. 네 장면이 다른 사람이면 서비스가 이어진다는 느낌이 나오지 않는다.',
  ];
  const pairs = files.map((f, i) => ({
    b: `${before}/${f}.jpg`, bt: 'v0.6', bc: `${STEPS[i]} · v0.5–0.6`,
    a: `${after}/${f}.jpg`, at: 'v0.7', ac: `${STEPS[i]} · v0.7 재제작`,
    why: whys[i],
  }));
  INJECT.push([`${after}/index.html`, 2, `
<section class="pdrafts" data-gallery>
  <div class="eyebrow">과정 · Drafts</div>
  <h2>연속성은 지시해야 생긴다</h2>
  <p>세 컨셉 중 「일상의 여백」만 따로 재제작했다. 살핌–발견–준비–지원이 서로 다른 사람의 장면이면 네 단계가 한 서비스로 읽히지 않는다. 같은 인물과 같은 동네를 앵커로 걸고 네 장면을 다시 생성했다.</p>
  <p class="hint">이미지를 누르면 전체 화면 · 100%에서 원본 픽셀 · ← → 로 이동</p>
  <div class="pairs">${pairBlock(pairs, 2)}
  </div>
  <p>이 버전 이전의 조판은 <a href="${'../'.repeat(2)}${before}/index_before_v0.7.html">v0.6 원본 페이지</a>에 그대로 남아 있다.</p>
</section>`]);
}

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
  { v: 'v0.8', d: '09-21 07:18', t: '타깃확장 컨셉 3세트 — 최종 시안', n: '5그룹 타깃 반영 · 3컨셉 × 7페이지 · 신규 이미지 12장', final: true, drafts: '컨셉별 8 + 캐스팅',
    href: '04_산출물/20260921_타깃확장_컨셉3세트_v0.8/index.html',
    subs: [
      { t: '01 잔잔한 온기', href: '04_산출물/20260921_타깃확장_컨셉3세트_v0.8/01_잔잔한온기/index.html' },
      { t: '02 맑은 시선',   href: '04_산출물/20260921_타깃확장_컨셉3세트_v0.8/02_맑은시선/index.html' },
      { t: '03 일상의 여백', href: '04_산출물/20260921_타깃확장_컨셉3세트_v0.8/03_일상의여백/index.html' },
    ] },
  { v: 'IMG v0.1', d: '09-21 06:48', t: '5그룹 인물·생활 이미지', n: '첫 독립 · 혼자 사는 생활 · 둘의 새 살림 · 친구 공동거주 · 가족과 돌봄',
    href: '04_산출물/20260921_5그룹_인물생활이미지_v0.1/index.html' },
  { v: 'v0.7', d: '09-21 00:12', t: '일상의 여백 — 생활 연결 재제작', n: '연속성 앵커 도입. 같은 인물·같은 동네로 4단계를 잇는다', drafts: '8',
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
  { v: 'v0.2', d: '09-19', t: '브랜드 무드보드 3안 — 세 컨셉 확정', n: '컨택트시트를 참조로 투입. 잔잔한 온기 · 맑은 시선 · 일상의 여백', drafts: '전환 기록',
    href: '04_산출물/20260919_브랜드무드보드_v0.2/index.html' },
  { v: 'v0.1', d: '09-19', t: 'A3 무드보드 3안 — 전면 기각', n: '대담한 온기 · 선명한 전문성 · 생기 있는 생활. 기준 없이 그려 전부 되돌림', drafts: '기각 사유',
    href: '04_산출물/20260919_브랜드무드보드_v0.1/index.html' },
];

/* ── 5. 무드보드 v0.1·v0.2 인덱스 페이지 생성 (원본에 HTML이 없음) ── */
const MOODBOARDS = [
  { dir: '04_산출물/20260919_브랜드무드보드_v0.1', title: 'A3 무드보드 3안 — v0.1',
    lede: '기준 없이 먼저 그린 첫 시안. 세 방향 모두 전면 기각됐다.',
    after: `<h2 style="font-size:clamp(22px,3vw,34px);font-weight:800;letter-spacing:-.03em;margin-bottom:10px">왜 전부 되돌렸나</h2>
  <p style="max-width:70ch;color:rgba(28,36,34,.70);font-size:15px">고를 기준을 정하지 않고 먼저 그렸다. 그래서 세 안을 놓고도 <strong>무엇을 근거로 하나를 고를지</strong>가 없었다. 각 안이 어디로 미끄러지는지만 분명했다 — 1안은 따뜻함이 생활용품 브랜드처럼, 2안은 금융·보험처럼, 3안은 공공 주거·라이프스타일 브랜드처럼 보일 위험. 여기서 순서를 뒤집어, 컨택트시트 939장을 참조로 먼저 넣고 v0.2를 다시 그렸다.</p>
  <p style="max-width:70ch;color:rgba(28,36,34,.45);font-size:13px;margin-top:14px">보드의 글꼴·워드마크는 생성된 형태 예시이며 실제 폰트 지정이나 확정 로고가 아니다. 보드 내부의 작은 문구·UI·날짜는 스타일 시연용이다.</p>`,
    imgs: [['01_대담한온기.jpg', '01 대담한 온기'], ['02_선명한전문성.jpg', '02 선명한 전문성'], ['03_생기있는생활.jpg', '03 생기 있는 생활']] },
  { dir: '04_산출물/20260919_브랜드무드보드_v0.2', title: '브랜드 무드보드 3안 — v0.2',
    lede: '컨택트시트 939장을 참조로 투입한 뒤 다시 그렸다. 여기서 세 컨셉이 확정됐다.',
    after: `<h2 style="font-size:clamp(22px,3vw,34px);font-weight:800;letter-spacing:-.03em;margin-bottom:10px">v0.1에서 무엇이 바뀌었나</h2>
  <p style="max-width:70ch;color:rgba(28,36,34,.70);font-size:15px">그림 실력이 아니라 <strong>입력</strong>을 바꿨다. 939장 수집의 결과를 컨택트시트로 압축해 참조로 넣고 다시 생성했다. 이름도 함께 바뀌었다 — 대담한 온기 → <strong>잔잔한 온기</strong>, 선명한 전문성 → <strong>맑은 시선</strong>, 생기 있는 생활 → <strong>일상의 여백</strong>. 세 이름 모두 강도를 낮추는 방향이다. <a href="${BASE}/04_산출물/20260919_브랜드무드보드_v0.1/index.html">v0.1 보기 →</a></p>`,
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
<main data-gallery><div class="wrap" style="display:grid;gap:56px">
${mb.imgs.map(([src, cap]) => `  <figure><img src="${src}" alt="${cap}"><figcaption>${cap}</figcaption></figure>`).join('\n')}
${mb.after ? `  <div style="border-top:1px solid #E3EAE7;padding-top:34px">${mb.after}</div>` : ''}
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
.vdraft{display:inline-block;margin-left:9px;font-size:11px;font-weight:800;letter-spacing:.03em;
 color:var(--deep);background:var(--pale);padding:2px 8px;vertical-align:1px}
@media(max-width:700px){
  .vrow{grid-template-columns:1fr;gap:2px}
  .vrow .vn,.vsubs{grid-column:1}
  .vwrap .vsubs{padding-left:0}
}
`;

function versionRow(x) {
  const badge = x.drafts ? `<span class="vdraft">과정 시안 ${x.drafts}</span>` : '';
  const row = `<a class="vrow${x.final ? ' is-final' : ''}" href="${x.href}" target="_blank" rel="noopener">`
    + `<span class="vv">${x.v}</span><span class="vd">${x.d}</span>`
    + `<span class="vt">${x.t} ↗</span><span class="vn">${x.n}${badge}</span></a>`;
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
  <p><strong>과정 시안</strong> 배지가 붙은 버전은 페이지 맨 아래에 <strong>그 버전에서 되돌린 자리</strong>가 이전·이후로 나란히 들어 있다. 어느 페이지에서든 이미지를 누르면 전체 화면으로 열리고, <code>100%</code>에서 원본 픽셀 크기로 본다.</p>
  <div class="varch">
${VERSIONS.map(versionRow).join('\n')}
  </div>
</div></section>
`;

/* ── 6-a. 버린 것들 (허브 섹션) ── */
const MOOD_REJECTS = [
  ['B042_IMG001_web_20260920.jpg', '당근', '생활 흔적은 있으나 <b>여백이 없다.</b> 정보 나열이 지배적'],
  ['B044_IMG001_web_20260920.jpg', 'Monocle', '여백이 아니라 <b>밀도</b>가 핵심이다. 무드가 반대'],
  ['B046_IMG001_web_20260920.jpg', '무신사 스탠다드', '할인 배너 3개 + 태그 나열. 플랫폼 종속이라 브랜드 고유 지면도 아니다'],
  ['B047_IMG001_web_20260920.jpg', '아로마티카', '비건·친환경 브랜드인데 <b>홈이 세일 지면</b>이다'],
  ['B049_IMG001_web_20260920.jpg', '어뮤즈', '정보 과밀. 색조 프로모션 지면'],
  ['B050_IMG001_web_20260920.jpg', '라카', '프로모션 띠가 화면을 가른다. 여백 없음'],
];

function rejGrid(dir, items) {
  return `<div class="rej">` + items.map(([f, t, w]) =>
    `<div class="rej-item"><figure><img src="${dir}/${f}" alt="${t}" loading="lazy" data-title="${t}"></figure><div class="why"><strong>${t}</strong> — ${w}</div></div>`
  ).join('') + `</div>`;
}

const ACCESS_FAIL_DIR = '01_리서치/실제기업_브랜드레퍼런스/_접근실패';
const MOOD_DIR = '01_리서치/실제기업_브랜드레퍼런스/_무드부적합';
const ADOBE_DIR = '01_리서치/이미지리서치/_INVALID_adobestock';
const BING_DIR = '01_리서치/이미지리서치/_INVALID_bing/grids';

function listJpg(rel) {
  const abs = path.join(DEST, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.toLowerCase().endsWith('.jpg')).sort();
}

const REJECT_SECTION = `
<!-- 버린 것들 -->
<section id="rejects" data-gallery><div class="wrap">
  <div class="eyebrow">06 · Rejected</div>
  <h2>버린 것 · 못 본 것</h2>
  <p>리서치에서 나온 결과를 전부 쓰지 않았다. 쓰지 않기로 한 것과 <strong>끝내 보지 못한 것</strong>을 지우지 않고 남긴다. 무엇을 못 봤는지가 결론의 신뢰 구간이다.</p>
  <p class="sub">이미지를 누르면 전체 화면으로 열린다 · 100% 버튼에서 원본 픽셀 · ← → 로 이동</p>

  <h3>무드 부적합 — 캡처는 됐지만 뺐다</h3>
  <p>접근 실패가 아니다. 지정한 무드에 맞지 않아 후보에서 뺀 것이다. 다만 <strong>'여백이 아닌 해법'의 대조군</strong>으로는 남겨 둔다. 국내 뷰티 3곳은 브랜드가 말하는 것과 고객이 처음 보는 화면이 다른 사례다 — 월 5,900원을 팔아야 하는 임차in케어에 그대로 걸리는 질문이다.</p>
  ${rejGrid(MOOD_DIR, MOOD_REJECTS)}

  <h3>접근 실패 — 화면을 못 봤다</h3>
  <p>캡처 자체가 실패한 건들이다. 오류 페이지와 봇 차단 화면까지 그대로 보관했다. 우회하지 않았다.</p>
  ${rejGrid(ACCESS_FAIL_DIR, listJpg(ACCESS_FAIL_DIR).map((f) => {
    const p2 = f.replace(/\.jpg$/i, '').split('_');
    const id = p2[0];
    const rest = p2.slice(1).filter((x) => !/^(IMG\d+|web|\d{8})$/i.test(x)).join(' ');
    const isErr = /error/i.test(f) ? '오류 페이지' : (/cloudflare|blocked|denied/i.test(f) ? '봇 차단 화면' : '캡처 실패');
    return [f, rest ? `${id} · ${rest}` : id, isErr];
  }))}

  <h3>Adobe Stock — 표본 0장</h3>
  <p>8건 검색 전부 <code>액세스가 일시적으로 제한되었습니다</code>를 반환했다. 로그인 후 재시도도 같았다. 계획의 「우회하지 말고 한계를 기록한다」에 따라 추가 우회를 시도하지 않았다.
  <strong>남은 구멍 —</strong> 상업 스톡의 전형성을 직접 관찰하지 못했다. Q02의 클리셰 판정은 Pinterest와 Google에만 의존한다.</p>
  ${rejGrid(ADOBE_DIR, listJpg(ADOBE_DIR).map((f) => {
    const m = f.match(/^(Q\d+)_adobestock_(.+?)_\d{8}/);
    return [f, m ? `${m[1]} · ${m[2].replace(/-/g, ' ')}` : f, '<b>액세스가 일시적으로 제한되었습니다</b> — 표본 0장'];
  }))}

  <h3>Bing Images — 69장 전량 격리</h3>
  <p>검색어와 결과의 대응이 깨졌다. <code>hero protection rescue advertising</code>에 맨체스터 유나이티드 사진이, <code>조용한 따뜻함</code>에 미국 Veterans Day 템플릿이, <code>insurance brand advertising family</code>에 한국 트로트 가수 사진이 돌아왔다. 원인은 특정하지 못했다. 본 인벤토리에서 제거하고 별도 CSV로 분리했다.</p>
  ${rejGrid(BING_DIR, listJpg(BING_DIR).map((f) => {
    const m = f.match(/^(Q\d+)_bing_(.*?)_?\d{8}/);
    const q = m && m[2] ? m[2].replace(/-/g, ' ') : '(검색어 없음)';
    return [f, `${m ? m[1] : f} · ${q}`, '검색어–결과 대응이 깨진 <b>무효 표본</b>'];
  }))}
</div></section>
`;

const REJECT_CSS = `
.rej{margin-top:22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:22px}
.rej-item figure{margin:0}
.rej-item img{width:100%;height:auto;display:block;border:1px solid var(--line);filter:grayscale(.2);cursor:zoom-in}
.rej-item .why{margin-top:9px;font-size:12.5px;color:var(--ink-70);line-height:1.55}
.rej-item .why b{color:var(--amber)}
.rej-item .why strong{font-weight:700}
`;

/* ── 6-b. 과정 블록 주입 + 전 페이지 라이트박스 ── */
let injected = 0;
for (const [rel, depth, html] of INJECT) {
  const abs = path.join(DEST, rel);
  if (!fs.existsSync(abs)) { console.warn(`  ! 주입 대상 없음: ${rel}`); continue; }
  let t = fs.readFileSync(abs, 'utf8');
  const blk = `<style>${PD_CSS}</style>\n${html}\n`;
  if (t.includes('</body>')) t = t.replace('</body>', `${blk}</body>`);
  else if (t.includes('</html>')) t = t.replace('</html>', `${blk}</html>`);
  else t += blk;
  fs.writeFileSync(abs, t);
  injected++;
}

// 모든 HTML에 라이트박스 주입 (허브 제외 — 허브는 아래에서 별도 처리)
let lbCount = 0;
for (const file of walk(DEST)) {
  if (path.extname(file).toLowerCase() !== '.html') continue;
  let t = fs.readFileSync(file, 'utf8');
  if (t.includes('lb-stage')) continue;
  const snippet = `<style>${LIGHTBOX_CSS}</style>\n<script>${LIGHTBOX_JS}</script>\n`;
  // 원본 중 일부는 </body> 없이 </html>로 끝난다
  if (t.includes('</body>')) t = t.replace('</body>', `${snippet}</body>`);
  else if (t.includes('</html>')) t = t.replace('</html>', `${snippet}</html>`);
  else t += snippet;
  fs.writeFileSync(file, t);
  lbCount++;
}
console.log(`과정 블록 주입 ${injected}건 · 라이트박스 ${lbCount}개 페이지`);

let hub = fs.readFileSync(path.join(SRC, '05_리서치프로세스/index.html'), 'utf8');

// 경로 기준을 프로젝트 루트 → ien-process 루트로 (허브가 한 단계 위로 올라옴)
hub = hub.replace(/(src|href)="\.\.\//g, '$1="');
hub = hub.replace(/\.png(["')\s])/gi, '.jpg$1');

// 공개본에 포함하지 않는 기밀 자료 링크 2건 제거
hub = hub.replace(/^.*href="(?:04_산출물\/01_브랜드리서치_종합보고서|00_GPT\/).*$\n?/gm, '');

// 스타일 · 내비 · 섹션 삽입
hub = hub.replace('</style></head>', `${HUB_CSS}${REJECT_CSS}${LIGHTBOX_CSS}</style></head>`);
hub = hub.replace('<a href="#index">자료 인덱스</a>', '<a href="#versions">버전 아카이브</a><a href="#index">자료 인덱스</a>');
hub = hub.replace('<!-- 인덱스 -->', `${VERSION_SECTION}\n<!-- 인덱스 -->`);
hub = hub.replace('<div class="eyebrow">06 · Index</div>', '<div class="eyebrow">08 · Index</div>');
hub = hub.replace('<div class="eyebrow">07 · Principles</div>', '<div class="eyebrow">09 · Principles</div>');
hub = hub.replace('<!-- 인덱스 -->', `${REJECT_SECTION}\n<!-- 인덱스 -->`);
hub = hub.replace('<a href="#index">자료 인덱스</a>', '<a href="#rejects">버린 것</a><a href="#index">자료 인덱스</a>');

// 공개본 고지
hub = hub.replace('</footer>', `  <div class="wrap"><p style="margin-top:18px;font-size:13px;color:var(--ink-45)">
  공개본 안내 — 클라이언트 제공 원본(<code>대표님 자료/</code>), AI 세션 전문(<code>00_GPT/</code>), 내부 메모, 클라이언트 종합 보고서는 이 공개 페이지에 포함하지 않았다. 이미지는 웹 전송을 위해 JPEG로 재인코딩했다.</p></div>
</footer>`);

hub = hub.replace('</body>', `<script>${LIGHTBOX_JS}</script>\n</body>`);
fs.writeFileSync(path.join(DEST, 'index.html'), hub);
console.log(`허브: index.html · 버전 ${VERSIONS.length}종 · 무드보드 인덱스 ${MOODBOARDS.length}종 생성`);
