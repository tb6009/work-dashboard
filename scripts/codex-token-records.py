"""Read usage metadata only; do not persist prompts or tool outputs."""
import json,re,unicodedata,collections
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
FIELDS=('input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens','total_tokens')
ROOT=Path(__file__).resolve().parents[3]

def day_of(stamp):
    return datetime.fromisoformat(stamp.replace('Z','+00:00')).astimezone(ZoneInfo('Asia/Seoul')).date().isoformat()

def project_paths():
    registry=json.loads((ROOT/'06_Personal_Project/063_workDashboard/app/src/data/projects.json').read_text())
    ids={x['id'] for x in registry if x['id'] not in ('00','104')}
    aliases={'03_school_project/02_RISE':'039','03_school_project/RISE':'039','05_phD_Research/00_연구가이드':'0500','02_Communication_Kaywon':'021','01_admin':'01','02_Data_Kaywon':'02','03_school_project':'03','09_몸과마음의과학':'09','11_omx_wiki':'11'}
    for category in ROOT.iterdir():
        if not category.is_dir() or not re.match(r'^\d\d_',category.name):continue
        for p in category.iterdir():
            m=re.match(r'^(\d+)[_ ]',p.name)
            if p.is_dir() and m and m[1] in ids:aliases.setdefault(str(p.relative_to(ROOT)),m[1])
    return sorted(aliases.items(),key=lambda x:-len(x[0]))

def mapped(path,aliases):
    path=unicodedata.normalize('NFC',str(path)).rstrip('/')
    root=str(ROOT)+'/'
    if not path.startswith(root) or '104_맨프레드' in path:return None
    rel=path[len(root):]
    return next((pid for prefix,pid in aliases if rel==prefix or rel.startswith(prefix+'/')),None)

def read_codex(files,start,end,aliases=None):
    aliases=aliases if aliases is not None else project_paths()
    rows=[];seen=set();audit=collections.Counter()
    for path in sorted(files):
        records=[];model='unknown';cwd=None;project=None;basis='unassigned';previous=None;turn='initial';turn_projects=collections.defaultdict(set)
        for line in path.read_text(errors='replace').splitlines():
            if not any(tag in line[:1500] for tag in ('session_meta','turn_context','token_usage_record','token_count','response_item')):continue
            if any(tag in line[:1500] for tag in ('custom_tool_call_output','function_call_output','\"role\": \"assistant\"')):continue
            try:r=json.loads(line)
            except ValueError:audit['invalidJSON']+=1;continue
            p=r.get('payload') or {};typ=r.get('type')
            if not isinstance(p,dict):continue
            if typ in ('session_meta','turn_context'):
                cwd=p.get('cwd',cwd);model=p.get('model',model)
                turn=p.get('turn_id') or p.get('id') or turn
                pid=mapped(cwd,aliases)
                if pid:project=pid;basis='cwd'
            if typ=='response_item' and p.get('type') in ('custom_tool_call','function_call'):
                text=unicodedata.normalize('NFC',str(p.get('input') or p.get('arguments') or ''))
                for prefix,pid in aliases:
                    if '/' in prefix and re.search(r'(?<![\w])'+re.escape(prefix)+r'(?=/|[\s\"\'`]|$)',text):turn_projects[turn].add(pid)
            r['_usageTurn']=p.get('turn_id') or turn
            # Read only explicit workspace paths from user instructions. Never retain text.
            if typ=='response_item' and p.get('role')=='user':
                ids=set()
                for block in p.get('content',[]):
                    if not isinstance(block,dict):continue
                    text=block.get('text','')
                    # Exclude injected environment/AGENTS contexts from attribution.
                    if text.startswith(('# AGENTS.md','<environment_context>')):continue
                    for match in re.finditer(re.escape(str(ROOT)) + r'/[^\n<>"`]+',text):
                        pid=mapped(match[0],aliases)
                        if pid:ids.add(pid)
                if len(ids)==1:project=ids.pop();basis='explicit-user-path'
                elif len(ids)>1:project=None;basis='ambiguous-user-paths'
            if typ=='token_usage_record' and p.get('response_id') and isinstance(p.get('usage'),dict):
                records.append((r,p['usage'],p['response_id'],model,project,basis,'response-id'))
            elif typ=='event_msg' and p.get('type')=='token_count':
                total=(p.get('info') or {}).get('total_token_usage')
                if not isinstance(total,dict):continue
                current={k:int(total.get(k,0) or 0) for k in FIELDS}
                delta={k:(current[k]-previous[k] if previous is not None and current[k]>=previous[k] else current[k]) for k in FIELDS}
                previous=current
                records.append((r,delta,None,model,project,basis,'cumulative-delta'))
        # A rollout with response records uses only those, never its mirrored cumulative events.
        preferred=any(x[-1]=='response-id' for x in records)
        for r,u,rid,model,pid,basis,method in records:
            if preferred and method!='response-id':continue
            if rid and rid in seen:audit['duplicateResponses']+=1;continue
            if rid:seen.add(rid)
            if not pid and len(turn_projects[r['_usageTurn']])==1:
                pid=next(iter(turn_projects[r['_usageTurn']]));basis='same-turn-tool-path-inference'
            stamp=r.get('timestamp')
            if not stamp:continue
            day=day_of(stamp)
            if not start<=day<end:continue
            if not any(u.values()):continue
            cached=max(0,int(u.get('cached_input_tokens',0)));inp=max(0,int(u.get('input_tokens',0)))
            out=max(0,int(u.get('output_tokens',0)));reason=max(0,int(u.get('reasoning_output_tokens',0)))
            rows.append({'day':day,'model':model,'projectId':pid,'basis':basis,'method':method,'in':max(0,inp-cached),'cached':cached,'out':out,'reasoning':reason,'total':int(u.get('total_tokens',inp+out)),'responseId':rid})
            audit[method]+=1;audit['assigned' if pid else 'unassigned']+=1
    return rows,dict(audit)
