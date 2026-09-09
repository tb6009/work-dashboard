#!/usr/bin/env python3
"""Build a single-page A3 portrait, 90-day AI activity chart."""
from __future__ import annotations

import argparse
import datetime as dt
import html
import importlib.util
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE_PATH = Path(__file__).with_name("build-ai-activity-dashboard.py")
DEFAULT_OUTPUT = ROOT / "design" / "v0.8_ai_activity_3months_A3_portrait.html"

PALETTE = {
    "061": ("LifeOS", "#0057FF"),
    "081": ("Anchornode", "#FF1744"),
    "01": ("AI 작업환경", "#FF7A00"),
    "104": ("맨프레드봇", "#7A00FF"),
    "039": ("RISE 코너스톤", "#00A651"),
    "09": ("몸과마음의과학", "#FFD400"),
    "12": ("Writing", "#00B8F0"),
    "063": ("WorkDashboard", "#FF00A8"),
    "etc": ("기타", "#222222"),
}
ORDER = list(PALETTE)


def load_core():
    spec = importlib.util.spec_from_file_location("ai_activity_core", CORE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {CORE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fmt_minutes(minutes: float) -> str:
    rounded = round(minutes)
    hours, rest = divmod(rounded, 60)
    return f"{hours}h {rest:02d}m" if hours else f"{rest}m"


def build(days: int, output: Path):
    core = load_core()
    data = core.build_data(days)
    start_date = dt.date.fromisoformat(data["range"]["from"])
    end_date = dt.date.fromisoformat(data["range"]["to"])

    by_day = defaultdict(lambda: defaultdict(float))
    titles = defaultdict(list)
    for session in data["sessions"]:
        seg_start = core.parse_ts(session["start"])
        seg_end = core.parse_ts(session["end"])
        if seg_start is None or seg_end is None:
            continue
        cursor = max(seg_start.date(), start_date)
        last = min(seg_end.date(), end_date)
        while cursor <= last:
            day_start = dt.datetime.combine(cursor, dt.time.min, tzinfo=core.KST)
            day_end = day_start + dt.timedelta(days=1)
            overlap_start, overlap_end = max(seg_start, day_start), min(seg_end, day_end)
            if overlap_start < overlap_end:
                minutes = (overlap_end - overlap_start).total_seconds() / 60
                by_day[cursor.isoformat()][session["projectId"]] += minutes
                if session["title"] not in titles[cursor.isoformat()]:
                    titles[cursor.isoformat()].append(session["title"])
            cursor += dt.timedelta(days=1)

    totals = {date: sum(projects.values()) for date, projects in by_day.items()}
    observed_max = max(totals.values(), default=60)
    scale_minutes = max(180, math.ceil(observed_max / 180) * 180)
    scale_hours = scale_minutes // 60

    day_rows = []
    previous_month = None
    for offset in range(days):
        date = start_date + dt.timedelta(days=offset)
        key = date.isoformat()
        projects = by_day.get(key, {})
        total = totals.get(key, 0)
        month_start = date.month != previous_month
        previous_month = date.month
        classes = ["day-row"]
        if date.weekday() >= 5:
            classes.append("weekend")
        if month_start:
            classes.append("month-start")
        label = f"{date.month:02d}.{date.day:02d}"
        weekday = "월화수목금토일"[date.weekday()]
        month_label = f"{date.month}월" if month_start else ""
        tooltip = " · ".join(titles.get(key, [])[:4]) or "활동 기록 없음"
        pieces = []
        for project_id in ORDER:
            minutes = projects.get(project_id, 0)
            if minutes <= 0:
                continue
            width = minutes / scale_minutes * 100
            name, color = PALETTE[project_id]
            pieces.append(
                f'<span class="piece" style="width:{width:.4f}%;background:{color}" '
                f'title="{html.escape(name)} · {fmt_minutes(minutes)}"></span>'
            )
        bars = "".join(pieces)
        day_rows.append(f'''<div class="{' '.join(classes)}" title="{html.escape(tooltip)}">
  <div class="date"><span class="month">{month_label}</span><span class="date-num">{label}</span><span class="weekday">{weekday}</span></div>
  <div class="bar-track">{bars}</div>
  <div class="total">{fmt_minutes(total) if total else '—'}</div>
</div>''')

    ticks = "".join(f'<span style="left:{hour/scale_hours*100:.4f}%">{hour}h</span>' for hour in range(0, scale_hours + 1, 3))
    legend = "".join(
        f'<span class="legend-item"><i style="background:{color}"></i>{html.escape(name)}</span>'
        for project_id, (name, color) in PALETTE.items()
    )
    source_counts = defaultdict(int)
    for session in data["sessions"]:
        source_counts[session["source"]] += 1
    source_text = " · ".join(f"{name} {count}" for name, count in sorted(source_counts.items()))

    doc = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI 작업 활동 3개월 · A3 세로</title>
<style>
@page{{size:A3 portrait;margin:9mm}}
:root{{--ink:#111;--muted:#6b7280;--line:#d6d8dc;--paper:#fff;--soft:#f4f5f7;--font:"Apple SD Gothic Neo","Noto Sans KR",Arial,sans-serif;--mono:"SFMono-Regular",Menlo,monospace}}
*{{box-sizing:border-box}}html,body{{margin:0;background:#e8eaed;color:var(--ink);font-family:var(--font)}}.sheet{{width:297mm;min-height:420mm;margin:10mm auto;background:var(--paper);padding:9mm;box-shadow:0 10px 40px rgba(0,0,0,.16)}}
header{{height:22mm;border-bottom:1.4mm solid #111;display:flex;align-items:flex-start;justify-content:space-between}}.eyebrow{{font:6.5pt var(--mono);letter-spacing:.14em;color:var(--muted)}}h1{{font-size:25pt;letter-spacing:-.045em;line-height:1;margin:2.5mm 0 0}}.range{{text-align:right;font:8pt var(--mono);line-height:1.55}}.range strong{{display:block;font-size:13pt;color:#111}}
.summary{{height:17mm;display:grid;grid-template-columns:repeat(4,1fr);border-bottom:.25mm solid var(--line)}}.metric{{padding:3mm 4mm 2mm 0}}.metric b{{display:block;font-size:14pt;line-height:1.05;letter-spacing:-.03em}}.metric span{{font:6pt var(--mono);color:var(--muted);letter-spacing:.06em}}
.legend{{min-height:15mm;display:flex;flex-wrap:wrap;align-content:center;gap:2mm 5mm;padding:2.5mm 0;border-bottom:.25mm solid var(--line)}}.legend-item{{font-size:6.2pt;white-space:nowrap}}.legend-item i{{display:inline-block;width:3.2mm;height:2.2mm;margin-right:1.2mm;vertical-align:-.5mm}}
.chart{{position:relative}}.axis{{height:5mm;margin-left:18mm;margin-right:15mm;position:relative;border-bottom:.25mm solid #111;font:5pt var(--mono);color:var(--muted)}}.axis span{{position:absolute;transform:translateX(-50%);bottom:1mm}}.axis span:first-child{{transform:none}}.axis span:last-child{{transform:translateX(-100%)}}
.day-row{{height:3.72mm;display:grid;grid-template-columns:18mm 1fr 15mm;align-items:stretch;border-bottom:.12mm solid #eceef0;break-inside:avoid}}.day-row.weekend{{background:#f7f7f8}}.day-row.month-start{{border-top:.65mm solid #111}}.date{{display:grid;grid-template-columns:5mm 7mm 3mm;align-items:center;gap:.5mm;padding-right:1.5mm;font:5.6pt var(--mono);color:#575b63}}.month{{font-weight:800;color:#111}}.date-num{{font-weight:400;letter-spacing:-.04em}}.weekday{{color:#9a9da3;text-align:right}}.bar-track{{position:relative;display:flex;align-items:center;height:100%;background-image:linear-gradient(to right,transparent calc(100% - .12mm),#e2e4e8 calc(100% - .12mm));background-size:calc(100% / {scale_hours/3:.0f}) 100%}}.piece{{height:2.45mm;display:block;min-width:.35mm}}.total{{display:flex;align-items:center;justify-content:flex-end;padding-left:1mm;font:5.5pt var(--mono);color:#50545b}}
footer{{height:10mm;border-top:.35mm solid #111;margin-top:2mm;padding-top:2mm;display:flex;justify-content:space-between;gap:8mm;font-size:5.6pt;color:var(--muted);line-height:1.45}}footer strong{{color:#111}}
@media print{{html,body{{background:#fff;width:279mm;height:402mm;overflow:hidden}}.sheet{{margin:0;box-shadow:none;width:279mm;height:402mm;min-height:0;padding:0;overflow:hidden;break-after:avoid}}}}
@media screen and (max-width:900px){{.sheet{{transform-origin:top left;transform:scale(.72);margin:0;width:297mm}}}}
</style></head><body><main class="sheet">
<header><div><div class="eyebrow">AI ACTIVITY · 90-DAY VERTICAL INDEX</div><h1>3개월 AI 작업 활동</h1></div><div class="range"><strong>{data['range']['from']} — {data['range']['to']}</strong>세로축 날짜 · 가로축 AI 총작업시간<br>{source_text}</div></header>
<section class="summary"><div class="metric"><b>{fmt_minutes(data['metrics']['elapsedMinutes'])}</b><span>경과 활동시간</span></div><div class="metric"><b>{fmt_minutes(data['metrics']['aiTotalMinutes'])}</b><span>AI 총작업량</span></div><div class="metric"><b>{data['metrics']['concurrency']:.2f}×</b><span>동시성 배수</span></div><div class="metric"><b>{data['metrics']['activeDays']} / {days}</b><span>활동일</span></div></section>
<section class="legend">{legend}</section>
<section class="chart"><div class="axis">{ticks}</div>{''.join(day_rows)}</section>
<footer><div><strong>읽는 법</strong> 날짜별 가로 막대의 길이는 AI 총작업량, 색상은 자동 분류된 프로젝트를 뜻한다. 여러 에이전트가 동시에 일하면 하루 합계가 실제 경과시간보다 길어질 수 있다.</div><div><strong>추정 기준</strong> 15분 이상 비활동 시 구간 분리 · 3분 미만 단발 작업은 3분 표시 · 하위 에이전트 중복 제외 · Google Calendar 인증 만료로 일정 제외 · 생성 {data['generatedAt'][:19]}</div></footer>
</main></body></html>'''
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(doc, encoding="utf-8")
    print({"output": str(output), "days": days, "segments": data["metrics"]["segments"], "activeDays": data["metrics"]["activeDays"], "scaleHours": scale_hours})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    build(args.days, args.output)


if __name__ == "__main__":
    main()
