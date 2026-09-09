#!/usr/bin/env python3
"""Build the v0.9 two-page A3 AI activity and model-usage report."""
from __future__ import annotations

import argparse
import datetime as dt
import html
import importlib.util
import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOME = Path.home()
CORE_PATH = Path(__file__).with_name("build-ai-activity-dashboard.py")
DEFAULT_HTML = ROOT / "design" / "v0.9_ai_activity_3months_A3_2pages.html"
DEFAULT_JSON = ROOT / "design" / "v0.9_ai_activity_3months_data.json"

PROJECT_STYLE = {
    "061": ("LifeOS", "#0057FF"),
    "081": ("Anchornode", "#FF1744"),
    "01": ("AI 작업환경", "#FF6D00"),
    "104": ("맨프레드봇", "#7C00FF"),
    "039": ("RISE 코너스톤", "#00B84A"),
    "09": ("몸과마음의과학", "#FFD400"),
    "12": ("Writing", "#00B8F0"),
    "063": ("WorkDashboard", "#FF00A8"),
    "etc": ("미분류(내용 있음)", "#777777"),
}
MODEL_COLORS = ["#0057FF", "#FF1744", "#00B84A", "#7C00FF", "#FF6D00", "#00B8F0", "#FF00A8", "#88C000", "#D000FF", "#009688", "#59636F"]
TOKEN_COLORS = {"input": "#0057FF", "cacheRead": "#00B8F0", "cacheWrite": "#7C00FF", "output": "#FF1744", "reasoning": "#FFB000"}


