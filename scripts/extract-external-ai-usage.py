#!/usr/bin/env python3
"""extract-external-ai-usage.py — Codex(OpenAI)·Gemini(Antigravity) 토큰·비용·이미지 장수를 주간 JSON에 머지

사용: python3 scripts/extract-external-ai-usage.py 2026-W39 [--dry]

- Codex: ~/.codex/sessions/**/*.jsonl 의 token_count.last_token_usage 를 턴 단위로 합산.
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
for f in glob.glob(os.path.expanduser('~/.codex/sessions/*/*/*/*.jsonl')):
    model, prev = '?', None
    for line in open(f, errors='ignore'):
        if '"token_count"' not in line and '"turn_context"' not in line: continue
        try: r = json.loads(line)
        except ValueError: continue
        p = r.get('payload', {})
        if r.get('type') == 'turn_context': model = p.get('model', model); continue
        if p.get('type') != 'token_count' or not p.get('info'): continue
        u = p['info'].get('last_token_usage') or {}
        day = kst_day(r['timestamp'])
        if not (start <= day < end) or u == prev: continue
        prev = u
        c = cx[model]
        fresh = u.get('input_tokens', 0) - u.get('cached_input_tokens', 0)
        c['in'] += fresh; c['cached'] += u.get('cached_input_tokens', 0); c['out'] += u.get('output_tokens', 0); c['turns'] += 1
        cx_day[day] += cost(OPENAI.get(model), fresh, u.get('cached_input_tokens', 0), u.get('output_tokens', 0))

imgs = collections.Counter()
groot = os.path.expanduser('~/.codex/generated_images')
for d in os.listdir(groot):
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
tmp = tempfile.mkdtemp()
lo = datetime.datetime.fromisoformat(start).timestamp(); hi = datetime.datetime.fromisoformat(end).timestamp()
for f in glob.glob(os.path.expanduser('~/.gemini/antigravity*/conversations/*.db')):
    if os.stat(f).st_mtime < lo: continue
    cp = os.path.join(tmp, os.path.basename(f)); shutil.copy(f, cp)
    db = sqlite3.connect(cp)
    # 대화의 스텝 시각(초)이 주차 범위에 드는 대화만
    ts = [v for (m,) in db.execute('select metadata from steps') for k, v in (dec(m or b'') or [])
          if isinstance(v, int) and 1.7e9 < v < 1.9e9]
    if not ts or not (lo <= min(ts) < hi): continue
    for (data,) in db.execute('select data from gen_metadata'):
        d = dict((k, v) for k, v in (dec(data) or []) if k.startswith('1.4.') or k == '1.19')
        m = d.get('1.19')
        if not m: continue
        g = gm[m]
        g['in'] += d.get('1.4.2', 0); g['cached'] += d.get('1.4.5', 0); g['out'] += d.get('1.4.3', 0); g['requests'] += 1
shutil.rmtree(tmp)

def block(src, table):
    by = {m: {**c, 'costUSD': round(cost(table.get(m), c['in'], c['cached'], c['out']), 2)} for m, c in src.items()}
    usd = round(sum(v['costUSD'] for v in by.values()), 2)
    return by, usd

cx_by, cx_usd = block(cx, OPENAI)
gm_by, gm_usd = block(gm, GEMINI)
claude_usd = round((W.get('tokens') or {}).get('costUSD', 0), 2)
W['externalAI'] = {
    'codex': {'byModel': cx_by, 'costUSD': cx_usd, 'costByDay': {k: round(v, 2) for k, v in sorted(cx_day.items())},
              'images': sum(imgs.values()), 'imagesByDay': dict(sorted(imgs.items()))},
    'gemini': {'byModel': gm_by, 'costUSD': gm_usd, 'estimated': True},
    'totalUSD': round(claude_usd + cx_usd + gm_usd, 2),
    'totalKRW': round((claude_usd + cx_usd + gm_usd) * USD_KRW),
    'note': 'API 정가 환산(구독 요금 아님). Gemini 필드 해석은 추정. 이미지 장당 단가 미확인이라 장수만 표기.',
    'pricingSource': PRICING_SOURCE,
}
print(json.dumps({k: W['externalAI'][k] for k in ('totalUSD', 'totalKRW')}, ensure_ascii=False),
      'claude', claude_usd, 'codex', cx_usd, 'gemini', gm_usd, 'images', sum(imgs.values()))
if not DRY:
    json.dump(W, open(wpath, 'w'), ensure_ascii=False, indent=2); open(wpath, 'a').write('\n')
