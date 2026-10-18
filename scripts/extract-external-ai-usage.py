#!/usr/bin/env python3
"""extract-external-ai-usage.py — Codex(OpenAI)·Gemini(Antigravity) 토큰·비용·이미지 장수를 주간 JSON에 머지

사용: python3 scripts/extract-external-ai-usage.py 2026-W39 [--dry]

- Codex: ~/.codex/sessions/**/*.jsonl 의 response_id별 usage 우선, 구형 로그는 누적 토큰 차분으로 합산.
  input_tokens 는 cached 포함(OpenAI 규약) → 비캐시 = input - cached.
  이미지 장수: ~/.codex/generated_images/<세션>/ 파일 mtime 기준.
- Gemini: ~/.gemini/antigravity*/conversations/*.db (SQLite, gen_metadata protobuf) 를
  스크래치 복사본에서 읽는다. 필드 의미는 공식 문서가 없어 추정:
  1.4.2=비캐시 입력, 1.4.5=캐시 입력, 1.4.3=출력, 1.19=모델명. → 결과에 estimated=true.
- 비용은 모두 API 정가 환산(구독 요금이 아니다). 단가 출처는 PRICING_SOURCE.
- 이미지 1장당 단가는 공식 문서에 없어 비용에 넣지 않는다(장수만).
결과: weekly.externalAI (Claude 비용은 기존 weekly.tokens 그대로).
"""
import json, glob, os, sys, shutil, sqlite3, tempfile, collections, datetime

ROOT = os.path.join(os.path.dirname(__file__), '..')
week = sys.argv[1]; DRY = '--dry' in sys.argv
wpath = os.path.join(ROOT, 'app/src/data/weekly', f'{week}.json')
W = json.load(open(wpath))
start, end = W['range']['from'], (datetime.date.fromisoformat(W['range']['to']) + datetime.timedelta(days=1)).isoformat()
USD_KRW = 1407.89

PRICING_SOURCE = 'developers.openai.com/api/docs/pricing · ai.google.dev/gemini-api/docs/pricing (2026-09-28 확인)'
OPENAI = {'gpt-5.6-sol': (4.0, 0.40, 20.0), 'gpt-6-astra': (10.0, 1.0, 50.0)}          # in, cached, out (short context)
GEMINI = {'gemini-3.8-flash': (0.75, 0.075, 3.75), 'gemini-3.7-flash': (0.75, 0.075, 3.75),
          'gemini-pro-default': (2.0, 0.20, 12.0)}                                   # pro = 3.1 Pro ≤200k 로 가정

def kst_day(iso):
    return (datetime.datetime.fromisoformat(iso.replace('Z', '+00:00')) + datetime.timedelta(hours=9)).date().isoformat()

def cost(p, fresh, cached, out):
    return (fresh * p[0] + cached * p[1] + out * p[2]) / 1e6 if p else 0.0

# ─── Codex ──────────────────────────────────────────
cx = collections.defaultdict(collections.Counter)
cx_day = collections.defaultdict(float)
import importlib.util
spec = importlib.util.spec_from_file_location('codex_records', os.path.join(ROOT, 'scripts/codex-token-records.py'))
records_module = importlib.util.module_from_spec(spec); spec.loader.exec_module(records_module)
if '--records-file' in sys.argv:
    cached=json.load(open(sys.argv[sys.argv.index('--records-file')+1]))
    records=[r for r in cached['records'] if start<=r['day']<end]
    codex_audit=dict(collections.Counter(r['method'] for r in records))
    codex_audit.update(assigned=sum(r['projectId'] is not None for r in records),unassigned=sum(r['projectId'] is None for r in records))
else:
    records, codex_audit = records_module.read_codex(
        [records_module.Path(f) for f in glob.glob(os.path.expanduser('~/.codex/sessions/**/*.jsonl'), recursive=True)], start, end)

project_days = {}
for row in records:
    c = cx[row['model']]
    for key in ('in','cached','out'): c[key] += row[key]
    c['turns'] += 1
    cx_day[row['day']] += cost(OPENAI.get(row['model']), row['in'], row['cached'], row['out'])
    if row['projectId']:
        key = (row['day'],row['projectId'])
        cell = project_days.setdefault(key, {'in':0,'out':0,'cache_read':0,'cache_write':0,'requests':0,'byModel':{},'attribution':[]})
        model_cell=cell['byModel'].setdefault(row['model'],{'in':0,'out':0,'cache_read':0,'cache_write':0,'messages':0})
        for key2, source in [('in','in'),('out','out'),('cache_read','cached')]:
            cell[key2]+=row[source];model_cell[key2]+=row[source]
        cell['requests']+=1;model_cell['messages']+=1
        if row['basis'] not in cell['attribution']:cell['attribution'].append(row['basis'])
W['projectTokenUsage'] = {'codex': [{'date':d,'projectId':p,**v} for (d,p),v in sorted(project_days.items())],
    'audit':codex_audit,'note':'Codex output includes reasoning; cached input is a subset of input, separated here. Same-turn tool-path attribution is an inference. Claude entry.tokens unchanged. Unassigned usage is not distributed.'}