def load_core():
    spec = importlib.util.spec_from_file_location("ai_activity_core", CORE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {CORE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fmt_minutes(value: float) -> str:
    n = round(value)
    hours, minutes = divmod(n, 60)
    return f"{hours}시간 {minutes:02d}분" if hours else f"{minutes}분"


def fmt_tokens(value: float) -> str:
    value = float(value)
    if value >= 1_000_000_000:
        return f"{value / 1_000_000_000:.2f}B"
    if value >= 1_000_000:
        return f"{value / 1_000_000:.1f}M"
    if value >= 1_000:
        return f"{value / 1_000:.1f}K"
    return str(round(value))


def model_label(raw: str) -> str:
    labels = {
        "claude-opus-5": "Claude Opus 5",
        "claude-opus-4-8": "Claude Opus 4.8",
        "claude-opus-4-7": "Claude Opus 4.7",
        "claude-sonnet-5": "Claude Sonnet 5",
        "claude-sonnet-4-6": "Claude Sonnet 4.6",
        "claude-fable-5": "Claude Fable 5",
        "<synthetic>": "Claude 내부 합성",
        "gpt-5.6-sol": "GPT-5.6 Sol",
        "gpt-5.5": "GPT-5.5",
        "codex-auto-review": "Codex Auto Review",
        "unknown": "모델 미확인",
    }
    return labels.get(raw, raw)


def blank_usage():
    return {
        "minutes": 0.0,
        "input": 0,
        "cacheRead": 0,
        "cacheWrite": 0,
        "output": 0,
        "reasoning": 0,
        "total": 0,
        "requests": 0,
        "sources": set(),
    }


def add_usage(bucket, model, source, *, input_tokens=0, cache_read=0, cache_write=0, output=0, reasoning=0, total=None, requests=0):
    model = model or "unknown"
    item = bucket[model]
    item["sources"].add(source)
    item["input"] += max(0, int(input_tokens or 0))
    item["cacheRead"] += max(0, int(cache_read or 0))
    item["cacheWrite"] += max(0, int(cache_write or 0))
    item["output"] += max(0, int(output or 0))
    item["reasoning"] += max(0, int(reasoning or 0))
    if total is None:
        total = int(input_tokens or 0) + int(cache_read or 0) + int(cache_write or 0) + int(output or 0)
    item["total"] += max(0, int(total or 0))
    item["requests"] += max(0, int(requests or 0))


def collect_model_usage(core, data):
    start = core.parse_ts(data["range"]["from"] + "T00:00:00+09:00")
    end_date = dt.date.fromisoformat(data["range"]["to"]) + dt.timedelta(days=1)
    end = core.parse_ts(end_date.isoformat() + "T00:00:00+09:00")
    usage = defaultdict(blank_usage)
    model_events = defaultdict(list)
    defaults = {}

    # Claude: each assistant response carries raw model ID and per-response usage.
    claude_root = HOME / ".claude" / "projects"
    if claude_root.exists():
        for path in claude_root.rglob("*.jsonl"):
            if "subagents" in path.parts:
                continue
            key = ("Claude", path.stem)
            counts = Counter()
            try:
                with path.open(errors="ignore") as handle:
                    for line in handle:
                        try:
                            obj = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        stamp = core.parse_ts(obj.get("timestamp") or obj.get("created_at"))
                        if not stamp or not (start <= stamp < end) or obj.get("type") != "assistant":
                            continue
                        message = obj.get("message") if isinstance(obj.get("message"), dict) else {}
                        model = str(message.get("model") or "unknown")
                        counts[model] += 1
                        model_events[key].append((stamp, model))
                        raw = message.get("usage") if isinstance(message.get("usage"), dict) else {}
                        if raw:
                            add_usage(
                                usage,
                                model,
                                "Claude",
                                input_tokens=raw.get("input_tokens", 0),
                                cache_read=raw.get("cache_read_input_tokens", 0),
                                cache_write=raw.get("cache_creation_input_tokens", 0),
                                output=raw.get("output_tokens", 0),
                                requests=1,
                            )
            except OSError:
                continue
            if counts:
                defaults[key] = counts.most_common(1)[0][0]

    # Codex: total_token_usage is cumulative per rollout. Attribute positive deltas
    # to the model active in the latest turn_context.
    codex_root = HOME / ".codex" / "sessions"
    if codex_root.exists():
        for path in codex_root.rglob("*.jsonl"):
            key = ("Codex", path.stem)
            current_model = "unknown"
            counts = Counter()
            previous = None
            try:
                with path.open(errors="ignore") as handle:
                    for line in handle:
                        try:
                            obj = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        stamp = core.parse_ts(obj.get("timestamp") or obj.get("created_at"))
                        payload = obj.get("payload") if isinstance(obj.get("payload"), dict) else {}
                        if obj.get("type") == "turn_context" and payload.get("model"):
                            current_model = str(payload["model"])
                            if stamp and start <= stamp < end:
                                counts[current_model] += 1
                                model_events[key].append((stamp, current_model))
                        if obj.get("type") != "event_msg" or payload.get("type") != "token_count":
                            continue
                        raw_info = payload.get("info")
                        info: dict = raw_info if isinstance(raw_info, dict) else {}
                        raw_total = info.get("total_token_usage")
                        total: dict = raw_total if isinstance(raw_total, dict) else {}
                        if not total:
                            continue
                        fields = {k: int(total.get(k, 0) or 0) for k in ("input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens")}
                        if previous is None:
                            delta = fields
                        else:
                            delta = {k: (fields[k] - previous.get(k, 0) if fields[k] >= previous.get(k, 0) else fields[k]) for k in fields}
                        previous = fields
                        if not stamp or not (start <= stamp < end) or not any(delta.values()):
                            continue
                        cached = delta["cached_input_tokens"]
                        fresh_input = max(0, delta["input_tokens"] - cached)
                        reasoning = delta["reasoning_output_tokens"]
                        visible_output = max(0, delta["output_tokens"] - reasoning)
                        add_usage(
                            usage,
                            current_model,
                            "Codex",
                            input_tokens=fresh_input,
                            cache_read=cached,
                            output=visible_output,
                            reasoning=reasoning,
                            total=delta["total_tokens"],
                            requests=1,
                        )
                        model_events[key].append((stamp, current_model))
                        counts[current_model] += 1
            except OSError:
                continue
            if counts:
                defaults[key] = counts.most_common(1)[0][0]

    # Hermes state database owns session totals and the selected model.
    hermes_db = HOME / ".hermes" / "state.db"
    if hermes_db.exists():
        con = sqlite3.connect(hermes_db)
        con.row_factory = sqlite3.Row
        rows = con.execute(
            """SELECT id, model, started_at, input_tokens, output_tokens,
                      cache_read_tokens, cache_write_tokens, reasoning_tokens,
                      api_call_count
                 FROM sessions
                WHERE source != 'subagent' AND started_at < ?
                  AND COALESCE(last_activity_at, started_at) >= ?""",
            (end.timestamp(), start.timestamp()),
        ).fetchall()
        for row in rows:
            model = str(row["model"] or "unknown")
            defaults[("Hermes", row["id"])] = model
            add_usage(
                usage,
                model,
                "Hermes",
                input_tokens=row["input_tokens"],
                cache_read=row["cache_read_tokens"],
                cache_write=row["cache_write_tokens"],
                output=max(0, int(row["output_tokens"] or 0) - int(row["reasoning_tokens"] or 0)),
                reasoning=row["reasoning_tokens"],
                total=int(row["input_tokens"] or 0) + int(row["output_tokens"] or 0) + int(row["cache_read_tokens"] or 0) + int(row["cache_write_tokens"] or 0),
                requests=row["api_call_count"],
            )
        con.close()

    # Attribute each task segment to its dominant observed model. This is activity
    # time, not model inference latency.
    for session in data["sessions"]:
        key = (session["source"], session["sessionKey"])
        seg_start, seg_end = core.parse_ts(session["start"]), core.parse_ts(session["end"])
        observed = []
        if seg_start and seg_end:
            observed = [model for stamp, model in model_events.get(key, []) if seg_start <= stamp <= seg_end]
        model = Counter(observed).most_common(1)[0][0] if observed else defaults.get(key, "unknown")
        usage[model]["minutes"] += session["minutes"]
        usage[model]["sources"].add(session["source"])

    rows = []
    for raw, values in usage.items():
        if not values["minutes"] and not values["total"]:
            continue
        row = {k: v for k, v in values.items() if k != "sources"}
        row.update({"id": raw, "name": model_label(raw), "sources": sorted(values["sources"])})
        rows.append(row)
    rows.sort(key=lambda row: (row["minutes"] + row["total"] / 1_000_000), reverse=True)
    return rows


def split_session_by_day(core, session, first_day, last_day):
    start, end = core.parse_ts(session["start"]), core.parse_ts(session["end"])
    if start is None or end is None:
        return []
    result = []
    cursor = max(first_day, start.date())
    final = min(last_day, end.date())
    while cursor <= final:
        day_start = dt.datetime.combine(cursor, dt.time.min, tzinfo=core.KST)
        day_end = day_start + dt.timedelta(days=1)
        a, b = max(start, day_start), min(end, day_end)
        if a < b:
            result.append((cursor.isoformat(), a, b))
        cursor += dt.timedelta(days=1)
    return result


def meaningful_unknown(title: str) -> bool:
    lower = title.lower().strip()
    noise = ("the user opened", "here is a list of plugins", "asia/seoul", "[async delegation", "[context compaction")
    return bool(title.strip()) and not any(marker in lower for marker in noise)


def make_report(days: int, output_html: Path, output_json: Path):
    core = load_core()
    data = core.build_data(days)
    models = collect_model_usage(core, data)
    first_day = dt.date.fromisoformat(data["range"]["from"])
    last_day = dt.date.fromisoformat(data["range"]["to"])

    day_blocks = defaultdict(list)
    project_daily = defaultdict(lambda: defaultdict(float))
    for session in data["sessions"]:
        for date_key, start, end in split_session_by_day(core, session, first_day, last_day):
            minutes = (end - start).total_seconds() / 60
            project_daily[date_key][session["projectId"]] += minutes
            start_minute = start.hour * 60 + start.minute + start.second / 60
            width_minutes = max(3, minutes)
            day_blocks[date_key].append({
                "left": start_minute / 1440 * 100,
                "width": min(width_minutes, 1440 - start_minute) / 1440 * 100,
                "source": session["source"],
                "projectId": session["projectId"],
                "title": session["title"],
                "minutes": minutes,
            })

    source_lane = {"Claude": 0, "Codex": 1, "Hermes": 2}
    timeline_rows = []
    previous_month = None
    for offset in range(days):
        date = first_day + dt.timedelta(days=offset)
        key = date.isoformat()
        month_start = date.month != previous_month
        previous_month = date.month
        classes = ["timeline-row"]
        if date.weekday() >= 5:
            classes.append("weekend")
        if month_start:
            classes.append("month-start")
        blocks = []
        for block in day_blocks.get(key, []):
            pid = block["projectId"]
            color = PROJECT_STYLE[pid][1]
            lane = source_lane.get(block["source"], 2)
            extra = " unknown" if pid == "etc" else ""
            title = f'{block["source"]} · {PROJECT_STYLE[pid][0]} · {fmt_minutes(block["minutes"])} · {block["title"]}'
            blocks.append(
                f'<span class="time-block{extra}" style="left:{block["left"]:.4f}%;width:{block["width"]:.4f}%;top:{0.2 + lane * 0.9:.2f}mm;--block:{color}" title="{html.escape(title)}"></span>'
            )
        total = sum(project_daily.get(key, {}).values())
        month = f"{date.month}월" if month_start else ""
        timeline_rows.append(f'''<div class="{' '.join(classes)}">
<div class="date-axis"><b>{month}</b><span>{date.month:02d}.{date.day:02d}</span><i>{'월화수목금토일'[date.weekday()]}</i></div>
<div class="time-track">{''.join(blocks)}</div><div class="day-total">{fmt_minutes(total) if total else '—'}</div></div>''')

    project_max = max((p["minutes"] for p in data["projects"]), default=1)
    project_rows = []
    for item in data["projects"]:
        pid = item["id"]
        name, color = PROJECT_STYLE[pid]
        width = item["minutes"] / project_max * 100
        style = f"--bar:{color}"
        if pid == "etc":
            style += ";--bar:#777"
        project_rows.append(f'''<div class="project-row {'unknown-row' if pid == 'etc' else ''}">
<div class="project-name"><b>{html.escape(name)}</b><span>{item['sessions']}구간 · {'/'.join(item['sources'])}</span></div>
<div class="summary-track"><span style="width:{width:.3f}%;{style}"></span></div><div class="number">{fmt_minutes(item['minutes'])}</div></div>''')

    max_model_minutes = max((m["minutes"] for m in models), default=1)
    max_model_tokens = max((m["total"] for m in models), default=1)
    model_rows = []
    for index, model in enumerate(models):
        time_width = model["minutes"] / max_model_minutes * 100
        usage_width = model["total"] / max_model_tokens * 100
        components = []
        composition_total = sum(model[k] for k in TOKEN_COLORS)
        if composition_total:
            for field, color in TOKEN_COLORS.items():
                value = model[field]
                if value:
                    components.append(f'<i style="width:{value / composition_total * 100:.4f}%;background:{color}"></i>')
        model_color = MODEL_COLORS[index % len(MODEL_COLORS)]
        model_rows.append(f'''<div class="model-row">
<div class="model-name"><b>{html.escape(model['name'])}</b><span>{'/'.join(model['sources'])} · 사용기록 {model['requests']:,}건</span></div>
<div class="model-time"><div><span style="width:{time_width:.3f}%;background:{model_color}"></span></div><b>{fmt_minutes(model['minutes'])}</b></div>
<div class="model-tokens"><div class="token-outer" style="width:{usage_width:.3f}%">{''.join(components)}</div><b>{fmt_tokens(model['total'])}</b></div></div>''')

    unknown = [s for s in data["sessions"] if s["projectId"] == "etc"]
    unknown_minutes = sum(s["minutes"] for s in unknown)
    unknown_sources = Counter(s["source"] for s in unknown)
    samples = sorted((s for s in unknown if meaningful_unknown(s["title"])), key=lambda s: s["minutes"], reverse=True)[:7]
    unknown_samples = "".join(
        f'<li><span>{html.escape(s["source"])}</span><b>{html.escape(s["title"][:105])}</b><i>{fmt_minutes(s["minutes"])}</i></li>'
        for s in samples
    )

    legend = "".join(
        f'<span><i class="{"stripe" if pid == "etc" else ""}" style="--legend:{color}"></i>{html.escape(name)}</span>'
        for pid, (name, color) in PROJECT_STYLE.items()
    )
    hour_ticks = "".join(f'<span style="left:{hour / 24 * 100:.4f}%">{hour:02d}</span>' for hour in range(0, 25, 3))
    total_tokens = sum(m["total"] for m in models)

    serializable_models = []
    for model in models:
        serializable_models.append(model)
    audit = {
        "generatedAt": data["generatedAt"],
        "range": data["range"],
        "metrics": data["metrics"],
        "projects": data["projects"],
        "models": serializable_models,
        "unclassified": {"segments": len(unknown), "minutes": round(unknown_minutes, 1), "sources": dict(unknown_sources)},
        "coverage": {
            "Claude": "assistant message model + usage fields; subagents excluded",
            "Codex": "turn_context model + cumulative token_count positive deltas",
            "Hermes": "state.db session model and token totals; subagents excluded",
        },
    }
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")

    doc = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI 작업 활동 v0.9 · A3 2페이지</title><style>
@page{{size:A3 portrait;margin:0}}:root{{--ink:#111;--muted:#68707a;--line:#d9dde2;--paper:#fff;--soft:#f4f5f7;--font:"Apple SD Gothic Neo","Noto Sans KR",Arial,sans-serif;--mono:"SFMono-Regular",Menlo,monospace}}
*{{box-sizing:border-box}}html,body{{margin:0;background:#dfe2e6;color:var(--ink);font-family:var(--font)}}.page{{width:297mm;height:420mm;padding:9mm;margin:10mm auto;background:var(--paper);box-shadow:0 10px 42px rgba(0,0,0,.16);overflow:hidden;break-after:page}}.page:last-child{{break-after:avoid}}
.report-head{{height:23mm;border-bottom:1.1mm solid #111;display:flex;align-items:flex-start;justify-content:space-between}}.eyebrow{{font:6.5pt var(--mono);letter-spacing:.14em;color:var(--muted)}}h1{{font-size:24pt;line-height:1;margin:2.5mm 0 0;letter-spacing:-.045em}}.range{{font:7pt var(--mono);line-height:1.55;text-align:right}}.range strong{{display:block;font-size:12pt}}
.metrics{{height:16mm;display:grid;grid-template-columns:repeat(5,1fr);border-bottom:.25mm solid var(--line)}}.metric{{padding:3mm 2mm 0 0}}.metric b{{display:block;font-size:13pt;line-height:1}}.metric span{{font:5.5pt var(--mono);color:var(--muted)}}
.legend{{height:13mm;display:flex;align-content:center;align-items:center;flex-wrap:wrap;gap:1.7mm 4.2mm;border-bottom:.25mm solid var(--line)}}.legend span{{font-size:5.8pt;white-space:nowrap}}.legend i{{display:inline-block;width:3mm;height:2mm;background:var(--legend);margin-right:1mm;vertical-align:-.4mm}}.legend i.stripe,.time-block.unknown,.unknown-row .summary-track span{{background:repeating-linear-gradient(135deg,#61656b 0,#61656b .7mm,#aeb3b9 .7mm,#aeb3b9 1.4mm)!important}}
.section-bar{{height:8mm;display:flex;align-items:end;justify-content:space-between;padding-bottom:1.5mm;border-bottom:.25mm solid #111}}.section-bar h2{{font-size:11pt;margin:0;letter-spacing:-.025em}}.section-bar p{{font:5.5pt var(--mono);margin:0;color:var(--muted)}}
.time-axis{{height:5mm;margin-left:17mm;margin-right:13mm;position:relative;border-bottom:.25mm solid #111;font:4.8pt var(--mono);color:var(--muted)}}.time-axis span{{position:absolute;bottom:1mm;transform:translateX(-50%)}}.time-axis span:first-child{{transform:none}}.time-axis span:last-child{{transform:translateX(-100%)}}
.timeline-row{{height:3.35mm;display:grid;grid-template-columns:17mm 1fr 13mm;border-bottom:.1mm solid #eceef0;align-items:stretch}}.timeline-row.weekend{{background:#f7f7f8}}.timeline-row.month-start{{border-top:.55mm solid #111}}.date-axis{{display:grid;grid-template-columns:5mm 7mm 2.5mm;gap:.5mm;align-items:center;padding-right:1mm;font:5.3pt var(--mono);color:#60656d}}.date-axis b{{font-size:5.5pt;color:#111}}.date-axis i{{font-style:normal;color:#999;text-align:right}}.time-track{{position:relative;background-image:linear-gradient(to right,transparent calc(100% - .1mm),#e1e4e8 calc(100% - .1mm));background-size:12.5% 100%}}.time-block{{position:absolute;height:.72mm;background:var(--block);min-width:.25mm}}.day-total{{display:flex;justify-content:flex-end;align-items:center;font:5pt var(--mono);color:#555d66}}
.page-foot{{height:9mm;margin-top:2mm;border-top:.3mm solid #111;padding-top:1.5mm;display:flex;justify-content:space-between;gap:7mm;font-size:5.3pt;line-height:1.35;color:var(--muted)}}.page-foot strong{{color:#111}}
.page-two .report-head{{height:20mm}}.page-two h1{{font-size:21pt}}.page-two .section-bar{{margin-top:1mm}}
.project-list{{padding:2mm 0 3mm}}.project-row{{height:8.3mm;display:grid;grid-template-columns:48mm 1fr 25mm;align-items:center;border-bottom:.12mm solid #eceef0}}.project-name b{{display:block;font-size:10pt}}.project-name span{{font:6.4pt var(--mono);color:var(--muted)}}.summary-track{{height:3.2mm;background:#edf0f2}}.summary-track span{{display:block;height:100%;width:0;background:var(--bar)}}.number{{text-align:right;font:7.7pt var(--mono)}}
.model-head,.model-row{{display:grid;grid-template-columns:49mm 82mm 1fr;column-gap:4mm;align-items:center}}.model-head{{height:8mm;border-bottom:.25mm solid #111;font:6.6pt var(--mono);color:var(--muted)}}.model-row{{height:9.8mm;border-bottom:.12mm solid #e4e7ea}}.model-name b{{display:block;font-size:9.5pt}}.model-name span{{font:6.2pt var(--mono);color:var(--muted)}}.model-time,.model-tokens{{display:grid;grid-template-columns:1fr 21mm;align-items:center;gap:2mm}}.model-time>div,.model-tokens>div{{height:3.2mm;background:#edf0f2}}.model-time span{{display:block;height:100%}}.model-time b,.model-tokens b{{font:7.2pt var(--mono);text-align:right}}.token-outer{{display:flex!important;height:3.2mm!important;min-width:.3mm}}.token-outer i{{display:block;height:100%}}
.token-key{{height:9mm;display:flex;align-items:center;gap:5mm;border-bottom:.25mm solid var(--line);font-size:7pt}}.token-key span i{{display:inline-block;width:3mm;height:2mm;margin-right:1mm;vertical-align:-.4mm}}
.unknown-box{{margin-top:3mm;border-top:.8mm solid #111;padding-top:2mm;display:grid;grid-template-columns:65mm 1fr;gap:6mm}}.unknown-intro h3{{font-size:12pt;margin:0 0 1.5mm}}.unknown-intro strong{{display:block;font-size:17pt}}.unknown-intro p{{font-size:7pt;line-height:1.45;color:var(--muted);margin:2mm 0}}.unknown-list{{list-style:none;padding:0;margin:0}}.unknown-list li{{min-height:7.8mm;display:grid;grid-template-columns:14mm 1fr 19mm;align-items:center;border-bottom:.12mm solid #e3e6e9;gap:2mm}}.unknown-list span{{font:6.5pt var(--mono);color:var(--muted)}}.unknown-list b{{font-size:7.7pt;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.unknown-list i{{font:6.8pt var(--mono);font-style:normal;text-align:right}}
@media print{{html,body{{background:#fff;width:297mm}}.page{{margin:0;box-shadow:none}}}}@media screen and (max-width:900px){{.page{{transform-origin:top left;transform:scale(.72);margin:0 0 -117mm 0}}}}
</style></head><body>
<main class="page page-one"><header class="report-head"><div><div class="eyebrow">WORKDASHBOARD v0.9 · 90-DAY MONITOR</div><h1>날짜별 24시간 타임라인</h1></div><div class="range"><strong>{data['range']['from']} — {data['range']['to']}</strong>날짜축 17mm · Claude / Codex / Hermes 3개 레인<br>블록 선택 시 HTML에서 작업 내용 확인</div></header>
<section class="metrics"><div class="metric"><b>{fmt_minutes(data['metrics']['elapsedMinutes'])}</b><span>경과 활동시간</span></div><div class="metric"><b>{fmt_minutes(data['metrics']['aiTotalMinutes'])}</b><span>AI 총작업량</span></div><div class="metric"><b>{data['metrics']['concurrency']:.2f}×</b><span>동시성 배수</span></div><div class="metric"><b>{data['metrics']['segments']}</b><span>작업 구간</span></div><div class="metric"><b>{data['metrics']['activeDays']} / {days}</b><span>활동일</span></div></section>
<section class="legend">{legend}</section><div class="section-bar"><h2>3개월 활동 분포</h2><p>레인 위→아래: Claude · Codex · Hermes / 색상: 프로젝트</p></div><div class="time-axis">{hour_ticks}</div>{''.join(timeline_rows)}
<footer class="page-foot"><div><strong>시간 해석</strong> 15분 이상 활동이 없으면 새 구간으로 분리했다. 짧은 작업은 24시간축에서 보이도록 최소 3분 너비로 표시했다.</div><div><strong>주의</strong> 이 시간은 로그에 근거한 AI 작업 활동 추정치이며 사람의 집중시간이나 모델 추론 지연시간이 아니다.</div></footer></main>
<main class="page page-two"><header class="report-head"><div><div class="eyebrow">WORKDASHBOARD v0.9 · DETAIL</div><h1>AI 작업활동과 모델 사용</h1></div><div class="range"><strong>{fmt_tokens(total_tokens)} tokens</strong>실제 로그 기록 토큰 합계<br>비용이 아닌 사용량</div></header>
<div class="section-bar"><h2>AI 작업활동 · 프로젝트별 추정시간</h2><p>기존 ‘기타’는 ‘미분류(내용 있음)’으로 변경</p></div><section class="project-list">{''.join(project_rows)}</section>
<div class="section-bar"><h2>사용 모델 · 활동시간과 토큰 사용량</h2><p>시간: 작업 구간 대표 모델 귀속 · 토큰: 로그 실측</p></div><div class="model-head"><span>모델 / 수집 출처</span><span>귀속 활동시간</span><span>토큰 사용량 / 사용기록</span></div><section>{''.join(model_rows)}</section>
<div class="token-key"><strong>토큰 구성</strong>{''.join(f'<span><i style="background:{color}"></i>{label}</span>' for label, color in [("새 입력",TOKEN_COLORS["input"]),("캐시 읽기",TOKEN_COLORS["cacheRead"]),("캐시 쓰기",TOKEN_COLORS["cacheWrite"]),("출력",TOKEN_COLORS["output"]),("추론",TOKEN_COLORS["reasoning"])])}</div>
<section class="unknown-box"><div class="unknown-intro"><h3>미분류는 무엇인가?</h3><strong>{len(unknown)}구간 · {fmt_minutes(unknown_minutes)}</strong><p>세부 내용이 없는 작업이 아니다. 프로젝트 이름이 분류표에 없거나 시스템 문맥이 제목으로 잡힌 기록이다.</p><p>{' · '.join(f'{source} {count}구간' for source,count in unknown_sources.most_common())}</p></div><ol class="unknown-list">{unknown_samples}</ol></section>
<footer class="page-foot"><div><strong>수집 범위</strong> Claude assistant usage · Codex cumulative token delta · Hermes state.db session totals. 하위 에이전트는 중복 방지를 위해 제외했다.</div><div><strong>표시 한계</strong> 모델 시간은 공급자 실행시간이 아니라 작업 구간 귀속치다. `<synthetic>`과 모델 미확인은 별도 행으로 남겼다. 생성 {data['generatedAt'][:19]}</div></footer></main></body></html>'''

    output_html.parent.mkdir(parents=True, exist_ok=True)
    output_html.write_text(doc, encoding="utf-8")
    print(json.dumps({"html": str(output_html), "json": str(output_json), "pages": 2, "segments": data["metrics"]["segments"], "models": len(models), "tokens": total_tokens, "unclassified": len(unknown)}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument("--output", type=Path, default=DEFAULT_HTML)
    parser.add_argument("--data-output", type=Path, default=DEFAULT_JSON)
    args = parser.parse_args()
    make_report(args.days, args.output, args.data_output)


if __name__ == "__main__":
    main()
