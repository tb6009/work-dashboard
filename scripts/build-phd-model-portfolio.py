#!/usr/bin/env python3
"""
build-phd-model-portfolio.py
0500 연구가이드 — 「00_연구모델 정리」 폴더를 workDashboard 공개본으로 만든다.

- 각 문서 시리즈(파일명 끝 _vX.Y)에서 최신 버전을 골라 상단에, 이전 버전은 아카이브로
- .md → HTML 변환 (표·코드·mermaid), 원본 .html은 그대로 복사하되 선행연구 PDF 링크는 일반 텍스트로
- PDF 원문(저작권)·.docx·.pages·.numbers·스크립트는 공개하지 않는다
- 허브: public/phd-research-model/index.html

실행: python3 scripts/build-phd-model-portfolio.py
"""
import html
import re
import shutil
from datetime import datetime
from pathlib import Path

import markdown

SRC = Path('/Users/jinhyunpark/Documents/cloude_Code/05_phD_Research/00_연구가이드/글쓰기/00_연구모델 정리')
DEST = Path(__file__).resolve().parent.parent / 'app/public/phd-research-model'

FORMS = {
    'ko_view': 'https://forms.gle/Q4ipz4b7sfZNQ3389',
    'en_view': 'https://forms.gle/hX9dTrbGmHEbNF7t5',
    'ko_edit': 'https://docs.google.com/forms/d/1tW9U3ITL9q6wtN9CZzcoKysQVnwiK-2tulUHsX8cs2w/edit',
    'en_edit': 'https://docs.google.com/forms/d/1noo3b2gQ16l1QFmml_wnBQL0AaQEOZsf44oSwg6-xJ0/edit',
}

# 공개 대상 하위 폴더 (SRC 기준). 루트는 항상 포함
SUBDIRS = ['', '질문 검토', '질문 검토/최종 설문', '질문 검토/최종설문', '질문 검토/챕터']
MODEL_SRC = '질문 검토/최종설문/04_연구1·2_핵심모형·보조변수_설명.html'
MODEL_OUT = '연구모델_04_연구1·2_핵심모형·보조변수_설명.html'
TEXT_EXT = {'.md', '.html'}
DOWNLOAD_EXT = {'.xlsx'}
VER_RE = re.compile(r'_v(\d+(?:\.\d+)*)$')

CSS = """
:root{--bg:#fff;--fg:#111;--muted:#666;--line:#ddd;--soft:#f5f5f3;--accent:#000}
@media (prefers-color-scheme:dark){:root{--bg:#111;--fg:#eee;--muted:#999;--line:#333;--soft:#1b1b1b;--accent:#fff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 -apple-system,'Pretendard','Apple SD Gothic Neo',sans-serif}
.wrap{max-width:980px;margin:0 auto;padding:32px 16px 80px}
a{color:inherit}
h1{font-size:28px;line-height:1.3;margin:8px 0 6px}
h2{font-size:20px;margin:44px 0 12px;padding-top:12px;border-top:2px solid var(--accent)}
h3{font-size:16px;margin:28px 0 8px}
.eyebrow{font-size:12px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
.muted{color:var(--muted)}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{background:var(--soft);font-weight:600}
pre,code{font-family:ui-monospace,Menlo,monospace;font-size:13px}
pre{background:var(--soft);padding:12px;overflow-x:auto;border:1px solid var(--line)}
blockquote{margin:12px 0;padding:4px 14px;border-left:3px solid var(--accent);color:var(--muted)}
img{max-width:100%;height:auto;border:1px solid var(--line)}
.forms{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:18px 0 6px}
.forms a{display:block;border:1px solid var(--accent);padding:10px 12px;text-decoration:none}
.forms a b{display:block}
.forms a.primary{background:var(--accent);color:var(--bg)}
.forms a span{font-size:12px;opacity:.75}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.card{border:1px solid var(--line);padding:14px}
.files td:first-child{white-space:nowrap}
.tag{display:inline-block;font-size:11px;border:1px solid var(--line);padding:0 6px;margin-left:4px}
.back{font-size:13px;margin-bottom:18px;display:inline-block}
.dead{border-bottom:1px dotted var(--muted)}
details{margin:8px 0}
"""

