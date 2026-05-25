#!/usr/bin/env bash
# auto-capture-activity.sh — Claude Code Stop hook용
#
# 현재 ISO 주차를 계산해서 그 주의 weekly JSON에 파일시스템 활동을 자동 반영.
# 모든 Claude 세션이 끝날 때마다 호출되어, 어느 프로젝트에서 작업했든
# 대시보드가 자동으로 변경 사항을 포착하도록 함.
#
# 실패해도 세션 흐름에 영향 없도록 errors는 /tmp 로그로만.

set -e

WORKDIR="/Users/jinhyunpark/Documents/cloude_Code/06_Personal_Project/063_workDashboard"
LOG="/tmp/063_auto_capture.log"

# 현재 ISO 주차 — Python으로 안전하게
WEEK_ID=$(/usr/bin/python3 -c "
from datetime import date
y, w, _ = date.today().isocalendar()
print(f'{y}-W{w:02d}')
" 2>>"$LOG")

if [ -z "$WEEK_ID" ]; then
  echo "$(date -u +%FT%TZ) [error] ISO 주차 계산 실패" >> "$LOG"
  exit 0  # Stop hook은 항상 0 종료
fi

WEEKLY_JSON="$WORKDIR/app/src/data/weekly/${WEEK_ID}.json"

if [ ! -f "$WEEKLY_JSON" ]; then
  # 1) draft 생성 (extract-week.mjs는 _drafts/에만 씀)
  cd "$WORKDIR" && /usr/local/bin/node scripts/extract-week.mjs "$WEEK_ID" >> "$LOG" 2>&1 || true
  # 2) draft → weekly 발행본 복사 (_meta 제거). 이게 없으면 fs extractor가 exit 1.
  DRAFT="$WORKDIR/_drafts/${WEEK_ID}_draft.json"
  if [ -f "$DRAFT" ]; then
    /usr/bin/python3 -c "
import json
with open('$DRAFT') as f:
    d = json.load(f)
d.pop('_meta', None)
with open('$WEEKLY_JSON', 'w') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
    f.write('\n')
" >> "$LOG" 2>&1 || true
    echo "$(date -u +%FT%TZ) [auto-publish] ${WEEK_ID}.json stub 발행" >> "$LOG"
  fi
fi

# 파일시스템 활동 캡처
cd "$WORKDIR" && /usr/local/bin/node scripts/extract-from-filesystem.mjs "$WEEK_ID" >> "$LOG" 2>&1 || true

echo "$(date -u +%FT%TZ) [ok] ${WEEK_ID} 캡처 완료" >> "$LOG"
exit 0