imgs = collections.Counter()
groot = os.path.expanduser('~/.codex/generated_images')
for d in os.listdir(groot) if os.path.isdir(groot) else []:
    dd = os.path.join(groot, d)
    if not os.path.isdir(dd): continue
    for fn in os.listdir(dd):
        t = datetime.datetime.fromtimestamp(os.stat(os.path.join(dd, fn)).st_mtime).date().isoformat()
        if start <= t < end: imgs[t] += 1

# ─── Gemini (Antigravity) ───────────────────────────
def varint(b, i):
    r = s = 0
    while True:
        c = b[i]; i += 1; r |= (c & 0x7f) << s; s += 7
        if c < 0x80: return r, i

def dec(b, depth=0, path=''):
    i, out = 0, []
    try:
        while i < len(b):
            k, i = varint(b, i); f, t = k >> 3, k & 7
            if f == 0 or f > 10000: return None
            if t == 0: v, i = varint(b, i); out.append((path + str(f), v))
            elif t == 1: i += 8
            elif t == 5: i += 4
            elif t == 2:
                l, i = varint(b, i); sub = b[i:i + l]; i += l
                if i > len(b): return None
                try:
                    s = sub.decode('utf-8')
                    if s.isprintable() and len(s) < 120: out.append((path + str(f), s)); continue
                except UnicodeDecodeError: pass
                r = dec(sub, depth + 1, path + str(f) + '.') if depth < 6 else None
                if r is not None: out += r
            else: return None
    except IndexError: return None
    return out

gm = collections.defaultdict(collections.Counter)
gm_audit = collections.Counter()
tmp = tempfile.mkdtemp()
lo = datetime.datetime.fromisoformat(start).replace(tzinfo=records_module.ZoneInfo('Asia/Seoul')).timestamp(); hi = datetime.datetime.fromisoformat(end).replace(tzinfo=records_module.ZoneInfo('Asia/Seoul')).timestamp()
for f in glob.glob(os.path.expanduser('~/.gemini/antigravity*/conversations/*.db')):
    gm_audit['databasesSeen'] += 1
    if os.stat(f).st_mtime < lo:
        gm_audit['olderThanWeek'] += 1; continue
    cp = os.path.join(tmp, os.path.basename(f)); shutil.copy(f, cp)
    db = sqlite3.connect(cp)
    # 대화의 스텝 시각(초)이 주차 범위에 드는 대화만
    ts = [v for (m,) in db.execute('select metadata from steps') for k, v in (dec(m or b'') or [])
          if isinstance(v, int) and 1.7e9 < v < 1.9e9]
    if not ts or not (lo <= min(ts) and max(ts) < hi):
        gm_audit['outsideOrAmbiguousWeek'] += 1
        db.close(); continue  # cross-week conversations cannot be precisely allocated
    for (data,) in db.execute('select data from gen_metadata'):
        d = dict((k, v) for k, v in (dec(data) or []) if k.startswith('1.4.') or k == '1.19')
        m = d.get('1.19')
        if not m: continue
        gm_audit['requestsDecoded'] += 1
        g = gm[m]
        g['in'] += d.get('1.4.2', 0); g['cached'] += d.get('1.4.5', 0); g['out'] += d.get('1.4.3', 0); g['requests'] += 1
    db.close()
shutil.rmtree(tmp)

def block(src, table):
    by = {m: {**c, 'costUSD': round(cost(table.get(m), c['in'], c['cached'], c['out']), 2)} for m, c in src.items()}
    usd = round(sum(v['costUSD'] for v in by.values()), 2)
    return by, usd

cx_by, cx_usd = block(cx, OPENAI)
gm_by, gm_usd = block(gm, GEMINI)
claude_usd = round((W.get('tokens') or {}).get('costUSD', 0), 2)
W['externalAI'] = {
    'codex': {'byModel': cx_by, 'costUSD': cx_usd, 'costByDay': {k: round(v, 2) for k, v in sorted(cx_day.items())}, 'audit': codex_audit,
              'unpricedModels': [m for m in cx if m not in OPENAI],
              'images': sum(imgs.values()), 'imagesByDay': dict(sorted(imgs.items()))},
    'gemini': {'byModel': gm_by, 'costUSD': gm_usd, 'estimated': True, 'audit': dict(gm_audit), 'projectAttribution': 'unavailable', 'unpricedModels': [m for m in gm if m not in GEMINI]},
    'totalUSD': round(claude_usd + cx_usd + gm_usd, 2),
    'totalKRW': round((claude_usd + cx_usd + gm_usd) * USD_KRW),
    'note': '단가는 기존 2026-09-28 표 유지·미재검증. 미등록 모델 비용 제외(0원 의미 아님). Gemini 교차 주간 대화 제외·프로젝트 귀속 미확인. API 정가 환산(구독 요금 아님). Gemini 필드 해석은 추정. 이미지 장당 단가 미확인이라 장수만 표기.',
    'pricingSource': PRICING_SOURCE,
    'costCoverage': 'partial-historical-price-table-not-reverified',
}
print(json.dumps({k: W['externalAI'][k] for k in ('totalUSD', 'totalKRW')}, ensure_ascii=False),
      'claude', claude_usd, 'codex', cx_usd, 'gemini', gm_usd, 'images', sum(imgs.values()))
if not DRY:
    json.dump(W, open(wpath, 'w'), ensure_ascii=False, indent=2); open(wpath, 'a').write('\n')
