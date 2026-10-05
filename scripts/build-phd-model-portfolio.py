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
SUBDIRS = ['', '질문 검토', '질문 검토/최종 설문', '질문 검토/챕터']
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
<div class="eyebrow">0500 연구가이드 · 박사 연구모델 작업 기록 · 2026-09-20 → 2026-10-04</div>
<h1>디자이너의 생성형 AI 사용과 일의 수행·역량 개발 행동</h1>
<p class="muted">한 번의 설문, 두 개의 연구. 연구 1은 일을 바꾸는 행동과 업무상 결과·보상, 연구 2는 직업 위협과 역량 개발 행동. PLS-SEM · 일회 횡단 설문 · 유급 디자인 업무 종사자(직원·프리랜서).</p>
<div class="forms">
  <a class="primary" href="{F['ko_view']}" target="_blank" rel="noopener"><b>설문 참여 · 국문</b><span>Google Forms 응답 링크</span></a>
  <a class="primary" href="{F['en_view']}" target="_blank" rel="noopener"><b>Survey · English</b><span>Google Forms response link</span></a>
  <a href="{F['ko_edit']}" target="_blank" rel="noopener"><b>국문 작업파일</b><span>편집 화면 · 권한 필요</span></a>
  <a href="{F['en_edit']}" target="_blank" rel="noopener"><b>영문 작업파일</b><span>편집 화면 · 권한 필요</span></a>
</div>
<p class="muted" style="font-size:13px">현행 설문 v0.8 초안 (2026-10-04). 본조사 배포본 아님 — 동의문 필수정보·경력 기준·IRB 확정 전.</p>

<h2>1. 바로 보기</h2>
<div class="grid2">
 <div class="card"><b>연구모형 (현재 v0.4)</b><br>{L('11_연구1·2_통합모형·연구질문_v0.1.html', '통합모형·연구질문')}<br><span class="muted">파일명 v0.1, 내용 v0.4</span></div>
 <div class="card"><b>모형이 바뀐 이유</b><br>{L('20_연구모형_변화이유_정리_v0.1.md', '연구모형 변화 이유 정리 v0.1')}<br><span class="muted">09-20 3편 구조 → 10-03 연구 2개</span></div>
 <div class="card"><b>최종 설문 v0.8</b><br>{L('질문 검토/최종 설문/01_국문_설문지_v0.8.md', '국문 설문지')} · {L('질문 검토/최종 설문/02_영문_설문지_v0.8.md', '영문 설문지')}<br>{L('질문 검토/최종 설문/00_v0.8_변경사항과_미확정.md', 'v0.8 변경사항과 미확정')} · {L('질문 검토/최종 설문/03_확인된_질문지_영한대조_v0.8.xlsx', '영한대조 엑셀')}</div>
 <div class="card"><b>설문 원문 검토</b><br>{L('질문 검토/00_설문원문_영한대조_검토자료집_v0.5.html', '원문·영한 대조 검토자료집 v0.5')}<br>{L('12_연구1·2_통합설문지_영한대조_원문근거보완_v0.4.html', '통합설문지 영한대조 v0.4')}</div>
</div>

<h2>2. 연구모형 (현재)</h2>
<div class="grid2">
 <div><img src="images/04_연구1_EXP조절.png" alt="연구1 경로도"><p><b>연구 1 · 일의 수행</b><br>USE → TC → IWB·TP → 보상(REW_AI)<br>GAIL: USE→TC 조절 · EXP: TC→IWB·TP 조절</p></div>
 <div><img src="images/05_연구2_GAIL조절.png" alt="연구2 경로도"><p><b>연구 2 · 역량 개발 행동</b><br>THR → USE → SC + THR → SC 직접경로<br>GAIL: THR→USE 조절 · EXP: USE→SC 조절</p></div>
</div>
<p class="muted" style="font-size:13px">그림은 10-03 07안 기준 이미지. 연구2 EXP 조절·THR→SC 직접경로는 11 통합모형 v0.4에서 추가됨 — 최신 그림은 통합모형 HTML 참조.</p>

