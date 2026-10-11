#!/usr/bin/env node
// Build the research document and its local dependencies as one portable package.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { marked } = require(process.env.PHD_MARKED_PATH || '/Users/jinhyunpark/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/marked');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(project, '../../05_phD_Research/00_연구가이드/글쓰기/00_연구모델 정리');
const main = path.join(root, '질문 검토/최종설문/04_연구1·2_핵심모형·보조변수_설명.html');
const out = path.join(project, 'app/public/phd-research-model/linked-package');
const allowed = new Set(['.html', '.md', '.css', '.tsv', '.png', '.jpg', '.jpeg', '.svg', '.webp']);
const visited = new Set(), unavailable = [], external = new Set();
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const outputPath = p => path.join(out, path.relative(root, p).replace(/\.md$/, '.md.html'));
const shell = body => `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>연구 문서</title><style>body{max-width:1100px;margin:40px auto;padding:0 24px;font:16px/1.7 sans-serif;color:#203241}table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid #ccd6df;padding:8px}img{max-width:100%}pre{white-space:pre-wrap}a{color:#216886}</style><body>${body}</body></html>`;

function resolveLink(href, source) {
  if (/^(https?:|mailto:|data:|javascript:|#)/i.test(href)) {
    if (/^https?:/i.test(href)) external.add(href);
    return { keep: true };
  }
  const [raw, fragment] = href.split('#');
  let decoded;
  try { decoded = decodeURIComponent(raw.split('?')[0]); } catch { decoded = raw; }
  let target = path.resolve(path.dirname(source), decoded);
  // Older reports retained paths relative to the research root after being moved.
  if (!fs.existsSync(target)) {
    const fallback = path.resolve(root, decoded);
    if (fs.existsSync(fallback)) target = fallback;
  }
  if (!target.startsWith(root + path.sep) || !allowed.has(path.extname(target).toLowerCase())) return { private: true };
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    unavailable.push({ source: path.relative(root, source), href });
    return { missing: true };
  }
  visit(target);
  const rel = path.relative(path.dirname(outputPath(source)), outputPath(target)).split(path.sep).map(encodeURIComponent).join('/');
  return { url: rel + (fragment ? '#' + fragment : '') };
}

function visit(source) {
  if (visited.has(source)) return;
  visited.add(source);
  const dest = outputPath(source);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const ext = path.extname(source);
  if (!['.md', '.html', '.css'].includes(ext)) { fs.copyFileSync(source, dest); return; }
  let text = fs.readFileSync(source, 'utf8');
  if (ext === '.md') text = shell(marked.parse(text));
  text = text.replace(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi, (whole, before, href, after, label) => {
    const result = resolveLink(href.replaceAll('&amp;', '&'), source);
    if (result.keep) return whole;
    if (result.url) return `<a ${before}href="${escape(result.url)}"${after}>${label}</a>`;
    return `<span title="${result.private ? '공개 패키지 제외: 원문 또는 지원하지 않는 파일' : '연결 대상 파일 미확보'}">${label} <small>(${result.private ? '비공개 원문' : '자료 미확보'})</small></span>`;
  });
  text = text.replace(/\b(src|href)=["']([^"']+)["']/gi, (whole, attr, href) => {
    // Anchors already mapped; only resolve unprocessed assets here.
    if (attr === 'href' && !/\.css(?:[?#]|$)/i.test(href)) return whole;
    const result = resolveLink(href, source);
    return result.url ? `${attr}="${escape(result.url)}"` : whole;
  });
  fs.writeFileSync(dest, text);
}

visit(main);
const entry = path.relative(out, outputPath(main)).split(path.sep).map(encodeURIComponent).join('/');
fs.writeFileSync(path.join(out, 'index.html'), shell(`<h1>디자이너의 생성형 AI 사용과 업무 변화·역량 개발</h1><p>문서 연결 패키지 · 2026-10-11. 연구모형과 설문 내용의 버전은 원문 표기를 유지합니다.</p><p><a href="${entry}">최신 연구 문서와 연결 자료 열기</a></p><p>이 폴더 전체를 함께 배포해야 합니다. Google 설문은 외부 서비스이며 편집본은 접근 권한이 필요합니다. 선행논문 PDF 원문은 공개 패키지에서 제외했습니다.</p>`));
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ entry, files: [...visited].map(p => path.relative(out, outputPath(p))), unavailable, external: [...external], externalStatus: '주소 보존; 로그인·접속 상태 미검증' }, null, 2));

// Keep the existing dashboard entry URL while serving the same fully linked report.
const alias = path.join(project, 'app/public/phd-research-model/연구모델_04_연구1·2_핵심모형·보조변수_설명.html');
const base = 'linked-package/' + path.dirname(entry) + '/';
const report = fs.readFileSync(outputPath(main), 'utf8').replace('<head>', `<head>\n<base href="${base}">`);
fs.writeFileSync(alias, report);
// Refresh current-document aliases; preserve explicitly versioned historical surveys.
for (const source of visited) {
  if (path.dirname(source) !== path.dirname(main) || !['.html', '.md'].includes(path.extname(source))) continue;
  if (/v0\.93/.test(source)) continue;
  const name = '질문_검토_최종설문_' + path.basename(source).replace(/\.md$/, '.html');
  // HTML is the canonical presentation when both formats share a filename.
  if (source.endsWith('.md') && fs.existsSync(source.replace(/\.md$/, '.html'))) continue;
  const relative = path.relative(out, outputPath(source)).split(path.sep).map(encodeURIComponent).join('/');
  const html = fs.readFileSync(outputPath(source), 'utf8');
  const baseTag = `<base href="linked-package/${path.dirname(relative)}/">`;
  const mirrored = html.includes('<head>') ? html.replace('<head>', '<head>\n' + baseTag) : html.replace('<meta charset=', baseTag + '<meta charset=');
  fs.writeFileSync(path.join(project, 'app/public/phd-research-model', name), mirrored);
}
console.log(JSON.stringify({ files: visited.size, unavailable, output: out }, null, 2));