PAGE = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>{css}</style></head><body><div class="wrap">
{body}
</div>{tail}</body></html>"""

MERMAID = """<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({startOnLoad:true,theme:window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'neutral'});
</script>"""


def slug(rel: Path) -> str:
    """출력 파일명: 폴더 구분은 __, URL에 곤란한 문자는 제거"""
    s = '__'.join(rel.with_suffix('').parts)
    s = s.replace('**', '').replace(' ', '_').replace('—', '-')
    s = re.sub(r'_+', '_', s).strip('_')
    return s + '.html'


def split_ver(stem: str):
    m = VER_RE.search(stem)
    if not m:
        return stem, (0,)
    return stem[: m.start()], tuple(int(x) for x in m.group(1).split('.'))


def collect():
    files = []
    for sub in SUBDIRS:
        d = SRC / sub
        for p in sorted(d.iterdir()):
            if p.is_file() and p.suffix in TEXT_EXT | DOWNLOAD_EXT and not p.name.startswith('.'):
                files.append(p)
    # 시리즈 그룹: (폴더, 버전 뺀 stem, 확장자 계열)
    groups = {}
    for p in files:
        base, ver = split_ver(p.stem)
        key = (str(p.parent.relative_to(SRC)), base, p.suffix)
        groups.setdefault(key, []).append((ver, p))
    latest, older = [], []
    for key, items in groups.items():
        items.sort(key=lambda x: (x[0], x[1].stat().st_mtime))
        latest.append(items[-1][1])
        older += [p for _, p in items[:-1]]
    return latest, older


def strip_pdf_links(text: str) -> str:
    # 선행연구 PDF 원문은 공개하지 않으므로 링크를 일반 텍스트로
    return re.sub(
        r'<a\s[^>]*href="[^"]*\.pdf(?:#[^"]*)?"[^>]*>(.*?)</a>',
        r'<span class="dead" title="원문 PDF는 비공개">\1</span>',
        text,
        flags=re.S,
    )


def rewrite_local_links(text: str, mapping: dict, src_dir: Path) -> str:
    def repl(m):
        href = m.group(1)
        if re.match(r'^(https?:|#|mailto:|data:)', href):
            return m.group(0)
        target = (src_dir / href.split('#')[0]).resolve()
        if target in mapping:
            frag = '#' + href.split('#')[1] if '#' in href else ''
            return f'href="{mapping[target]}{frag}"'
        return m.group(0)
    return re.sub(r'href="([^"]+)"', repl, text)


def fix_paths(text: str) -> str:
    # 챕터 문서는 한 단계 아래 폴더 기준 → 공개본은 평평한 구조
    text = text.replace('../docs/assets/', 'docs/assets/')
    # 공개하지 않는 상위 폴더(선행연구 등) 링크는 일반 텍스트로
    return re.sub(r'<a\s[^>]*href="\.\./[^"]*"[^>]*>(.*?)</a>',
                  r'<span class="dead" title="비공개 원문 폴더">\1</span>', text, flags=re.S)


def md_to_html(src: Path, mapping: dict) -> str:
    raw = src.read_text(encoding='utf-8')
    # mermaid 블록을 그대로 보존
    blocks = []
    def keep(m):
        blocks.append(m.group(1))
        return f'\n\nMERMAIDBLOCK{len(blocks) - 1}\n\n'
    raw = re.sub(r'```mermaid\n(.*?)```', keep, raw, flags=re.S)
    body = markdown.markdown(raw, extensions=['tables', 'fenced_code', 'sane_lists'])
    for i, b in enumerate(blocks):
        body = body.replace(f'<p>MERMAIDBLOCK{i}</p>', f'<pre class="mermaid">{html.escape(b)}</pre>')
    body = strip_pdf_links(body)
    # md 내 상대 이미지 경로: images/ 는 공개본에서도 같은 위치
    body = fix_paths(rewrite_local_links(body, mapping, src.parent))
    title = re.search(r'<h1>(.*?)</h1>', body)
    title = re.sub('<[^>]+>', '', title.group(1)) if title else src.stem
    rel = src.relative_to(SRC)
    head = (f'<a class="back" href="index.html">← 연구모델 정리 허브</a>'
            f'<div class="eyebrow">원본: {html.escape(str(rel))} · '
            f'{datetime.fromtimestamp(src.stat().st_mtime):%Y-%m-%d %H:%M}</div>')
    return PAGE.format(title=html.escape(title), css=CSS, body=head + body,
                       tail=MERMAID if blocks else '')


def build():
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)
    shutil.copytree(SRC / 'images', DEST / 'images', ignore=shutil.ignore_patterns('.DS_Store'))
    shutil.copytree(SRC / '질문 검토/docs', DEST / 'docs', ignore=shutil.ignore_patterns('.DS_Store'))
    shutil.copytree(SRC / '질문 검토/원문텍스트', DEST / '원문텍스트', ignore=shutil.ignore_patterns('.DS_Store'))

    latest, older = collect()
    extra = [SRC / '질문 검토/README.md']
    allfiles = sorted(set(latest + older + extra))
    mapping = {}
    for p in allfiles:
        rel = p.relative_to(SRC)
        mapping[p.resolve()] = slug(rel) if p.suffix in TEXT_EXT else 'files/' + p.name
    # 질문 검토 안의 docs/assets 는 루트 docs/ 로 옮겼으므로 경로를 맞춘다
    for p in allfiles:
        out = mapping[p.resolve()]
        if p.suffix == '.md':
            (DEST / out).write_text(md_to_html(p, mapping), encoding='utf-8')
        elif p.suffix == '.html':
            t = p.read_text(encoding='utf-8')
            t = strip_pdf_links(t)
            t = fix_paths(rewrite_local_links(t, mapping, p.parent))
            if '<body' in t:
                t = re.sub(r'(<body[^>]*>)', r'\1<a href="index.html" style="position:fixed;right:12px;bottom:12px;z-index:99;background:#000;color:#fff;padding:6px 10px;font:13px sans-serif;text-decoration:none">← 허브</a>', t, count=1)
            (DEST / out).write_text(t, encoding='utf-8')
        else:
            (DEST / 'files').mkdir(exist_ok=True)
            shutil.copy2(p, DEST / out)

    # 최종 연구모델 설명 (질문 검토/최종설문/04) — 허브 상단 「연구모델」 섹션에서 링크
    t = (SRC / MODEL_SRC).read_text(encoding='utf-8')
    t = strip_pdf_links(t)
    t = re.sub(r'(<body[^>]*>)', r'\1<a href="index.html" style="position:fixed;right:12px;bottom:12px;z-index:99;background:#000;color:#fff;padding:6px 10px;font:13px sans-serif;text-decoration:none">← 허브</a>', t, count=1)
    (DEST / MODEL_OUT).write_text(t, encoding='utf-8')
    shutil.copy2(SRC / '질문 검토/최종설문/package.css', DEST / 'package.css')

    (DEST / 'index.html').write_text(hub(latest, older, mapping), encoding='utf-8')
    print(f'latest {len(latest)} · older {len(older)} → {DEST}')


# ── 허브 ──
def link(mapping, rel, label=None):
    p = (SRC / rel).resolve()
    return f'<a href="{mapping[p]}">{html.escape(label or Path(rel).name)}</a>'


def file_rows(paths, mapping):
    rows = []
    for p in sorted(paths, key=lambda x: x.stat().st_mtime, reverse=True):
        rel = p.relative_to(SRC)
        _, ver = split_ver(p.stem)
        v = 'v' + '.'.join(map(str, ver)) if ver != (0,) else '—'
        folder = str(rel.parent) if str(rel.parent) != '.' else '·'
        kind = {'.md': '문서', '.html': 'HTML', '.xlsx': '엑셀'}[p.suffix]
        rows.append(
            f'<tr><td>{datetime.fromtimestamp(p.stat().st_mtime):%m-%d %H:%M}</td>'
            f'<td><a href="{mapping[p.resolve()]}">{html.escape(p.stem)}</a></td>'
            f'<td>{v}</td><td>{kind}</td><td class="muted">{html.escape(folder)}</td></tr>')
    return ('<table class="files"><tr><th>수정</th><th>파일</th><th>버전</th><th>형식</th><th>폴더</th></tr>'
            + ''.join(rows) + '</table>')


def hub(latest, older, m):
    L = lambda rel, label=None: link(m, rel, label)
    F = FORMS
    body = f"""
