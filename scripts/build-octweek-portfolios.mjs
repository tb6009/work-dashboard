#!/usr/bin/env node
/**
 * build-octweek-portfolios.mjs — 2026-10 둘째 주 작업 공개본 2종
 *
 *   1303 DataViz AI 작업 히스토리  → app/public/dataviz-history/   (SVG만, v0.1~최신)
 *   039  디자인터칭데이 홍보물 제작 → app/public/valueup-touchingday/ (PNG → JPEG 축소본)
 *
 * 원본은 read-only. 공개 제외: 참고 레퍼런스 이미지(제3자 권리), 기존 작품 재사용 이미지(대표이미지 선정),
 * 화면 캡처(visual_review), PDF·폰트·빌드 스크립트.
 * 사용법: node scripts/build-octweek-portfolios.mjs
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { LIGHTBOX_CSS, LIGHTBOX_JS } from './lib/lightbox.mjs';

const WS = join(import.meta.dirname, '..', '..', '..');
const PUB = join(import.meta.dirname, '..', 'app', 'public');
const DV = join(WS, '13_Image/1303_DataViz/10_AI작업히스토리');
const VU = join(WS, '03_school_project/02_RISE/2026_가을_Value-up연구회');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const ls = dir => existsSync(dir) ? readdirSync(dir).map(f => f.normalize('NFC')).sort() : [];
const mdate = p => { const d = statSync(p).mtime; return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const verNum = s => { const m = s.match(/v(\d+)\.(\d+)/); return m ? +m[1] * 1000 + +m[2] : 0; };

function toJpeg(src, outDir, name) {
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, name.replace(/\.(png|jpe?g)$/i, '.jpg'));
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '1600', src, '--out', out], { stdio: 'ignore' });
  return basename(out);
}

const CSS = `
:root{--ink:#1A2B4A;--ink-70:#4a5670;--ink-45:#8a93a6;--line:#e3e1dc;--bg:#faf9f6;--warm:#C9A96E}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.65 Pretendard,-apple-system,"Apple SD Gothic Neo",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:40px 16px 80px}
.eyebrow{font-size:12px;letter-spacing:.12em;color:var(--warm);font-weight:700}
h1{font-size:34px;line-height:1.25;margin:8px 0 12px}h2{font-size:22px;margin:56px 0 6px;padding-top:20px;border-top:2px solid var(--ink)}
h3{font-size:16px;margin:28px 0 8px}.lead{color:var(--ink-70);max-width:780px}
.notice{margin:18px 0 8px;padding:10px 14px;border-left:3px solid var(--warm);background:#fff;font-size:13px;color:var(--ink-70)}
.toc{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0}.toc a{font-size:12px;padding:3px 8px;border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.gal.wide{grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
figure{margin:0;background:#fff;border:1px solid var(--line);padding:8px}
figure img{width:100%;display:block;background:#f1efe9}
figcaption{font-size:12px;color:var(--ink-70);margin-top:6px;word-break:break-all}
.tag{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;margin-right:4px;background:var(--ink);color:#fff}
.tag.old{background:var(--line);color:var(--ink-70)}
.ver{display:grid;grid-template-columns:minmax(0,300px) 1fr;gap:20px;padding:18px 0;border-top:1px solid var(--line)}
.ver h3{margin:0 0 4px}.ver ul{margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--ink-70)}
.ver .open{font-size:12px}.nosvg{padding:28px 12px;text-align:center;font-size:12px;color:var(--ink-45);border:1px dashed var(--line);background:#fff}
@media(max-width:700px){.ver{grid-template-columns:1fr}}
.meta{font-size:13px;color:var(--ink-45)}footer{margin-top:64px;font-size:12px;color:var(--ink-45)}
${LIGHTBOX_CSS}`;

const page = (title, script, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>${CSS}</style></head><body><div class="wrap">${body}
<footer>박진현 workDashboard · 원본 파일에서 자동 생성 (scripts/${script}) · 클릭하면 크게 보입니다.</footer>
</div><script>${LIGHTBOX_JS}</script></body></html>`;

const fig = (src, cap, tag, old) =>
  `<figure><img loading="lazy" src="${esc(src)}" alt="${esc(cap)}"><figcaption>${tag ? `<span class="tag${old ? ' old' : ''}">${esc(tag)}</span>` : ''}${esc(cap)}</figcaption></figure>`;

// README에서 변경 내용 불릿만 뽑는다 (최대 n개)
function bullets(readme, n = 5) {
  if (!existsSync(readme)) return [];
  return readFileSync(readme, 'utf-8').split('\n')
    .filter(l => /^- /.test(l) && !/README|미수행|검사했다|따른다/.test(l))
    .slice(0, n).map(l => l.slice(2).replace(/`/g, ''));
}

// ── 1303 DataViz 작업 히스토리 ──
function buildDataviz() {
  const OUT = join(PUB, 'dataviz-history');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'svg'), { recursive: true });
  copyFileSync(join(DV, 'A1_초안_v0.4/PretendardVariable.ttf'), join(OUT, 'svg/PretendardVariable.ttf'));

  const dirs = ls(DV).filter(d => /_v\d+\.\d+$/.test(d) && statSync(join(DV, d)).isDirectory() && !d.startsWith('프로젝트기록'))
    .sort((a, b) => verNum(a) - verNum(b));
  const rows = [];
  for (const d of dirs) {
    const ver = d.match(/v\d+\.\d+$/)[0];
    const title = d.replace(/^A1_/, '').replace(/_v\d+\.\d+$/, '').replace(/_/g, ' ');
    const svgs = ls(join(DV, d)).filter(f => f.endsWith('.svg'));
    const figs = svgs.map(f => {
      const name = `${ver}_${f}`;
      copyFileSync(join(DV, d, f), join(OUT, 'svg', name));
      return `<figure><img loading="lazy" src="svg/${esc(name)}" alt="${esc(`${ver} ${f}`)}"><figcaption>${esc(f)} · <a class="open" href="svg/${esc(name)}" target="_blank">SVG 원본 열기</a></figcaption></figure>`;
    });
    const when = mdate(join(DV, d, svgs[0] || 'README.md').replace(/README\.md$/, existsSync(join(DV, d, 'README.md')) ? 'README.md' : ''));
    const kind = d.startsWith('A1_') ? 'A1 포스터' : 'HTML 초안';
    const notes = bullets(join(DV, d, 'README.md'));
    rows.push(`<div class="ver" id="${ver}"><div>${figs.join('') || '<div class="nosvg">SVG 없음 — 브라우저용 HTML 초안 단계</div>'}</div>
<div><h3>${ver} · ${esc(title)}</h3><div class="meta">${kind} · ${when}</div>${notes.length ? `<ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div></div>`);
  }
  const nSvg = ls(join(OUT, 'svg')).filter(f => f.endsWith('.svg')).length;
  const first = dirs[0].match(/v\d+\.\d+$/)[0], last = dirs.at(-1).match(/v\d+\.\d+$/)[0];
  const body = `<div class="eyebrow">1303 · DATAVIZ · AI 작업 히스토리 · 2026.10.09–10</div>
<h1>AI 작업 계보 시각화 — 수정 히스토리 ${first} → ${last}</h1>
<p class="lead">워크스페이스의 AI 작업 기록(세션·파일·프로젝트 분기)을 한 장의 A1 세로 포스터로 만드는 과정입니다. v0.1–0.3은 브라우저용 HTML 초안, v0.4부터 A1(594×841mm) 포스터 SVG입니다. 버전마다 무엇을 고쳤는지는 각 폴더 README의 변경 내용을 그대로 옮겼습니다.</p>
<div class="notice">버전 ${dirs.length}개 · SVG ${nSvg}장. 썸네일은 브라우저 기본 글꼴로 보일 수 있습니다. 「SVG 원본 열기」를 누르면 Pretendard로 정확히 보입니다.</div>
<div class="toc">${dirs.map(d => { const v = d.match(/v\d+\.\d+$/)[0]; return `<a href="#${v}">${v}</a>`; }).join('')}</div>
<h2>수정 히스토리</h2>${rows.join('\n')}`;
  writeFileSync(join(OUT, 'index.html'), page('AI 작업 계보 시각화 히스토리', 'build-octweek-portfolios.mjs', body));
  console.log(`dataviz-history: ${dirs.length} versions, ${nSvg} svg`);
}

// ── 039 디자인터칭데이 홍보물 제작 과정 ──
function buildTouchingDay() {
  const OUT = join(PUB, 'valueup-touchingday');
  rmSync(OUT, { recursive: true, force: true });
  const A = join(VU, '발표자료/assets');
  const H = join(VU, '홍보자료제작');
  const img = (dir, f, sub) => `img/${sub}/${toJpeg(join(dir, f), join(OUT, 'img', sub), f)}`;
  const gal = (items, wide) => `<div class="gal${wide ? ' wide' : ''}">${items.join('')}</div>`;

  // 1. 키 비주얼
  const cover = ls(A).filter(f => f.startsWith('cover_match_firework_')).map(f =>
    fig(img(A, f, 'key'), f.replace('.png', ''), f.match(/v0\.\d/)[0], true));
  const ratios = ls(A).filter(f => /^spark_.*_v0\.1\.png$/.test(f)).map(f =>
    fig(img(A, f, 'key'), f.replace('.png', ''), f.split('_')[2], true));
  const story = ls(A).filter(f => /^spark_story_9x16_v0\.[2-9]\.png$/.test(f)).map(f => {
    const v = f.match(/v0\.\d/)[0];
    return fig(img(A, f, 'key'), f.replace('.png', ''), v === 'v0.7' ? '확정 v0.7' : v, v !== 'v0.7');
  });

  // 2. 비주얼 콘셉트
  const c1 = ls(join(H, 'assets/visual_concepts_v1')).filter(f => f.endsWith('.png')).map(f => fig(img(join(H, 'assets/visual_concepts_v1'), f, 'concept'), f.replace('.png', ''), 'v1', true));
  const c2 = ls(join(H, 'assets/visual_concepts_v2')).filter(f => f.endsWith('.png')).map(f => fig(img(join(H, 'assets/visual_concepts_v2'), f, 'concept'), f.replace('.png', ''), 'v2'));

  // 3. 포스터
  const P1 = join(H, '포스터_스위스타이포_3안_v1'), P2 = join(H, '포스터_스위스타이포_3안_v2');
  const p1 = ls(P1).filter(f => f.endsWith('.png')).map(f => fig(img(P1, f, 'poster1'), f.replace('.png', ''), 'v1', true));
  const p2groups = {};
  for (const f of ls(P2).filter(f => f.endsWith('.png'))) (p2groups[f[0]] ||= []).push(f);
  const p2 = Object.entries(p2groups).map(([k, list]) => `<h3>${k}안 (${list.length})</h3>` + gal(
    list.sort((a, b) => verNum(a) - verNum(b)).map(f => fig(img(P2, f, 'poster2'), f.replace('.png', ''), (f.match(/v\d+/) || ['v1'])[0]))));

  // 4. 캐러셀
  const K1 = join(H, '캐러셀_커버3종_v1'), K2 = join(H, '캐러셀_6페이지_3종_v2');
  const k1 = ls(K1).filter(f => f.endsWith('.png')).map(f => fig(img(K1, f, 'car1'), f.replace('.png', ''), 'v1', true));
  const sets = { A: '제품·제조', B: '앱·디지털 서비스', C: '브랜드·패키지·공간' };
  const k2 = Object.entries(sets).map(([k, name]) => {
    const pages = ls(K2).filter(f => f.startsWith(k) && f.endsWith('_정렬편집본.png'));
    const raw = pages.map(f => { const g = f.replace('정렬편집본', '생성시안'); return fig(img(K2, g, 'car2raw'), g.replace('.png', ''), '생성', true); });
    const fin = pages.map(f => fig(img(K2, f, 'car2'), f.replace('.png', ''), '편집본'));
    return `<h3>${k}안 · ${name} — 편집본 6장</h3>${gal(fin)}<details><summary class="meta">같은 페이지의 AI 생성 시안 6장 보기</summary>${gal(raw)}</details>`;
  });

  const body = `<div class="eyebrow">039 · RISE · 2026 가을 VALUE-UP 연구회 · 2026.10.07–10</div>
<h1>Value-up 디자인터칭데이 — 홍보물 이미지 제작 과정</h1>
<p class="lead">경기도 중소기업을 대상으로 한 디자인터칭데이 홍보물을 만든 과정입니다. 불꽃 키 비주얼을 정하고(10/7–10), 포스터 타이포그래피와 비주얼 콘셉트를 비교한 뒤, 업종별 캐러셀 3종을 만들었습니다(10/10). 각 단계에서 고른 것과 버린 시안을 함께 보여줍니다.</p>
<div class="notice">모든 이미지는 AI로 만든 콘셉트 시안입니다. 실제 참여기업 사례나 학교 실적, 행사장 사진이 아닙니다. 행사 일시·장소·신청 정보는 최종 확정 전 원고입니다. 공개용 JPEG 축소본.</div>
<div class="toc"><a href="#key">1. 키 비주얼</a><a href="#concept">2. 비주얼 콘셉트</a><a href="#poster">3. 포스터</a><a href="#carousel">4. 캐러셀</a><a href="../valueup-infographics/index.html">← 9월 Value-up 인포그래픽</a></div>

<h2 id="key">1. 키 비주얼 — 성냥과 불꽃</h2>
<p class="lead">가로 커버에서 출발해(v0.1–0.4) 매체별 비율로 재구성했고, 세로 9:16에서 여섯 번 고쳐 v0.7을 확정했습니다. v0.7은 큰 불꽃의 스포크를 늘리고 과한 밝기를 누르며 구리·호박·금빛으로 색을 나눴습니다. 왼쪽 절반은 타이틀 여백입니다.</p>
<h3>가로 커버 v0.1–0.4 (10/7)</h3>${gal(cover, true)}
<h3>매체별 비율 파생 (10/7)</h3>${gal(ratios)}
<h3>세로 9:16 v0.2 → v0.7 확정 (10/10)</h3>${gal(story)}

<h2 id="concept">2. 비주얼 콘셉트 — 불꽃에서 디자인 역량으로</h2>
<p class="lead">불꽃 이미지는 보존하고, 제품·커뮤니케이션·공간을 잇는 디자인 역량을 보여줄 새 방향을 검토했습니다. v1은 3안(하나의 원리·통찰에서 형태로·협업 공간), v2는 비즈니스 성장 관점을 보완한 세로 2안입니다.</p>
${gal(c1)}${gal(c2)}

<h2 id="poster">3. 포스터 — 스위스 타이포그래피</h2>
<p class="lead">Pretendard SemiBold, 이탤릭 없이 흰색·회색 체계로 위계를 세웠습니다. v1 3안 뒤 v2에서 정보 그리드와 이미지 비중을 A–E 다섯 계열로 바꿔 가며 비교했습니다.</p>
<h3>v1 3안</h3>${gal(p1)}
${p2.join('\n')}

<h2 id="carousel">4. 캐러셀 — 고민별 3종</h2>
<p class="lead">업종 자격이 아니라 기업의 고민별 이야기로 나눴습니다. 커버 3종(v1) 뒤, v2에서 세트당 6장으로 줄이고 AI 생성 시안 위에 로고·기준선·본문을 다시 조판한 편집본을 만들었습니다.</p>
<h3>커버 3종 v1</h3>${gal(k1)}
${k2.join('\n')}`;
  writeFileSync(join(OUT, 'index.html'), page('디자인터칭데이 홍보물 제작 과정', 'build-octweek-portfolios.mjs', body));
  console.log('valueup-touchingday: done');
}

buildDataviz();
buildTouchingDay();
