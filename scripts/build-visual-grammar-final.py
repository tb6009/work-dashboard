#!/usr/bin/env python3
"""build-visual-grammar-final.py — 1302/004 시각문법 수업 포스터 최종본 공개

사용법:
  python3 scripts/build-visual-grammar-final.py <수업용_다이어그램_비교포스터.html>

출력: app/public/image-case-studies/visual-grammar-spatial/ (이 최종본 한 페이지만)
  - index.html        최종 포스터 (9개 보드)
  - assets/*.jpg|png  내장 이미지(data URI)를 파일로 분리

공개 제외 (외부 촬영자 사진, 이용 조건 미확인):
  - © 표기 사진, 외부 원본 링크로 감싼 사진 → 출처 링크만 남긴 자리표시
  - 다른 버전·작업 폴더로 가는 링크(.md, 11쌍 비교, 필름·후지 참조) → 글자만 남김
"""
import base64, hashlib, re, shutil, sys
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / 'app/public/image-case-studies/visual-grammar-spatial'
TITLE = '이미지를 만드는 선택 · 시각문법 수업 포스터'

def placeholder(block):
    src = re.search(r'href="(https?://[^"]+)"', block)
    link = f' · <a href="{src.group(1)}">원본 보기 ↗</a>' if src else ''
    return ('<div style="padding:24px;background:#f3f1ee;color:#6b6f72;font-size:13px">'
            f'외부 촬영자 사진 · 공개본에서 제외{link}</div>')

def is_external(block):
    if '<img' not in block:
        return False
    return '©' in block or re.search(r'<a href="https?://[^"]+"[^>]*>\s*<img', block) is not None

html = SRC.read_text(encoding='utf-8')
for tag in ('figure', 'article'):
    name = tag.split()[0]
    html = re.sub(rf'<{tag}[^>]*>(?:(?!<{name}\b).)*?</{name}>',
                  lambda m: placeholder(m.group(0)) if is_external(m.group(0)) else m.group(0),
                  html, flags=re.S)

# 로컬 링크(다른 버전·작업 파일)는 글자만 남김. 페이지 안 앵커와 외부 출처 링크는 유지
html = re.sub(r'<a ([^>]*?)href="(?!#|https?://)[^"]*"([^>]*)>(.*?)</a>',
              r'<span style="opacity:.45">\3</span>', html, flags=re.S)
html = re.sub(r'<title>[^<]*</title>', f'<title>{TITLE}</title>', html, count=1)

if OUT.exists():
    shutil.rmtree(OUT)
(OUT / 'assets').mkdir(parents=True)

def extract(m):
    mime, data = m.group(1), m.group(2)
    raw = base64.b64decode(data)
    name = f"assets/{hashlib.sha256(raw).hexdigest()[:20]}.{'png' if mime.endswith('png') else 'jpg'}"
    (OUT / name).write_bytes(raw)
    return name

html = re.sub(r'data:(image/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)', extract, html)
(OUT / 'index.html').write_text(html, encoding='utf-8')

print(f"✅ {OUT}/index.html · 이미지 {len(list((OUT / 'assets').iterdir()))}개")
print('⚠️ 남은 <img> 중 © 블록:', len(re.findall(r'©[^<]{0,80}</(?:p|figcaption)>', html)))