<div class="eyebrow">0500 연구가이드 · 박사 연구모델 작업 기록 · 2026-09-20 → 2026-10-06</div>
<h1>디자이너의 생성형 AI 사용과 일의 수행·역량 개발 행동</h1>
<p class="muted">한 번의 설문, 두 개의 연구. 연구 1은 일을 바꾸는 행동과 업무상 결과·보상, 연구 2는 직업 위협과 역량 개발 행동. PLS-SEM · 일회 횡단 설문 · 유급 디자인 업무 종사자(직원·프리랜서).</p>
<h2>연구모델 (최종 설계 합의안 v1.0 · 2026-10-05)</h2>
<div class="card"><b>연구 1·2 핵심모형·보조변수 설명</b><br><a href="{MODEL_OUT}">{MODEL_OUT.removeprefix('연구모델_')}</a><br>
<span class="muted">연구 1: USE → TC → TP·JE·WI (결과 3개 병렬). GAIL은 USE→TC, EXP는 TC→세 결과를 조절.<br>
연구 2: THR → USE → SC + THR → SC 직접경로. GAIL은 첫 단계, EXP는 둘째 단계를 조절.<br>
통합 설문 69문항 · 일회 자기보고. 본조사 검증·배포 전 — 연구자 개발 JE와 바뀐 응답척도·기간은 채택 전 검증 필요.</span></div>

