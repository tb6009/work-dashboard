#!/usr/bin/env python3
"""Build a local, privacy-preserving AI activity dashboard from real local logs.

Sources (read-only):
- ~/.hermes/state.db (top-level Hermes sessions)
- ~/.claude/projects/**/*.jsonl (top-level Claude sessions)
- ~/.codex/sessions/**/*.jsonl (Codex sessions)

Time is estimated from timestamped activity. A gap over IDLE_MINUTES starts a
new segment. Very short segments receive MIN_SEGMENT_MINUTES so one-shot work is
visible. Human focus time is not inferred.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sqlite3
from collections import defaultdict
from pathlib import Path
from zoneinfo import ZoneInfo

HOME = Path.home()
KST = ZoneInfo("Asia/Seoul")
IDLE_MINUTES = 15
MIN_SEGMENT_MINUTES = 3
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "design" / "v0.7_ai_activity_dashboard.html"

PROJECTS = {
    "039": ("RISE 코너스톤", "보고서"),
    "061": ("LifeOS", "제품개발"),
    "063": ("WorkDashboard", "제품개발"),
    "081": ("Anchornode", "보고서"),
    "09": ("몸과마음의과학", "리서치"),
    "12": ("Writing", "글쓰기"),
    "104": ("맨프레드봇", "에이전트"),
    "01": ("AI 작업환경", "시스템"),
    "etc": ("기타", "기타"),
}


def parse_ts(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return dt.datetime.fromtimestamp(value, dt.timezone.utc).astimezone(KST)
    try:
        return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(KST)
    except (ValueError, TypeError):
        return None


def text_from_content(value) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return " ".join(parts)
    if isinstance(value, dict):
        return text_from_content(value.get("content") or value.get("message") or value.get("text") or "")
    return ""


def clean_text(value: str, limit: int = 90) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = re.sub(r"/Users/jinhyunpark/\S+", "[작업 경로]", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value[:limit].rstrip() + ("…" if len(value) > limit else "")


def usable_prompt(value: str) -> bool:
    """Exclude injected context/status records that are not user work requests."""
    value = (value or "").strip().lower()
    noise_prefixes = (
        "[async delegation", "[context compaction", "[tool", "<system",
        "the user opened the file", "<task-notification", "<local-command",
    )
    if not value or value.startswith(noise_prefixes):
        return False
    if "/private/tmp/" in value or "toolu_" in value:
        return False
    return True


def classify(text: str, cwd: str = ""):
    hay = f"{text} {cwd}".lower()
    rules = [
        ("039", ("rise", "코너스톤", "mns", "학생작업", "기업적용")),
        ("061", ("lifeos", "061_lifeos", "작업페이지", "work와 thesis", "work, thesis")),
        ("081", ("anchornode", "gf_ui", "멀티에이전트 시스템 설계")),
        ("104", ("맨프레드", "manfred")),
        ("12", ("글편집", "writing", "글쓰기 봇")),
        ("09", ("몸과마음", "키토", "press-pulse", "암대사")),
        ("063", ("workdashboard", "work dashboard", "대시보드", "노션", "ai 작업시간")),
        ("01", ("graphify", "스킬 설치", "hermes", "에이전트 설정")),
    ]
    for project_id, needles in rules:
        if any(needle in hay for needle in needles):
            return project_id
    return "etc"


def split_segments(events, source, session_key, default_title, cwd="", context_project=None):
    events = sorted((e for e in events if e[0]), key=lambda x: x[0])
    if not events:
        return []
    groups, current = [], [events[0]]
    for event in events[1:]:
        if (event[0] - current[-1][0]).total_seconds() > IDLE_MINUTES * 60:
            groups.append(current)
            current = [event]
        else:
            current.append(event)
    groups.append(current)

    result = []
    for index, group in enumerate(groups):
        start, raw_end = group[0][0], group[-1][0]
        end = max(raw_end, start + dt.timedelta(minutes=MIN_SEGMENT_MINUTES))
        prompts = [clean_text(e[1], 100) for e in group if e[2] == "user" and usable_prompt(e[1]) and clean_text(e[1], 100)]
        fallback_title = default_title if usable_prompt(default_title or "") else f"{source} 작업"
        title = prompts[0] if prompts else fallback_title
        title = clean_text(title, 72)
        if prompts:
            project_id = classify(prompts[0], "")
            if project_id == "etc" and context_project:
                project_id = context_project
        else:
            project_id = classify(default_title or "", "")
            if project_id == "etc" and context_project:
                project_id = context_project
        if project_id == "etc":
            project_id = classify("", cwd)
        result.append({
            "id": f"{source.lower()}-{session_key}-{index}",
            "source": source,
            "sessionKey": session_key,
            "title": title,
            "projectId": project_id,
            "project": PROJECTS[project_id][0],
            "category": PROJECTS[project_id][1],
            "start": start.isoformat(),
            "end": end.isoformat(),
            "minutes": round((end - start).total_seconds() / 60, 1),
            "eventCount": len(group),
            "evidence": "timestamped-log",
        })
    return result


def extract_hermes(start, end):
    db = HOME / ".hermes" / "state.db"
    if not db.exists():
        return [], "not-found"
    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        """SELECT id, source, title, cwd FROM sessions
           WHERE source != 'subagent'
             AND started_at < ?
             AND COALESCE(last_activity_at, started_at) >= ?""",
        (end.timestamp(), start.timestamp()),
    ).fetchall()
    segments = []
    for row in rows:
        messages = con.execute(
            """SELECT timestamp, role, content FROM messages
               WHERE session_id = ? AND active = 1 AND timestamp >= ? AND timestamp < ?
               ORDER BY timestamp""",
            (row["id"], start.timestamp(), end.timestamp()),
        ).fetchall()
        events = []
        for msg in messages:
            stamp = parse_ts(msg["timestamp"])
            if stamp:
                events.append((stamp, msg["content"] or "", msg["role"] or "event"))
        segments.extend(split_segments(events, "Hermes", row["id"], row["title"] or "Hermes 작업", row["cwd"] or ""))
    con.close()
    return segments, "connected"


def extract_claude(start, end):
    root = HOME / ".claude" / "projects"
    if not root.exists():
        return [], "not-found"
    segments = []
    for path in root.rglob("*.jsonl"):
        if "subagents" in path.parts:
            continue
        events, titles, cwd = [], [], ""
        try:
            with path.open(errors="ignore") as handle:
                for line in handle:
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if obj.get("type") == "ai-title" and obj.get("aiTitle"):
                        titles.append(str(obj["aiTitle"]))
                    stamp = parse_ts(obj.get("timestamp") or obj.get("created_at"))
                    if not stamp or not (start <= stamp < end):
                        continue
                    cwd = cwd or str(obj.get("cwd") or "")
                    role = obj.get("type") or "event"
                    raw = obj.get("message") or obj.get("payload") or obj.get("content") or ""
                    text = text_from_content(raw)
                    events.append((stamp, text, "user" if role == "user" else role))
        except OSError:
            continue
        title = titles[-1] if titles else "Claude 작업"
        context_counts = defaultdict(int)
        for _stamp, event_text, role in events:
            if role == "user" and usable_prompt(event_text):
                inferred = classify(event_text, "")
                if inferred != "etc":
                    context_counts[inferred] += 1
        context_project = max(context_counts.items(), key=lambda item: item[1])[0] if context_counts else None
        segments.extend(split_segments(events, "Claude", path.stem, title, cwd, context_project))
    return segments, "connected"


def extract_codex(start, end):
    root = HOME / ".codex" / "sessions"
    if not root.exists():
        return [], "not-found"
    segments = []
    for path in root.rglob("*.jsonl"):
        events, cwd = [], ""
        try:
            with path.open(errors="ignore") as handle:
                for line in handle:
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    stamp = parse_ts(obj.get("timestamp") or obj.get("created_at"))
                    if not stamp or not (start <= stamp < end):
                        continue
                    payload = obj.get("payload") if isinstance(obj.get("payload"), dict) else {}
                    cwd = cwd or str(obj.get("cwd") or payload.get("cwd") or "")
                    role = payload.get("role") or obj.get("type") or "event"
                    text = text_from_content(payload.get("content") or payload.get("message") or obj.get("message") or "")
                    events.append((stamp, text, "user" if role == "user" else role))
        except OSError:
            continue
        segments.extend(split_segments(events, "Codex", path.stem, "Codex 작업", cwd))
    return segments, "connected"


def merge_intervals(intervals):
    intervals = sorted(intervals)
    merged = []
    for start, end in intervals:
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return [(a, b) for a, b in merged]


def build_data(days: int):
    today = dt.datetime.now(KST).date()
    start_date = today - dt.timedelta(days=days - 1)
    start = dt.datetime.combine(start_date, dt.time.min, tzinfo=KST)
    end = dt.datetime.combine(today + dt.timedelta(days=1), dt.time.min, tzinfo=KST)

    hermes, hermes_status = extract_hermes(start, end)
    claude, claude_status = extract_claude(start, end)
    codex, codex_status = extract_codex(start, end)
    sessions = sorted(hermes + claude + codex, key=lambda x: x["start"])

    intervals = [(parse_ts(s["start"]), parse_ts(s["end"])) for s in sessions]
    elapsed = sum((b - a).total_seconds() for a, b in merge_intervals(intervals)) / 60
    ai_total = sum(s["minutes"] for s in sessions)

    daily = []
    for offset in range(days):
        date = start_date + dt.timedelta(days=offset)
        ds = dt.datetime.combine(date, dt.time.min, tzinfo=KST)
        de = ds + dt.timedelta(days=1)
        day_intervals, ai_minutes = [], 0.0
        sources = defaultdict(float)
        for s in sessions:
            a, b = parse_ts(s["start"]), parse_ts(s["end"])
            if a is None or b is None:
                continue
            a2, b2 = max(a, ds), min(b, de)
            if a2 < b2:
                mins = (b2 - a2).total_seconds() / 60
                ai_minutes += mins
                sources[s["source"]] += mins
                day_intervals.append((a2, b2))
        elapsed_minutes = sum((b - a).total_seconds() for a, b in merge_intervals(day_intervals)) / 60
        daily.append({
            "date": date.isoformat(),
            "weekday": "월화수목금토일"[date.weekday()],
            "aiMinutes": round(ai_minutes, 1),
            "elapsedMinutes": round(elapsed_minutes, 1),
            "sources": {k: round(v, 1) for k, v in sources.items()},
        })

    projects = defaultdict(lambda: {"minutes": 0.0, "sessions": 0, "sources": set()})
    for s in sessions:
        item = projects[s["projectId"]]
        item["minutes"] += s["minutes"]
        item["sessions"] += 1
        item["sources"].add(s["source"])
    project_rows = []
    for pid, values in projects.items():
        project_rows.append({
            "id": pid,
            "name": PROJECTS[pid][0],
            "category": PROJECTS[pid][1],
            "minutes": round(values["minutes"], 1),
            "sessions": values["sessions"],
            "sources": sorted(values["sources"]),
        })
    project_rows.sort(key=lambda x: x["minutes"], reverse=True)

    source_minutes = defaultdict(float)
    for s in sessions:
        source_minutes[s["source"]] += s["minutes"]

    return {
        "generatedAt": dt.datetime.now(KST).isoformat(),
        "range": {"from": start_date.isoformat(), "to": today.isoformat(), "days": days},
        "method": {"idleCutoffMinutes": IDLE_MINUTES, "minimumSegmentMinutes": MIN_SEGMENT_MINUTES},
        "status": {
            "Hermes": hermes_status,
            "Claude": claude_status,
            "Codex": codex_status,
            "Google Calendar": "authentication-expired",
        },
        "metrics": {
            "elapsedMinutes": round(elapsed, 1),
            "aiTotalMinutes": round(ai_total, 1),
            "concurrency": round(ai_total / elapsed, 2) if elapsed else 0,
            "segments": len(sessions),
            "activeDays": sum(1 for day in daily if day["aiMinutes"] > 0),
        },
        "sources": [{"name": k, "minutes": round(v, 1)} for k, v in sorted(source_minutes.items(), key=lambda x: x[1], reverse=True)],
        "daily": daily,
        "projects": project_rows,
        "sessions": sessions,
    }


HTML_TEMPLATE = r'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI 작업 활동 · WorkDashboard v0.7</title>
<style>
:root{--ink:#171717;--sub:#525252;--muted:#858585;--line:#dedbd6;--paper:#f4f2ee;--white:#fff;--warm:#8c7765;--warm2:#c4b5a5;--blue:#7797b8;--violet:#9c8ab6;--green:#7fa68c;--orange:#b98d66;--red:#b77e7a;--black:#111;--font:"Apple SD Gothic Neo","Noto Sans KR",Arial,sans-serif;--mono:"SFMono-Regular",Menlo,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font);font-size:14px;line-height:1.5}.top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(8px)}.topin{max-width:1440px;margin:auto;padding:14px 28px;display:flex;align-items:center;gap:24px}.mark{width:30px;height:30px;background:#111;color:#fff;display:grid;place-items:center;font-weight:800}.brand{font-weight:750}.sub{font:10px var(--mono);color:var(--muted);letter-spacing:.08em}.topmeta{margin-left:auto;text-align:right;color:var(--muted);font:11px var(--mono)}main{max-width:1440px;margin:auto;padding:30px 28px 60px}.heading{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:22px}.eyebrow{font:11px var(--mono);letter-spacing:.11em;color:var(--muted);text-transform:uppercase}.heading h1{font-size:38px;line-height:1.05;margin:6px 0 8px;letter-spacing:-.035em}.range{color:var(--sub)}.quality{max-width:460px;border-top:2px solid var(--ink);padding-top:9px;color:var(--sub);font-size:12px}.quality strong{color:var(--ink)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);background:var(--line);gap:1px;margin-bottom:24px}.kpi{background:#fff;padding:18px 20px;min-height:118px}.klabel{font:10px var(--mono);color:var(--muted);letter-spacing:.09em;text-transform:uppercase}.kvalue{font-size:36px;font-weight:750;letter-spacing:-.04em;margin-top:10px;line-height:1}.kmeta{font-size:11px;color:var(--muted);margin-top:10px}.grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,.85fr);gap:16px;margin-bottom:16px}.panel{background:#fff;border:1px solid var(--line);padding:20px}.panelhead{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:18px}.panel h2{font-size:17px;margin:0;letter-spacing:-.02em}.panelnote{font-size:11px;color:var(--muted)}
.daychart{height:260px;display:flex;align-items:stretch;gap:8px;padding-top:18px;border-bottom:1px solid var(--line)}.daycol{flex:1;display:flex;flex-direction:column;justify-content:end;min-width:0}.bars{height:205px;display:flex;align-items:end;justify-content:center;gap:3px}.bar{width:min(24px,42%);min-height:1px;position:relative}.bar.ai{background:var(--ink)}.bar.elapsed{background:var(--warm2)}.bar:hover:after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 5px);transform:translateX(-50%);background:#111;color:#fff;padding:4px 6px;white-space:nowrap;font:10px var(--mono);z-index:3}.daylabel{text-align:center;font:10px var(--mono);color:var(--muted);padding:8px 0}.daylabel b{display:block;color:var(--sub);font-size:11px}.legend{display:flex;gap:16px;margin-top:13px;color:var(--muted);font-size:11px}.legend i{display:inline-block;width:10px;height:10px;margin-right:5px;vertical-align:-1px}.projectlist{display:flex;flex-direction:column;gap:13px}.prow{display:grid;grid-template-columns:118px 1fr 52px;gap:10px;align-items:center}.pname{font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pcat{font-size:10px;color:var(--muted)}.ptrack{height:12px;background:#eeeae4;position:relative}.pbar{height:100%;background:var(--warm)}.pval{text-align:right;font:11px var(--mono);color:var(--sub)}
.timeline{margin-bottom:16px}.controls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.control{border:1px solid var(--line);background:#fff;padding:7px 10px;font:11px var(--mono);color:var(--sub);cursor:pointer}.control.active{background:#111;color:#fff;border-color:#111}.trow{display:grid;grid-template-columns:94px 1fr;min-height:54px;border-top:1px solid var(--line)}.tdate{padding:12px 10px 8px 0}.tdate b{display:block;font:12px var(--mono)}.tdate span{font-size:11px;color:var(--muted)}.track{position:relative;background-image:linear-gradient(to right,transparent calc(100% - 1px),#eee calc(100% - 1px));background-size:calc(100% / 8) 100%;min-height:54px}.hours{display:grid;grid-template-columns:repeat(9,1fr);margin-left:94px;color:var(--muted);font:9px var(--mono);padding-bottom:5px}.hours span:last-child{text-align:right}.seg{position:absolute;height:14px;min-width:3px;cursor:pointer;border:0;padding:0;overflow:hidden;transition:height .12s,filter .12s}.seg:hover,.seg:focus{height:20px;filter:brightness(.82);z-index:4;outline:2px solid #fff}.seg[data-source="Claude"]{background:var(--violet)}.seg[data-source="Hermes"]{background:var(--blue)}.seg[data-source="Codex"]{background:var(--green)}
.tablepanel{padding:0;overflow:hidden}.tablehead{padding:20px;border-bottom:1px solid var(--line)}table{width:100%;border-collapse:collapse}th{text-align:left;font:10px var(--mono);color:var(--muted);letter-spacing:.08em;text-transform:uppercase;padding:10px 14px;border-bottom:1px solid var(--line)}td{padding:11px 14px;border-bottom:1px solid #ece9e4;vertical-align:top}tr:last-child td{border-bottom:0}.time{font:11px var(--mono);white-space:nowrap}.source{font:10px var(--mono);padding:2px 6px;color:#fff;display:inline-block}.source.Claude{background:var(--violet)}.source.Hermes{background:var(--blue)}.source.Codex{background:var(--green)}.titlecell b{display:block}.titlecell small{color:var(--muted)}.duration{text-align:right;font:11px var(--mono);white-space:nowrap}.empty{padding:32px;text-align:center;color:var(--muted)}
.statuses{display:flex;flex-wrap:wrap;gap:8px}.status{border:1px solid var(--line);padding:6px 9px;font:10px var(--mono)}.status.ok:before{content:"● ";color:#5f936e}.status.warn:before{content:"● ";color:#ba7955}.footnote{margin-top:16px;color:var(--muted);font-size:11px;max-width:900px}.drawer{position:fixed;inset:auto 0 0 0;background:#fff;border-top:2px solid #111;padding:20px max(28px,calc((100vw - 1384px)/2));transform:translateY(110%);visibility:hidden;pointer-events:none;transition:transform .2s,visibility 0s linear .2s;z-index:50;box-shadow:0 -8px 30px rgba(0,0,0,.12)}.drawer.open{transform:translateY(0);visibility:visible;pointer-events:auto;transition-delay:0s}.drawer button{float:right;border:0;background:#111;color:#fff;width:30px;height:30px;cursor:pointer}.drawer h3{margin:0 40px 7px 0}.dmeta{font:11px var(--mono);color:var(--muted)}
@media(max-width:900px){.heading{display:block}.quality{margin-top:18px}.kpis{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}.topmeta{display:none}.prow{grid-template-columns:100px 1fr 46px}.timeline{overflow:auto}.timelineInner{min-width:760px}table{min-width:700px}.tablepanel{overflow:auto}}
@media(max-width:560px){main{padding:22px 14px 48px}.topin{padding:12px 14px}.heading h1{font-size:30px}.kpis{grid-template-columns:1fr 1fr}.kpi{padding:15px;min-height:104px}.kvalue{font-size:29px}.panel{padding:15px}.grid{gap:12px}.daychart{height:230px}.bars{height:176px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
</head>
<body>
<header class="top"><div class="topin"><div class="mark">朴</div><div><div class="brand">AI 작업 활동</div><div class="sub">WORKDASHBOARD · v0.7</div></div><div class="topmeta" id="generated"></div></div></header>
<main>
<section class="heading"><div><div class="eyebrow">실제 로컬 로그 · 최근 7일</div><h1>언제, 무엇을, 얼마나 했는가</h1><div class="range" id="range"></div></div><div class="quality"><strong>시간 해석</strong><br>15분 이상 활동이 없으면 새 구간으로 분리했다. 이는 AI 로그 활동시간의 추정치이며 사람의 집중시간을 뜻하지 않는다.</div></section>
<section class="kpis"><article class="kpi"><div class="klabel">경과 활동시간</div><div class="kvalue" id="elapsed">—</div><div class="kmeta">동시 구간을 한 번만 계산</div></article><article class="kpi"><div class="klabel">AI 총작업량</div><div class="kvalue" id="total">—</div><div class="kmeta">에이전트별 시간을 모두 합산</div></article><article class="kpi"><div class="klabel">동시성 배수</div><div class="kvalue" id="ratio">—</div><div class="kmeta">총작업량 ÷ 경과 활동시간</div></article><article class="kpi"><div class="klabel">작업 구간</div><div class="kvalue" id="segments">—</div><div class="kmeta" id="activeDays">—</div></article></section>
<section class="grid"><article class="panel"><div class="panelhead"><h2>요일별 작업시간</h2><div class="panelnote">검정: AI 합계 · 베이지: 경과</div></div><div class="daychart" id="daychart"></div><div class="legend"><span><i style="background:var(--ink)"></i>AI 총작업량</span><span><i style="background:var(--warm2)"></i>경과 활동시간</span></div></article><article class="panel"><div class="panelhead"><h2>프로젝트별 비중</h2><div class="panelnote">추정 활동시간</div></div><div class="projectlist" id="projects"></div></article></section>
<section class="panel timeline"><div class="panelhead"><div><h2>7일 활동 타임라인</h2><div class="panelnote">블록을 선택하면 세부 기록을 확인할 수 있다.</div></div><div class="statuses" id="statuses"></div></div><div class="controls" id="sourceFilters"></div><div class="timelineInner"><div class="hours"><span>00</span><span>03</span><span>06</span><span>09</span><span>12</span><span>15</span><span>18</span><span>21</span><span>24</span></div><div id="timelineRows"></div></div><p class="footnote">짧은 단발 작업은 화면에서 사라지지 않도록 최소 3분으로 표시했다. Claude 하위 에이전트와 Hermes 하위 에이전트는 중복 집계를 피하기 위해 제외했다.</p></section>
<section class="panel tablepanel"><div class="tablehead"><div class="panelhead" style="margin:0"><h2>작업 구간 상세</h2><div class="panelnote" id="tableCount"></div></div></div><table><thead><tr><th>시간</th><th>도구</th><th>프로젝트 / 내용</th><th style="text-align:right">추정시간</th></tr></thead><tbody id="sessionTable"></tbody></table></section>
</main>
<aside class="drawer" id="drawer"><button id="closeDrawer" aria-label="닫기">×</button><h3 id="drawerTitle"></h3><div class="dmeta" id="drawerMeta"></div></aside>
<script id="dashboard-data" type="application/json">__DATA__</script>
<script>
const D=JSON.parse(document.getElementById('dashboard-data').textContent);let active='전체';
const $=s=>document.querySelector(s), fmt=m=>{m=Math.round(m);const h=Math.floor(m/60),r=m%60;return h?`${h}시간 ${r?`${r}분`:''}`:`${r}분`}, dtf=x=>new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(x));
$('#generated').innerHTML=`생성 ${dtf(D.generatedAt)}<br>LOCAL LOGS ONLY`;$('#range').textContent=`${D.range.from} ─ ${D.range.to}`;$('#elapsed').textContent=fmt(D.metrics.elapsedMinutes);$('#total').textContent=fmt(D.metrics.aiTotalMinutes);$('#ratio').textContent=`${D.metrics.concurrency.toFixed(2)}×`;$('#segments').textContent=D.metrics.segments;$('#activeDays').textContent=`7일 중 ${D.metrics.activeDays}일 활동`;
const maxDay=Math.max(1,...D.daily.map(x=>x.aiMinutes));$('#daychart').innerHTML=D.daily.map(x=>`<div class="daycol"><div class="bars"><div class="bar ai" style="height:${Math.max(1,x.aiMinutes/maxDay*100)}%" data-tip="AI ${fmt(x.aiMinutes)}"></div><div class="bar elapsed" style="height:${Math.max(1,x.elapsedMinutes/maxDay*100)}%" data-tip="경과 ${fmt(x.elapsedMinutes)}"></div></div><div class="daylabel"><b>${x.weekday}</b>${x.date.slice(5)}</div></div>`).join('');
const maxP=Math.max(1,...D.projects.map(x=>x.minutes));$('#projects').innerHTML=D.projects.length?D.projects.slice(0,7).map(x=>`<div class="prow"><div><div class="pname">${x.name}</div><div class="pcat">${x.category} · ${x.sessions}구간</div></div><div class="ptrack"><div class="pbar" style="width:${x.minutes/maxP*100}%"></div></div><div class="pval">${fmt(x.minutes)}</div></div>`).join(''):'<div class="empty">해당 기간의 로그가 없습니다.</div>';
$('#statuses').innerHTML=Object.entries(D.status).map(([k,v])=>`<span class="status ${v==='connected'?'ok':'warn'}">${k} · ${v==='connected'?'연결됨':v==='authentication-expired'?'인증 만료':'없음'}</span>`).join('');
const sources=['전체',...new Set(D.sessions.map(x=>x.source))];$('#sourceFilters').innerHTML=sources.map(s=>`<button class="control ${s==='전체'?'active':''}" data-filter="${s}">${s}</button>`).join('');
function filtered(){return active==='전체'?D.sessions:D.sessions.filter(x=>x.source===active)}
function openDrawer(s){$('#drawerTitle').textContent=s.title;$('#drawerMeta').textContent=`${s.source} · ${s.project} · ${dtf(s.start)}–${new Date(s.end).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})} · ${fmt(s.minutes)} · ${s.eventCount}개 로그 이벤트`;$('#drawer').classList.add('open')}
function render(){const fs=filtered();const byDate=Object.groupBy?Object.groupBy(fs,s=>s.start.slice(0,10)):fs.reduce((a,s)=>((a[s.start.slice(0,10)]??=[]).push(s),a),{});$('#timelineRows').innerHTML=D.daily.map(day=>{const segs=(byDate[day.date]||[]).map(s=>{const a=new Date(s.start),b=new Date(s.end);const mins=a.getHours()*60+a.getMinutes();const dur=Math.max(3,(b-a)/60000);const lane={Claude:3,Hermes:21,Codex:39}[s.source]||3;return `<button class="seg" data-id="${s.id}" data-source="${s.source}" aria-label="${s.title}" title="${s.source} · ${s.title} · ${fmt(s.minutes)}" style="left:${mins/1440*100}%;width:${Math.max(.25,dur/1440*100)}%;top:${lane}px"></button>`}).join('');return `<div class="trow"><div class="tdate"><b>${day.date.slice(5)}</b><span>${day.weekday} · ${fmt(day.aiMinutes)}</span></div><div class="track">${segs}</div></div>`}).join('');
$('#sessionTable').innerHTML=fs.length?[...fs].reverse().map(s=>`<tr data-row="${s.id}" tabindex="0"><td class="time">${dtf(s.start)}</td><td><span class="source ${s.source}">${s.source}</span></td><td class="titlecell"><b>${s.project}</b><small>${s.title}</small></td><td class="duration">${fmt(s.minutes)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">해당 도구의 작업 기록이 없습니다.</td></tr>';$('#tableCount').textContent=`${fs.length}개 구간`;
document.querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>openDrawer(D.sessions.find(s=>s.id===el.dataset.id)));document.querySelectorAll('[data-row]').forEach(el=>{const go=()=>openDrawer(D.sessions.find(s=>s.id===el.dataset.row));el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter')go()}})}
render();document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{active=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render()});$('#closeDrawer').onclick=()=>$('#drawer').classList.remove('open');document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#drawer').classList.remove('open')});
</script>
</body></html>'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--data-output", type=Path)
    args = parser.parse_args()
    data = build_data(args.days)
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    output = HTML_TEMPLATE.replace("__DATA__", payload)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    if args.data_output:
        args.data_output.parent.mkdir(parents=True, exist_ok=True)
        args.data_output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(args.output), "segments": data["metrics"]["segments"], "metrics": data["metrics"], "status": data["status"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