<h3>연구질문</h3>
<table>
<tr><th>RQ</th><th>질문</th></tr>
<tr><td>1-1</td><td>업무상 생성형 AI 사용 수준은 촉진적 과업 크래프팅과 어떤 관련이 있으며, GAIL에 따라 달라지는가?</td></tr>
<tr><td>1-2</td><td>AI 사용과 IWB·TP의 관련성에서 TC를 통한 간접효과가 나타나며, 그 크기는 GAIL·EXP 수준에 따라 달라지는가?</td></tr>
<tr><td>1-3</td><td>TC와 두 업무상 결과의 관련성은 업무 숙련도에 따라 달라지는가?</td></tr>
<tr><td>1-4</td><td>IWB·TP는 경제적 보상 변화와 어떤 관련이 있는가? (증가·무영향·감소 모두 열어 둠)</td></tr>
<tr><td>2-1</td><td>직업대체 위협·걱정은 업무상 AI 사용 수준과 어떤 관련이 있는가?</td></tr>
<tr><td>2-2</td><td>위협·걱정은 AI 사용을 통한 간접효과와 별개로 SC와 직접 관련되는가?</td></tr>
<tr><td>2-3</td><td>위협·걱정과 AI 사용의 관련성은 GAIL에 따라 달라지는가?</td></tr>
<tr><td>2-4</td><td>AI 사용과 SC의 관련성은 EXP에 따라 달라지는가?</td></tr>
</table>

<h2>3. 연구모형 × 설문 × 구글 링크</h2>
<table>
<tr><th>변수</th><th>측정 내용</th><th>연구1</th><th>연구2</th><th>문항</th><th>출처</th><th>설문 위치</th></tr>
<tr><td>USE</td><td>업무상 AI 사용 (아이디어·질문·지식·문제해결)</td><td>독립</td><td>매개</td><td>4</td><td>Zhang, Yu &amp; Ma</td><td>{L('질문 검토/챕터/02_업무상 AI 사용.md', '02 업무상 AI 사용')}</td></tr>
<tr><td>TC</td><td>촉진적 과업 크래프팅</td><td>매개</td><td>—</td><td>4</td><td>Bindl et al., 2019</td><td>{L('질문 검토/챕터/03_과업 크래프팅.md', '03 과업 크래프팅')}</td></tr>
<tr><td>SC</td><td>스킬 크래프팅 (개발 행동)</td><td>—</td><td>결과</td><td>4</td><td>Bindl et al., 2019</td><td>{L('질문 검토/챕터/04_스킬 크래프팅.md', '04 스킬 크래프팅')}</td></tr>
<tr><td>IWB</td><td>혁신적 업무행동</td><td>결과</td><td>—</td><td>9</td><td>Janssen, 2000</td><td>{L('질문 검토/챕터/05_혁신적 업무행동.md', '05 혁신적 업무행동')}</td></tr>
<tr><td>TP</td><td>AI의 지각된 생산성 기여</td><td>결과</td><td>—</td><td>3</td><td>Torkzadeh &amp; Doll, 1999</td><td>{L('질문 검토/챕터/06_지각된 생산성 기여.md', '06 지각된 생산성 기여')}</td></tr>
<tr><td>EXP</td><td>자기평가 직업 전문성</td><td>TC→IWB·TP 조절</td><td>USE→SC 조절</td><td>5</td><td>Van der Heijden et al., 2018</td><td>{L('질문 검토/챕터/07_자기평가 직업 전문성.md', '07 직업 전문성')}</td></tr>
<tr><td>GAIL</td><td>생성형 AI 리터러시 (5차원)</td><td>USE→TC 조절</td><td>THR→USE 조절</td><td>17</td><td>Liu et al., 2025</td><td>{L('질문 검토/챕터/08_생성형 AI 리터러시.md', '08 생성형 AI 리터러시')}</td></tr>
<tr><td>THR</td><td>AI 직업대체 위협·걱정</td><td>—</td><td>독립</td><td>4</td><td>Brougham &amp; Haar, 2018 번안</td><td>{L('질문 검토/챕터/09_AI 대체 위협·걱정.md', '09 AI 대체 위협·걱정')}</td></tr>
<tr><td>TV·SV</td><td>과업·기술 다양성 (비교 후보)</td><td colspan="2">M1·M2 중간경로 비교용</td><td>4+4</td><td>Morgeson &amp; Humphrey, 2006</td><td>{L('질문 검토/챕터/추가_TV_원문영한대조_v0.5.md', 'TV')} · {L('질문 검토/챕터/추가_SV_원문영한대조_v0.5.md', 'SV')}</td></tr>
<tr><td>ACT</td><td>기획·탐색·제작·수정별 사용 빈도 (4단계)</td><td colspan="2">보조 프로필 · USE와 합산 금지</td><td>4</td><td>연구자 재구성 (Luo 2025 응답형식)</td><td>{L('질문 검토/챕터/10_활동별 사용.md', '10 활동별 사용')}</td></tr>
<tr><td>REW_AI</td><td>AI가 현재 소득에 미친 영향 (증가/무영향/감소)</td><td>보상 결과</td><td>—</td><td>1</td><td>Humlum &amp; Vestergaard, NBER WP33777 Q14a</td><td>{L('질문 검토/챕터/11_생성형 AI의 지각된 소득 영향.md', '11 소득 영향')}</td></tr>
</table>
<p class="muted" style="font-size:13px">핵심 50문항 + TV·SV 8 + ACT 4 + REW_AI 1 + 동의·선별·배경·마무리. 응답: 국문 <a href="{F['ko_view']}">{F['ko_view']}</a> · 영문 <a href="{F['en_view']}">{F['en_view']}</a></p>