<div class="forms">
  <a class="primary" href="{F['ko_view']}" target="_blank" rel="noopener"><b>설문 참여 · 국문</b><span>Google Forms 응답 링크</span></a>
  <a class="primary" href="{F['en_view']}" target="_blank" rel="noopener"><b>Survey · English</b><span>Google Forms response link</span></a>
  <a href="{F['ko_edit']}" target="_blank" rel="noopener"><b>국문 작업파일</b><span>편집 화면 · 권한 필요</span></a>
  <a href="{F['en_edit']}" target="_blank" rel="noopener"><b>영문 작업파일</b><span>편집 화면 · 권한 필요</span></a>
</div>
<p class="muted" style="font-size:13px">현행 설문 v0.93 (2026-10-05, 15개 섹션 · 69개 문항 코드). 본조사 배포본 아님 — 동의문 필수정보·IRB 확정 전. 편집 화면의 게시 상태(Published)는 재확인 필요.</p>

<h2>1. 바로 보기</h2>
<div class="grid2">
 <div class="card"><b>최종 연구모델 (v1.0)</b><br><a href="{MODEL_OUT}">핵심모형·보조변수 설명</a><br>{L('26_연구1·2_최종연구모델_보고서_v1.0.html', '최종 연구모델 보고서 v1.0')}</div>
 <div class="card"><b>최종설문 v0.93</b><br>{L('질문 검토/최종설문/00_시작.html', '패키지 시작 화면')} · {L('질문 검토/최종설문/01_최종설문_v0.93.html', '설문 정리본')}<br>{L('질문 검토/최종설문/02_문항별_영한대조·핵심근거.html', '문항별 영한대조·핵심근거')} · {L('질문 검토/최종설문/03_설문_검토보고서.html', '설문 검토보고서')}</div>
 <div class="card"><b>모형이 바뀐 이유</b><br>{L('20_연구모형_변화이유_정리_v0.1.md', '연구모형 변화 이유 정리 v0.1')} · {L('21_연구모형_변경계기·현재모형_TV·SV_운용방침_v0.1.md', '변경 계기·TV·SV 운용방침')}<br>{L('23_연구1_TC_이득과비용_모형설명_v0.1.md', 'TC 이득과 비용')} · {L('25_연구1_권장모형·설문재구성안_v0.3.html', '권장모형·설문재구성안 v0.3')}</div>
 <div class="card"><b>이전 단계 (참고)</b><br>{L('11_연구1·2_통합모형·연구질문_v0.1.html', '통합모형 v0.4 (10-03)')}<br>{L('질문 검토/00_설문원문_영한대조_검토자료집_v0.5.html', '원문·영한 대조 검토자료집 v0.5')}</div>
</div>

<h2>2. 연구모형 (현재)</h2>
<p><b>핵심질문</b> — 생성형 AI를 사용하는 디자이너가 업무의 과업과 역량을 어떻게 재구성하며, 그 과정에서 생산성 기여·업무범위 확대·업무강도 증가가 어떤 조합으로 나타나는가?</p>
<div class="grid2">
 <div class="card"><b>연구 1 · AI 사용, 과업 재구성, 업무 결과</b><br>USE → TC → TP·JE·WI<br>GAIL: USE→TC 조절 · EXP: TC→TP, TC→JE, TC→WI 각각 조절<br><span class="muted">세 결과는 합치지 않는다. USE 직접경로·조절변수 주효과는 분석식에 포함.</span></div>
 <div class="card"><b>연구 2 · 대체 위협, AI 사용, 역량 개발 행동</b><br>THR → USE → SC + THR → SC 직접경로<br>GAIL: THR→USE 조절 · EXP: USE→SC 조절<br><span class="muted">SC는 역량 개발 행동이며 실제 실력 향상과 다르다.</span></div>
