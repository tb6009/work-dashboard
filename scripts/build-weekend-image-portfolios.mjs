#!/usr/bin/env node
/**
 * build-weekend-image-portfolios.mjs — 2026-09-26~27 주말 이미지 작업 공개본 2종
 *
 *   0311 KCS 학습모듈 이미지  → app/public/kcs-module-images/
 *   039  Value-up 인포그래픽   → app/public/valueup-infographics/
 *
 * 원본은 read-only. PNG → JPEG(q80, 긴 변 1600px)로 재인코딩해 복사한다.
 * 공개 제외: 학습모듈 인용 이미지(04_인용이미지·references, 제3자 권리), 원고 본문 md.
 * 사용법: node scripts/build-weekend-image-portfolios.mjs
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { LIGHTBOX_CSS, LIGHTBOX_JS } from './lib/lightbox.mjs';

const WS = join(import.meta.dirname, '..', '..', '..');
const PUB = join(import.meta.dirname, '..', 'app', 'public');
const MOD = join(WS, '03_school_project/2026_가을학기/교내 연구/2026_학습모듈개발');
const VU = join(WS, '03_school_project/02_RISE/2026_가을_Value-up연구회');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const imgs = dir => existsSync(dir)
  ? readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f)).map(f => f.normalize('NFC')).sort()
  : [];

function toJpeg(src, outDir, name) {
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, name.replace(/\.(png|jpe?g)$/i, '.jpg'));
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '1600', src, '--out', out], { stdio: 'ignore' });
  return basename(out);
}

const CSS = `
:root{--ink:#1A2B4A;--ink-70:#4a5670;--ink-45:#8a93a6;--line:#e3e1dc;--bg:#faf9f6;--warm:#C9A96E;--sage:#7C9885}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.65 Pretendard,-apple-system,"Apple SD Gothic Neo",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:40px 16px 80px}
.eyebrow{font-size:12px;letter-spacing:.12em;color:var(--warm);font-weight:700}
h1{font-size:34px;line-height:1.25;margin:8px 0 12px}h2{font-size:22px;margin:56px 0 6px;padding-top:20px;border-top:2px solid var(--ink)}
h3{font-size:16px;margin:28px 0 8px}.lead{color:var(--ink-70);max-width:760px}
.notice{margin:18px 0 8px;padding:10px 14px;border-left:3px solid var(--warm);background:#fff;font-size:13px;color:var(--ink-70)}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.toc a{font-size:13px;padding:4px 10px;border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.gal.wide{grid-template-columns:repeat(auto-fill,minmax(340px,1fr))}
figure{margin:0;background:#fff;border:1px solid var(--line);padding:8px}
figure img{width:100%;display:block;background:#f1efe9}
figcaption{font-size:12px;color:var(--ink-70);margin-top:6px;word-break:break-all}
.tag{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;margin-right:4px;background:var(--ink);color:#fff}
.tag.old{background:var(--line);color:var(--ink-70)}
.row{margin-bottom:22px}.row .id{font-weight:700;font-size:14px;margin-bottom:6px}
.meta{font-size:13px;color:var(--ink-45)}footer{margin-top:64px;font-size:12px;color:var(--ink-45)}
${LIGHTBOX_CSS}`;

const page = (title, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>${CSS}</style></head><body><div class="wrap">${body}
<footer>박진현 workDashboard · 원본 파일에서 자동 생성 (scripts/build-weekend-image-portfolios.mjs) · 이미지는 공개용 JPEG 축소본, 클릭하면 크게 보입니다.</footer>
</div><script>${LIGHTBOX_JS}</script></body></html>`;

const fig = (src, cap, tag, old) =>
  `<figure><img loading="lazy" src="${encodeURI(src)}" alt="${esc(cap)}"><figcaption>${tag ? `<span class="tag${old ? ' old' : ''}">${tag}</span>` : ''}${esc(cap)}</figcaption></figure>`;

// 버전 정렬: 버전 표기 없음 = v1, final = 최상위
function verRank(f) {
  if (/final/i.test(f)) return 999;
  const m = f.match(/_v(\d+)/i);
  return m ? +m[1] : 1;
}

// ─── 1) KCS 학습모듈 ─────────────────────────────────────────
function buildModule() {
  const OUT = join(PUB, 'kcs-module-images');
  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  const CH = join(MOD, '06_챕터');
  const adopted = new Set(imgs(join(CH, '통합/assets')));
  const chapters = readdirSync(CH).filter(d => /^0\d_학습/.test(d)).sort();
  let total = 0, body = '', toc = '';

  for (const ch of chapters) {
    const n = ch.slice(1, 2);
    const title = ch.replace(/^0\d_/, '').replace(/_/g, ' ');
    const files = imgs(join(CH, ch, 'assets'));
    const groups = new Map();
    for (const f of files) {
      const key = f.split('_')[0];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    }
    toc += `<a href="#ch${n}">${esc(title)}</a>`;
    body += `<h2 id="ch${n}">${esc(title)}</h2><p class="meta">이미지 ${groups.size}종 · 파일 ${files.length}장 (수정 이력 포함)</p>`;
    for (const [key, list] of groups) {
      list.sort((a, b) => verRank(b) - verRank(a) || b.localeCompare(a));
      body += `<div class="row"><div class="id">${esc(key)}</div><div class="gal" data-gallery>`;
      for (const f of list) {
        const out = toJpeg(join(CH, ch, 'assets', f), join(OUT, 'img', `ch${n}`), f);
        const isFinal = adopted.has(f);
        body += fig(`img/ch${n}/${out}`, f.replace(/\.(png|jpe?g)$/i, ''), isFinal ? '본문 채택' : '이전 버전', !isFinal);
        total++;
      }
      body += `</div></div>`;
    }
  }

  // 9/27 학습 1~3 개선 — 통합본 v0.3 그림(이전) ↔ 개선 후보(이후)
  const CAND = join(MOD, '04_작업/19_학습1-3_이미지개선_20260927/후보');
  const cands = imgs(CAND);
  const integ = [...adopted];
  if (cands.length) {
    toc += `<a href="#cand">9/27 이전·이후</a>`;
    body += `<h2 id="cand">9/27 학습 1~3 수정보완 — 이전·이후</h2>
<p class="meta">통합본 v0.3에 들어간 19개 그림을 다시 보고 14개를 고쳤습니다(5개 유지). 16회 생성해 2개는 버리고 14개를 골랐습니다. 왼쪽이 고치기 전, 오른쪽이 고친 후보입니다.</p>`;
    for (const f of cands) {
      const m = f.match(/그림_(\d)-(\d)/);
      const key = m ? (m[1] === '1' ? `CH1-IMG-0${m[2]}` : `CH${m[1]}-0${m[2]}`) : null;
      const before = key && integ.find(x => x.startsWith(key + '_'));
      const a = toJpeg(join(CAND, f), join(OUT, 'img', 'cand'), f);
      body += `<div class="row"><div class="id">${esc(f.replace(/\.(png|jpe?g)$/i, '').replace(/_/g, ' '))}</div><div class="gal wide" data-gallery>`;
      if (before) {
        const b = toJpeg(join(CH, '통합/assets', before), join(OUT, 'img', 'cand-before'), before);
        body += fig(`img/cand-before/${b}`, before.replace(/\.(png|jpe?g)$/i, ''), '이전', true);
        total++;
      }
      body += fig(`img/cand/${a}`, f.replace(/\.(png|jpe?g)$/i, ''), '이후');
      body += `</div></div>`;
      total++;
    }
  }

  // 오류 → 수정 장부 (근거: 03_검토/15·17·19, 04_작업/16·19, 06_챕터 98_제작기록, docs/logs 9/26·27)
  const ERRORS = [
    ['CH2-07', '티백', '갈색 밀봉 외포장을 뜯지 않고 컵에 넣는 장면으로 읽힘', '마른 흰 필터·끈·무지 태그, 물에 잠긴 부분만 젖은 갈색', 'v2 → v3 → v5', '03_검토/15'],
    ['CH4-01', '컵·티백', '컵 정본 불일치, v2에서 티백이 피라미드형 메시로 바뀜', '투명 유리 손잡이 컵과 흰 필터 티백으로 통일', 'v1 → v2 → v3', '04_작업/16 프롬프트 v0.5'],
    ['CH4-01', '디바이스 비율', '노트북·모니터 화면이 거의 정사각형(측정 약 1.1:1·1.0:1)', '베젤 외곽 실측으로 노트북 약 1.63:1, 모니터 약 1.9:1 이상 확인', 'v3 → v4 → v5-final', '03_검토/17'],
    ['CH4-03', '디바이스 비율', '세로로 긴 카드·디바이스 5개가 찌그러져 보임', '같은 비율의 가로 패널 3개로 재구성', 'v2 → v3', '03_검토/17'],
    ['CH5-02', '티백', '왼쪽 컵에 갈색 외포장이 남음', '봉합된 흰 종이 필터·한 줄 끈·무지 흰 태그', 'v1 → v2', '03_검토/19'],
    ['CH5-04', '밤 단면', '껍질 경계가 말린 입술처럼 솟고 상자 그림은 가로 원형 단면', '실제 절단 사진·해부 자료 대조 후 세로 절단·얇은 껍질선, 실물 3+인쇄 3 모두 교정', 'v1 → v2 → v3', '03_검토/19'],
    ['CH1-IMG-05', '물리 오류', '세척 장면에서 닫힌 병 바닥으로 물이 통과', '병 세척 동작 수정', 'v2 → 9/27 후보', '04_작업/19'],
    ['CH2-04 · CH2-06', '밤 단면', '별 모양·꽃잎처럼 갈라진 단면', '연속된 과육 면으로 교정', '→ 9/27 후보', '04_작업/19'],
    ['CH2-07', '밤 표면', '캐러멜 같은 광택', '광택을 줄이고 깐 밤 표면 보완', 'v5 → 9/27 후보', '04_작업/19'],
    ['CH3-04 · CH3-05', '티백 끈', '세 화면의 젖음 상태 불일치, 끈이 두 줄', '젖음 상태 통일, 태그에서 필터까지 한 줄', '→ 9/27 후보(3-4는 2회차)', '04_작업/19'],
    ['CH6 샘플 3종', '밤 형태·좌면', '밤이 도토리처럼 변형, 좌면이 몸통을 두르는 띠', '003 밤 시각데이터 기준(짧은 꼭지·세로 결·하단 좌면)으로 편집', 'v1 → v4 (승인 대기)', '06_챕터 98_제작기록'],
    ['CH6 샘플 2', '잔 투시·티백', '잔 타원·접지 그림자 어긋남, 티백 외곽이 직선적', '림·수면·굽 타원 재계산, 필터 처짐 보정 — 외곽 규칙성은 잔존 한계로 기록', 'v2 → v3 → v4', '06_챕터 98_제작기록'],
  ];
  const ledger = `<h2 id="process">제작 과정</h2>
<p class="lead">이미지는 한 장씩 같은 순서를 거쳤습니다. 장별 이미지 명세를 쓰고 → 제작 프롬프트로 생성하고 → 자체 평가와 제작에 참여하지 않은 독립 검토로 90점 게이트를 보고 → 오류가 나오면 새 버전으로 다시 만들고, 이전 버전은 지우지 않고 오류 이력으로 남겼습니다. 한 장을 고치면 같은 소재가 나오는 다른 장도 함께 다시 봤습니다.</p>
<p class="lead">오류는 대부분 반복 소재에서 나왔습니다. 컵은 투명 유리 손잡이 컵으로, 티백은 흰 필터·한 줄 끈·무지 태그·잠긴 부분만 젖은 갈색으로, 밤은 짧은 꼭지·세로 결·하단 좌면으로 정본을 정해 두었는데, 생성 모델이 매번 이 정본에서 조금씩 벗어났습니다. 특히 밤은 도토리처럼 변하거나 단면이 별 모양으로 갈라지는 오류가 계속 나와서, 실물 자료를 모은 별도 프로젝트(1302 케이스 003 밤 시각데이터)로 떼어 기준부터 다시 만들고 있습니다.</p>
<h2 id="errors">오류 → 수정 장부</h2>
<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:760px;font-size:13px;background:#fff">
<tr style="text-align:left;border-bottom:2px solid var(--ink)"><th style="padding:8px">그림</th><th>유형</th><th>오류</th><th>수정</th><th>버전</th><th>근거 문서</th></tr>
${ERRORS.map(r => `<tr style="border-bottom:1px solid var(--line);vertical-align:top">${r.map((c, i) => `<td style="padding:8px${i === 0 ? ';font-weight:700;white-space:nowrap' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}
</table></div>
<p class="meta">남은 한계(9/27 검토 기록): 2-4·2-6 미세 방사상 결, 2-7 규칙적인 홈, 2-5 손에 가린 태그, CH6 샘플 2 티백 외곽의 규칙성. 밤의 실물 정확도는 아직 확정하지 않았습니다.</p>`;
  toc = `<a href="#process">제작 과정</a><a href="#errors">오류 → 수정 장부</a><a href="#cost">AI 비용</a>` + toc;

  // 비용 — W39 주간 JSON의 externalAI (scripts/extract-external-ai-usage.py)
  const W = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'app/src/data/weekly/2026-W39.json'), 'utf-8'));
  const X = W.externalAI;
  const cost = X ? `<h2 id="cost">AI 사용 비용 (W39 · 9/21~27, 워크스페이스 전체)</h2>
<p class="meta">API 정가 환산이며 실제 결제액(구독 요금)과 다릅니다. 학습모듈만 따로 떼지 않은 주간 전체 값입니다.</p>
<div class="gal" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">
${[['합계', `$${X.totalUSD.toFixed(2)}`, `≈ ₩${X.totalKRW.toLocaleString('ko-KR')}`],
    ['Claude', `$${W.tokens.costUSD.toFixed(2)}`, '기획·검토·집계'],
    ['Codex (OpenAI)', `$${X.codex.costUSD.toFixed(2)}`, '집필·이미지 생성 세션'],
    ['Gemini', `$${X.gemini.costUSD.toFixed(2)}`, '9/22~24 코퍼스 작업 · 추정'],
    ['생성 이미지', `${X.codex.images}장`, `9/26 ${X.codex.imagesByDay['2026-09-26'] ?? 0}장 · 9/27 ${X.codex.imagesByDay['2026-09-27'] ?? 0}장`]]
    .map(([k, v, s]) => `<figure><div class="meta">${k}</div><div style="font-size:22px;font-weight:700">${v}</div><figcaption>${s}</figcaption></figure>`).join('')}
</div><p class="meta">${esc(X.note)} 단가 출처: ${esc(X.pricingSource)}</p>` : '';

  const head = `<div class="eyebrow">0311 · KCS 학습모듈 개발 · 2026.09.26–27</div>
<h1>「AI 비주얼 스토리텔링과 이미지제작」<br>학습 1~6 본문 이미지</h1>
<p class="lead">주말 이틀 동안 학습 1~6의 본문 이미지를 만들고 고친 기록입니다. 이미지마다 본문에 채택한 최종본을 앞에, 고치기 전 버전을 뒤에 두었습니다. 컵·티백·밤처럼 여러 장에 반복되는 소재는 한 번 정한 모양(투명 유리컵, 흰 필터 티백, 물에 잠긴 부분만 젖은 갈색)을 끝까지 맞추느라 버전이 많아졌습니다.</p>
<div class="notice">내부 제작 시안 · 공모 제출(9/30) 전 · 생성형 이미지. 제3자 인용 이미지(공공영역 명화·사진)와 원고 본문은 공개하지 않았습니다.</div>
<p class="meta">총 ${total}장</p><nav class="toc">${toc}</nav>`;
  writeFileSync(join(OUT, 'index.html'), page('KCS 학습모듈 이미지', head + ledger + cost + body));
  console.log(`✅ kcs-module-images: ${total}장`);
}

// ─── 2) Value-up 인포그래픽 ──────────────────────────────────
function buildValueup() {
  const OUT = join(PUB, 'valueup-infographics');
  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  const O = join(VU, 'ChatGPT/outputs');
  const A = join(VU, 'docs/assets');
  let total = 0, body = '', toc = '';

  const section = (id, title, desc, items, wide) => {
    if (!items.length) return;
    toc += `<a href="#${id}">${esc(title)}</a>`;
    body += `<h2 id="${id}">${esc(title)}</h2><p class="meta">${esc(desc)}</p>`;
    for (const { ver, list, note } of items) {
      body += `<h3>${esc(ver)}</h3>${note ? `<p class="meta">${esc(note)}</p>` : ''}<div class="gal${wide ? ' wide' : ''}" data-gallery>`;
      for (const [dir, f] of list) {
        const sub = `${id}/${ver.replace(/[^\w.]/g, '')}`;
        const out = toJpeg(join(dir, f), join(OUT, 'img', sub), f);
        body += fig(`img/${sub}/${out}`, f.replace(/\.(png|jpe?g)$/i, ''));
        total++;
      }
      body += `</div>`;
    }
  };

  const vers = (prefix) => readdirSync(O).filter(d => d.startsWith(prefix)).sort().reverse();
  const verOf = d => (d.match(/v\d+\.\d+[^/]*/) || [d])[0].replace(/_/g, ' ');
  const notes = {
    'A3세로 v0.2': '하단 일정 설명 보강, 역할 3단계 그룹화, 교수 워크숍 중앙 정렬',
    'A3세로 v0.1': '타이틀 우선, 3×2 블록에 큰 협업 이미지와 축약 설명',
    '1페이지 v0.4 SKF스타일': 'SKF A5 일러스트 문법(검은 외곽선·블루 복장)으로 협업 장면 6종 생성',
    '1페이지 v0.3': '장면·역할 일러스트 상세화, 제목-본문 간격 12→26px',
    '1페이지 v0.2': '픽토그램 6종과 코치·디자이너·학습자 역할 추가',
    '1페이지 v0.1': '레퍼런스의 6영역·하단 일정 구성을 흰 바탕·블루로 적용',
  };

  const main = (prefix, label) => vers(prefix).map(d => {
    const ver = `${label} ${verOf(d)}`;
    return { ver, note: notes[ver], list: imgs(join(O, d)).filter(f => !/검수/.test(f)).map(f => [join(O, d), f]) };
  }).filter(x => x.list.length);

  section('a3', 'A3 세로 인포그래픽', '이미지 중심 최종 방향. 최신 버전이 위에 있습니다.', main('20260927_A3세로_인포그래픽', 'A3세로'), true);
  section('onepage', '1페이지 인포그래픽 (A4 가로)', '글 중심에서 사람·관계 일러스트 중심으로 옮겨 간 네 번의 수정.', main('20260927_1페이지_인포그래픽', '1페이지'), true);

  const diag = [['valueup_20260927_v03', 'v0.3'], ['valueup_20260927_v02', 'v0.2'], ['valueup_20260927', 'v0.1']]
    .map(([d, v]) => ({ ver: `도식 ${v}`, list: imgs(join(A, d)).map(f => [join(A, d), f]) }))
    .filter(x => x.list.length);
  section('diagram', '개요·세부계획 도식', '선과 상자는 생성 이미지 없이 SVG로 그렸습니다. v0.2에서 D7 계원형 표준 프로세스가 추가됐습니다.', diag);

  const pages = vers('20260927_프로젝트개요_세부계획').map(d => ({
    ver: `문서 ${verOf(d)}`,
    list: imgs(join(O, d, '검수')).map(f => [join(O, d, '검수'), f]),
  })).filter(x => x.list.length);
  section('doc', '프로젝트 개요·세부계획 (A4 7쪽)', '개요 2쪽 + 세부계획 5쪽 조판 결과. 쪽 단위 렌더 검수 이미지입니다.', pages);

  const head = `<div class="eyebrow">039 · RISE · 계원 × VITAL Value-up 연구모임 · 2026.09.27</div>
<h1>강점을 발견하고, 디자인으로 실행하다<br>Value-up 연구모임 시각 자료</h1>
<p class="lead">하루 동안 연구모임 개요·세부계획 문서를 세 번 고치고, 같은 내용을 1페이지와 A3 한 장으로 압축한 과정입니다. 처음에는 글과 도식이 중심이었고, 사람과 관계가 보여야 한다는 피드백을 받아 일러스트 중심으로 옮겨 갔습니다.</p>
<div class="notice">내부 협의안 · 일정·예산·성과 범위는 확정 전입니다.</div>
<p class="meta">총 ${total}장</p><nav class="toc">${toc}</nav>`;
  writeFileSync(join(OUT, 'index.html'), page('Value-up 인포그래픽', head + body));
  console.log(`✅ valueup-infographics: ${total}장`);
}

buildModule();
buildValueup();