<h2>4. 모형이 바뀐 이유 (요약)</h2>
<table>
<tr><th>이전 (09-20)</th><th>현재 (10-03)</th><th>이유</th></tr>
<tr><td>논문 3편</td><td>설문 1회 · 연구 2개</td><td>지도교수 3회차 면담 "변수가 많다 · 설문 먼저". 3편(PSY)은 팀 수준 변수라 프리랜서와 충돌</td></tr>
<tr><td>TV·SV 최종 결과</td><td>IWB·TP 결과, TV·SV는 비교 후보</td><td>WDQ는 변화량이 아닌 현재 수준. TC→TV 직접근거 부족. 실무적 함의 약함</td></tr>
<tr><td>AAX(불안)</td><td>THR(위협·걱정)</td><td>위협 인식과 불안 정서 혼재. 원문 STARA 4문항 중 3문항에 worried 포함 → 명칭에 반영</td></tr>
<tr><td>LOAD → PERF → REW</td><td>제외 / REW_AI 범주형</td><td>AI는 부하를 높이기도 낮추기도 함. ERI 보상척도는 조직근로자용 · 실제 소득과 다른 개념</td></tr>
<tr><td>EXP: 부담 완화 조절</td><td>TC→IWB·TP, USE→SC 조절</td><td>"누가 TC를 많이 하나"가 아니라 "TC의 성과 관련성이 숙련도에 따라 다른가"</td></tr>
<tr><td>CC · PSY</td><td>제외</td><td>AI 특수성 약함 · 방향 불확정 · 팀 수준 문제</td></tr>
</table>
<p>전체 정리: {L('20_연구모형_변화이유_정리_v0.1.md', '연구모형 변화 이유 정리 v0.1 →')}</p>

<h2>5. 작업 흐름</h2>
<table>
<tr><th>날짜</th><th>단계</th><th>문서</th></tr>
<tr><td>09-20</td><td>3편 경로모형 초안</td><td>{L('AI크래프팅_경로모형.html', 'AI크래프팅 경로모형')} · {L('AI크래프팅_연구모형_질문지·정합성검토_v0.1.md', '질문지·정합성 검토')}</td></tr>
<tr><td>10-03 오전</td><td>이론근거·인지부하 근거 수집 → 간결화 · 두 축 검토</td><td>{L('01_1편_이론배경·실증근거_수집_v0.1.md', '01')} · {L('02_신규PDF_연구모델_근거점검_v0.1.md', '02')} · {L('03_AI사용과_인지부하_근거수집_v0.1.md', '03')} · {L('04_연구모형_간결화_결정안_v0.1.md', '04')} · {L('05_두축_최소모형_검토안_v0.1.md', '05')}</td></tr>
<tr><td>10-03 낮</td><td>원문기반 연구 1·2 구도 → EXP 조절 수정모형 → 변수별 설문</td><td>{L('06_연구1·2_원문기반_모형·변수·연구질문_v0.1.md', '06')} · {L('07_**_연구1·2_수정모형_EXP조절_v0.1.md', '07')} · {L('08_**_연구1·2_변수별_설문문항_검토초안_v0.2.md', '08 v0.2')}</td></tr>
<tr><td>10-03 저녁</td><td>통합모형 v0.4 · 양적검토 · 통합설문지 v0.1→v0.4</td><td>{L('11_연구1·2_통합모형·연구질문_v0.1.html', '11')} · {L('12_양적검토조교_11통합모형_검토_v0.1.md', '12 검토')} · {L('12_연구1·2_통합설문지_영한대조_원문근거보완_v0.4.html', '12 설문 v0.4')} · {L('14_통합설문지_Dillman_TDM_점검_v0.1.md', '14 Dillman')} · {L('17_전체문항_영한대조·추가근거_인용_명세서_v0.1.md', '17 인용')}</td></tr>
<tr><td>10-04 오전</td><td>인계 · 예비조사 결정안 · TV·SV 추가 v0.5</td><td>{L('18_새세션_인계_20261004.md', '18 인계')} · {L('19_예비조사_항목·적격·동의·앵커_결정안_v0.1.md', '19 결정안')} · {L('질문 검토/00_설문원문_영한대조_검토자료집_v0.5.html', '자료집 v0.5')}</td></tr>
<tr><td>10-04 밤</td><td>Google Forms 국문·영문 v0.8</td><td>{L('질문 검토/최종 설문/00_v0.8_변경사항과_미확정.md', 'v0.8 변경사항')}</td></tr>
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