</div>
<p class="muted" style="font-size:13px">경로도는 <a href="{MODEL_OUT}">핵심모형·보조변수 설명</a> 참조. 화살표는 이론적 방향이며, 횡단 자기보고만으로 인과를 입증하지 않는다.</p>

<h3>연구질문</h3>
<table>
<tr><th>RQ</th><th>질문</th></tr>
<tr><td>1-1</td><td>USE와 TC는 어떻게 관련되며 GAIL에 따라 달라지는가?</td></tr>
<tr><td>1-2</td><td>TC는 TP·JE·WI와 각각 어떻게 관련되며 EXP에 따라 달라지는가?</td></tr>
<tr><td>1-3</td><td>USE와 결과의 직접 관련성과 TC를 통한 조건부 간접 관련성은 어떻게 나타나는가?</td></tr>
<tr><td>1-4</td><td>TP·JE·WI·INC_AI는 어떤 조합으로 나타나는가?</td></tr>
<tr><td>2-1</td><td>THR은 USE 및 SC와 어떻게 관련되는가?</td></tr>
<tr><td>2-2</td><td>THR→USE는 GAIL에 따라 달라지는가?</td></tr>
<tr><td>2-3</td><td>USE→SC는 EXP에 따라 달라지는가?</td></tr>
<tr><td>2-4</td><td>THR과 SC의 직접 관련성과 조건부 간접 관련성은 어떻게 나타나는가?</td></tr>
</table>

<h2>3. 변수 × 측정 × 출처 (설문 v0.93)</h2>
<table>
<tr><th>변수</th><th>측정 내용</th><th>연구1</th><th>연구2</th><th>문항</th><th>출처</th></tr>
<tr><td>USE</td><td>업무상 생성형 AI 사용</td><td>독립</td><td>매개</td><td>4</td><td>Zhang·Yu·Ma</td></tr>
<tr><td>TC</td><td>촉진적 과업 크래프팅 (지난 1주)</td><td>매개</td><td>—</td><td>4</td><td>Bindl et al., 2019</td></tr>
<tr><td>TP</td><td>AI의 지각된 생산성 기여</td><td>결과</td><td>—</td><td>3</td><td>Torkzadeh &amp; Doll, 1999</td></tr>
<tr><td>JE</td><td>담당 과업·범위 확대 (회고)</td><td>결과</td><td>—</td><td>4</td><td>연구자 개발 후보</td></tr>
<tr><td>WI</td><td>업무강도 증가 (회고)</td><td>결과</td><td>—</td><td>5</td><td>Kubicek et al., 2015</td></tr>
<tr><td>SC</td><td>스킬 크래프팅 (개발 행동)</td><td>—</td><td>결과</td><td>4</td><td>Bindl et al., 2019</td></tr>
<tr><td>THR</td><td>AI 직업대체 위협·걱정</td><td>—</td><td>독립</td><td>4</td><td>Brougham &amp; Haar, 2018 번안</td></tr>
<tr><td>GAIL</td><td>생성형 AI 리터러시</td><td>USE→TC 조절</td><td>THR→USE 조절</td><td>17</td><td>Liu·Zhang·Wei, 2025</td></tr>
<tr><td>EXP</td><td>자기평가 직업 전문성</td><td>TC→세 결과 조절</td><td>USE→SC 조절</td><td>5</td><td>Van der Heijden et al., 2018</td></tr>
</table>
<p class="muted" style="font-size:13px">보조 항목(핵심모형 제외): 참여·선별(CONSENT·S1·S2), 기준업무(REF), 회고 비교(PRE_AI·COMPARE), WORK_WEEK, JE_DIR, 활동별 사용 ACT1–4(USE와 합산 금지), 지각된 소득 영향 INC_AI, 배경 BG, FEEDBACK. 전체 69개 코드는 최종설문 폴더의 05_문항코드북.tsv.</p>

