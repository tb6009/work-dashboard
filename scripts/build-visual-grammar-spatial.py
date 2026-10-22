#!/usr/bin/env python3
"""build-visual-grammar-spatial.py — 1302/004 시각문법 공간 도식 개선판 공개본

사용법:
  python3 scripts/build-visual-grammar-spatial.py <site 폴더> <공개용 PDF>

출력: app/public/image-case-studies/visual-grammar-spatial/

공개 제외 (외부 촬영자 사진, 이용 조건 미확인):
  - films.html · references.html · fuji.html 페이지 전체
  - 다른 페이지 안의 © 표기 사진, 외부 원본 링크로 감싼 사진 → 출처 링크만 남긴 자리표시로 교체
  - downloads/*.pptx → 외부 사진 장을 뺀 공개용 PDF로 대체
"""
import re, shutil, sys
from pathlib import Path

SRC = Path(sys.argv[1])
PDF = Path(sys.argv[2])
OUT = Path(__file__).resolve().parent.parent / 'app/public/image-case-studies/visual-grammar-spatial'

PAGES = ['index', 'teaching', 'comparison', 'history', 'records', 'texture']
REMOVED = {'films.html': '필름 8종', 'references.html': '실제 사진', 'fuji.html': '공식 모드'}
PDF_NAME = 'downloads/visual-grammar-spatial.pdf'

def placeholder(block: str) -> str:
    src = re.search(r'href="(https?://[^"]+)"', block)
    link = f' · <a href="{src.group(1)}">원본 보기 ↗</a>' if src else ''
    return ('<div style="padding:24px;background:#f3f1ee;color:#6b6f72;font-size:13px">'
            f'외부 촬영자 사진 · 공개본에서 제외{link}</div>')

def is_external(block: str) -> bool:
    if '<img' not in block:
        return False
    return '©' in block or re.search(r'<a href="https?://[^"]+"[^>]*>\s*<img', block) is not None

def scrub(html: str) -> str:
    # 안쪽 블록(figure)부터, 그다음 사진을 직접 담은 article
    for tag in ('figure', 'article'):
        html = re.sub(rf'<{tag}\b[^>]*>(?:(?!<{tag}\b).)*?</{tag}>',
                      lambda m: placeholder(m.group(0)) if is_external(m.group(0)) else m.group(0),
                      html, flags=re.S)
    # 빠진 페이지로 가는 링크는 글자만 남김
    for page, label in REMOVED.items():
        html = re.sub(rf'<a href="{page}[^"]*"[^>]*>(.*?)</a>',
                      r'<span style="opacity:.45">\1</span>', html, flags=re.S)
    return html.replace('downloads/visual-grammar-spatial.pptx', PDF_NAME).replace('PowerPoint', 'PDF')

if OUT.exists():
    shutil.rmtree(OUT)
(OUT / 'downloads').mkdir(parents=True)

used = set()
for name in PAGES:
    html = scrub((SRC / f'{name}.html').read_text(encoding='utf-8'))
    (OUT / f'{name}.html').write_text(html, encoding='utf-8')
    used |= set(re.findall(r'assets/[\w/.-]+', html))

for rel in sorted(used):
    p = SRC / rel
    if p.is_file():
        (OUT / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, OUT / rel)
shutil.copy2(PDF, OUT / PDF_NAME)

left = [n for n in PAGES if '©' in (OUT / f'{n}.html').read_text(encoding='utf-8')]
print(f'✅ 페이지 {len(PAGES)} · 자산 {len(used)} → {OUT}')
print('⚠️ © 남은 페이지:', left or '없음')
