#!/usr/bin/env python3
"""
sync-design-history.py — LifeOS + workDashboard 디자인 히스토리 미러

산출물:
  app/public/lifeos-design/
    index.html                              ← LifeOS app/docs/design-history.html
    {참조파일들 구조 유지, .md → .html 변환}
  app/public/workdashboard-design/
    index.html                              ← design/VERSIONS.md HTML 변환본 + 시안 점프 링크
    {v0.1~v0.6 시안 HTML 13개}

실행: python3 scripts/sync-design-history.py
"""
import os
import re
import shutil
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKSPACE = ROOT.parent.parent
LIFEOS_DOCS = WORKSPACE / "06_Personal_Project/061_LifeOS/app/docs"
WD_DESIGN = ROOT / "design"
PUBLIC = ROOT / "app/public"

# ───────────────────────── Markdown → HTML (간이) ─────────────────────────
def inline(s):
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    return s


def md_to_body(md):
    out, in_list, in_code = [], False, False
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            if in_code:
                out.append("</code></pre>"); in_code = False
            else:
                out.append("<pre><code>"); in_code = True
            i += 1; continue
        if in_code:
            out.append(line); i += 1; continue
        if line.startswith("### "):
            out.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("## "):
            out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("# "):
            out.append(f"<h1>{inline(line[2:])}</h1>")
        elif line.startswith("---"):
            out.append("<hr>")
        elif line.startswith("> "):
            out.append(f"<blockquote>{inline(line[2:])}</blockquote>")
        elif line.startswith("|") and i + 1 < len(lines) and "---" in lines[i + 1]:
            headers = [c.strip() for c in line.strip("|").split("|")]
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(h)}</th>" for h in headers) + "</tr></thead><tbody>")
            i += 2
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip("|").split("|")]
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in cells) + "</tr>")
                i += 1
            out.append("</tbody></table>"); continue
        elif line.startswith("- ") or re.match(r"^\d+\. ", line):
            if not in_list:
                out.append("<ul>"); in_list = True
            text = re.sub(r"^(\d+\.\s|-\s)", "", line)
            out.append(f"<li>{inline(text)}</li>")
        elif line.strip() == "":
            if in_list: out.append("</ul>"); in_list = False
            out.append("")
        else:
            out.append(f"<p>{inline(line)}</p>")
        i += 1
    if in_list: out.append("</ul>")
    if in_code: out.append("</code></pre>")
    return "\n".join(out)