<h2>4. 모형이 바뀐 이유 (요약)</h2>
<table>
<tr><th>이전</th><th>현재 (v1.0, 10-05)</th><th>이유</th></tr>
<tr><td>논문 3편 (09-20)</td><td>설문 1회 · 연구 2개</td><td>지도교수 3회차 면담 "변수가 많다 · 설문 먼저". 팀 수준 변수는 프리랜서와 충돌</td></tr>
<tr><td>연구 1 결과: IWB·TP (10-03)</td><td>TP·JE·WI 세 병렬 결과</td><td>과업 확장이 생산성·업무범위·부담에 서로 다른 결과를 낼 수 있음. 세 결과를 '좋은 결과' 하나로 합치지 않음</td></tr>
<tr><td>REW_AI 보상 결과</td><td>INC_AI 보조 결과 (범주형)</td><td>핵심 잠재척도에서 제외, 조합 기술용</td></tr>
<tr><td>TV·SV 비교 후보</td><td>핵심모형 밖</td><td>운용방침은 21번 문서</td></tr>
<tr><td>AAX(불안)</td><td>THR(위협·걱정)</td><td>원문 STARA 문항에 worried 포함 → 명칭에 반영</td></tr>
</table>
<p>전체 정리: {L('20_연구모형_변화이유_정리_v0.1.md', '연구모형 변화 이유 정리 v0.1 →')}</p>

<h2>5. 작업 흐름</h2>
<table>
<tr><th>날짜</th><th>단계</th><th>문서</th></tr>
<tr><td>09-20</td><td>3편 경로모형 초안</td><td>{L('AI크래프팅_경로모형.html', 'AI크래프팅 경로모형')} · {L('AI크래프팅_연구모형_질문지·정합성검토_v0.1.md', '질문지·정합성 검토')}</td></tr>
<tr><td>10-03</td><td>근거 수집 → 간결화 → 연구 1·2 구도 → 통합모형 v0.4 · 통합설문지</td><td>{L('04_연구모형_간결화_결정안_v0.1.md', '04')} · {L('07_**_연구1·2_수정모형_EXP조절_v0.1.md', '07')} · {L('11_연구1·2_통합모형·연구질문_v0.1.html', '11')} · {L('12_연구1·2_통합설문지_영한대조_원문근거보완_v0.4.html', '12 설문 v0.4')}</td></tr>
<tr><td>10-04</td><td>인계 · 예비조사 결정안 · TV·SV 추가 · Google Forms v0.8</td><td>{L('18_새세션_인계_20261004.md', '18 인계')} · {L('19_예비조사_항목·적격·동의·앵커_결정안_v0.1.md', '19 결정안')} · {L('질문 검토/최종 설문/00_v0.8_변경사항과_미확정.md', 'v0.8 변경사항')}</td></tr>
<tr><td>10-05</td><td>모형 변경 정리 · JE·WI 반영 · 권장모형 · 최종 연구모델 v1.0 · 최종설문 v0.93</td><td>{L('20_연구모형_변화이유_정리_v0.1.md', '20')} · {L('21_연구모형_변경계기·현재모형_TV·SV_운용방침_v0.1.md', '21')} · {L('24_연구1_JE반영_현재모델_인수인계_v0.2.md', '24')} · {L('25_연구1_권장모형·설문재구성안_v0.3.html', '25')} · {L('26_연구1·2_최종연구모델_보고서_v1.0.html', '26 v1.0')} · <a href="{MODEL_OUT}">최종설문 04</a></td></tr>
</table>

<h2>6. 연구 중간작업 — 최신 파일 ({len(latest)})</h2>
<p class="muted">파일명 끝 버전이 가장 높은 것만. 같은 시리즈의 이전 버전은 아래 아카이브.</p>
{file_rows(latest, m)}

<details><summary><b>이전 버전 아카이브 ({len(older)})</b></summary>
{file_rows(older, m)}
</details>

<p class="muted" style="margin-top:40px;font-size:12px">선행연구 PDF 원문과 .docx·.pages·.numbers 파일은 공개하지 않는다. 문서 안의 PDF 링크는 점선 텍스트로 표시. 원문 확인은 설문의 최종 타당화나 배포 승인을 뜻하지 않는다. 빌드: scripts/build-phd-model-portfolio.py · {datetime.now():%Y-%m-%d %H:%M}</p>
"""
    return PAGE.format(title='박사 연구모델 정리', css=CSS, body=body, tail='')


if __name__ == '__main__':
    build()