def wrap_html(title, body, back_link):
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
  :root {{
    --warm-50:#faf9f7; --gray-200:#e5e5e5; --gray-400:#a3a3a3;
    --gray-500:#737373; --gray-700:#404040; --gray-900:#171717; --black:#000;
  }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Pretendard Variable',Pretendard,-apple-system,system-ui,sans-serif;background:var(--warm-50);color:var(--gray-900);padding:56px 24px 96px;line-height:1.65}}
  .container{{max-width:880px;margin:0 auto}}
  h1{{font-size:34px;font-weight:300;letter-spacing:-0.02em;margin-bottom:24px}}
  h2{{font-size:22px;font-weight:700;margin:36px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--gray-200)}}
  h3{{font-size:15px;font-weight:700;margin:22px 0 10px;color:var(--gray-700)}}
  p{{font-size:14.5px;color:var(--gray-700);margin-bottom:10px}}
  ul{{margin:6px 0 14px 20px}} li{{font-size:14px;color:var(--gray-700);margin-bottom:3px}}
  hr{{border:0;border-top:1px solid var(--gray-200);margin:28px 0}}
  blockquote{{border-left:3px solid var(--gray-400);padding-left:14px;font-size:13.5px;color:var(--gray-500);font-style:italic;margin:10px 0}}
  code{{font-family:ui-monospace,'SF Mono',monospace;font-size:12.5px;background:rgba(0,0,0,0.05);padding:1px 5px;border-radius:3px}}
  pre{{background:var(--gray-900);color:#f5f5f5;padding:14px;overflow-x:auto;margin:10px 0;font-size:12.5px}}
  pre code{{background:none;color:inherit;padding:0}}
  table{{width:100%;border-collapse:collapse;margin:14px 0;font-size:13.5px}}
  th,td{{border:1px solid var(--gray-200);padding:7px 11px;text-align:left;vertical-align:top}}
  th{{background:rgba(0,0,0,0.03);font-weight:700}}
  a{{color:var(--gray-900);text-decoration:underline;text-underline-offset:2px}}
  a:hover{{color:var(--black)}}
  strong{{font-weight:700;color:var(--gray-900)}}
  .nav{{font-family:ui-monospace,'SF Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--gray-500);margin-bottom:32px}}
  .nav a{{color:var(--gray-500);text-decoration:none}} .nav a:hover{{color:var(--black)}}
</style>
</head>
<body>
<div class="container">
<div class="nav">{back_link}</div>
{body}
</div>
</body>
</html>
"""


# ───────────────────────── LifeOS mirror ─────────────────────────
def mirror_lifeos():
    src_index = LIFEOS_DOCS / "design-history.html"
    if not src_index.exists():
        print(f"❌ {src_index} 없음"); sys.exit(1)
    dst_dir = PUBLIC / "lifeos-design"
    if dst_dir.exists():
        shutil.rmtree(dst_dir)
    dst_dir.mkdir(parents=True)

    html = src_index.read_text(encoding="utf-8")
    # 모든 href 추출 (외부 https 제외, 앵커 #제외)
    hrefs = sorted(set(re.findall(r'href="([^"#]+)"', html)))
    hrefs = [h for h in hrefs if not h.startswith("http") and not h.startswith("/")]

    copied, converted, missing = [], [], []
    for href in hrefs:
        # URL 디코딩
        rel = urllib.parse.unquote(href)
        src = LIFEOS_DOCS / rel
        if not src.exists():
            missing.append(rel); continue
        if src.suffix.lower() == ".md":
            # MD → HTML
            md = src.read_text(encoding="utf-8")
            body = md_to_body(md)
            new_rel = rel[:-3] + ".html"
            dst = dst_dir / new_rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            title = src.stem
            back = '<a href="./index.html">← LIFEOS DESIGN HISTORY</a>'
            dst.write_text(wrap_html(title, body, back), encoding="utf-8")
            # index에서 href .md → .html
            old_attr = f'href="{href}"'
            new_attr = f'href="{href[:-3]}.html"'
            html = html.replace(old_attr, new_attr)
            converted.append(rel)
        else:
            dst = dst_dir / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied.append(rel)

    (dst_dir / "index.html").write_text(html, encoding="utf-8")

    print(f"📁 lifeos-design/  index + {len(copied)} HTML 복사 + {len(converted)} MD→HTML")
    if missing:
        print(f"   ⚠️  누락 {len(missing)}: {missing}")
    return len(copied) + len(converted) + 1


# ───────────────────────── workDashboard mirror ─────────────────────────
def mirror_workdashboard():
    dst_dir = PUBLIC / "workdashboard-design"
    if dst_dir.exists():
        shutil.rmtree(dst_dir)
    dst_dir.mkdir(parents=True)

    # 시안 HTML 복사
    sian_files = sorted(WD_DESIGN.glob("v*.html"))
    for s in sian_files:
        shutil.copy2(s, dst_dir / s.name)

    # VERSIONS.md → HTML
    md_src = WD_DESIGN / "VERSIONS.md"
    md = md_src.read_text(encoding="utf-8")
    body = md_to_body(md)

    # body 안의 <code>v0.X_*.html</code> 패턴을 점프 링크로 변환
    def linkify(match):
        fname = match.group(1)
        if (dst_dir / fname).exists():
            return f'<a href="./{fname}"><code>{fname}</code></a>'
        return match.group(0)

    body = re.sub(r"<code>(v\d+\.\d+[^<]*?\.html)</code>", linkify, body)

    # 시안 인덱스 카드 (상단)
    sian_cards = '<h2>시안 파일 직접 보기</h2>\n<ul>'
    for s in sian_files:
        sian_cards += f'\n<li><a href="./{s.name}">{s.name}</a></li>'
    sian_cards += '\n</ul>\n<hr>'

    final_body = sian_cards + "\n" + body
    back = '<a href="/projects/063">← #063 WORKDASHBOARD</a>'
    (dst_dir / "index.html").write_text(
        wrap_html("workDashboard — UI 디자인 히스토리", final_body, back),
        encoding="utf-8",
    )

    print(f"📁 workdashboard-design/  index + {len(sian_files)} 시안")
    return len(sian_files) + 1


if __name__ == "__main__":
    print(f"🔄 sync-design-history (workspace: {WORKSPACE})")
    n1 = mirror_lifeos()
    n2 = mirror_workdashboard()
    print(f"✅ 완료 — 총 {n1 + n2} 파일")
