# GPT 사용 추적 지침

ChatGPT(웹/VS Code 확장)는 로컬에 토큰·비용 로그를 남기지 않으므로, 사용자가 **수동 입력**해야 대시보드에 반영된다.

---

## 1. 트래킹할 정보 (최소)

ChatGPT로 작업을 끝낼 때마다 daily log에 한 줄 추가:

```
projectId / 모델 / 메시지 수(대략) / 작업 시간(분, 대략) / 산출물 위치 또는 한줄 요약
```

예시:
```
065 / GPT-5 / 12 msg / 25 min / 인터뷰 가이드 v0.2 초안
091 / o1 / 4 msg  / 15 min / 챕터 매핑 표 검토
```

> **메시지 수**: 사용자 입력 + AI 응답 합쳐서 라운드 수. 정확하지 않아도 됨, ±2 OK.
> **시간**: 대략적인 체감 시간. 5분 단위로 반올림.

---

## 2. 기록 위치 — 두 곳 중 하나

### (A) 권장: daily log 안에 GPT 섹션
파일: `/Users/jinhyunpark/Documents/cloude_Code/docs/logs/YYYYMMDD_log.md`

```markdown
## GPT 사용 (수동)

- 065 / GPT-5 / 12 msg / 25 min / 인터뷰 가이드 v0.2 초안
- 091 / o1   / 4 msg  / 15 min / 챕터 매핑 표 검토
```

→ Claude Code 세션에서 "오늘 GPT 사용 기록해줘"라고 말하면 이 형식으로 추가하도록 시킬 것.

### (B) 간이: 본인 메모만 (대시보드 미반영)
어디에 적든 본인이 확인 가능한 곳. 단 이 경우 대시보드 토큰 합계에는 안 잡힘.

---

## 3. 비용 산정 방법

ChatGPT는 정액제라 *세션별 정확 비용*은 산출 불가. 다음 두 방법 중 하나:

### 방법 1: 월 정액을 활동 비중으로 분배 (권장)
- ChatGPT Plus: $20/월 = ₩29,400
- ChatGPT Pro:  $200/월 = ₩294,000
- 월말에 daily log의 GPT 메시지 수 합산
- 프로젝트별 비용 = `월 정액 × (프로젝트 메시지 / 전체 메시지)`

### 방법 2: 토큰 추정 단가 (정확하지 않음)
공식 API 단가로 환산하면:
- GPT-5: input $1.25/MTok, output $10/MTok
- o1: input $15/MTok, output $60/MTok
- GPT-4o: input $2.5/MTok, output $10/MTok

→ 메시지 1건 평균 입력 800 tok, 출력 1,500 tok 가정 시:
- GPT-5 1 msg ≈ $0.016 (≈ ₩24)
- o1 1 msg ≈ $0.102 (≈ ₩150)

> 단 Plus/Pro 사용자는 실제 청구액과 무관. 참고치일 뿐.

---

## 4. 대시보드 반영 방법 (선택)

GPT 메시지·시간 정보를 대시보드 weekly JSON에 직접 넣으려면:

`app/src/data/weekly/YYYY-WXX.json` 의 `daily[].entries[]` 안에:

```json
{
  "projectId": "065",
  "did": "...",
  "tokens": { ... Claude 자동 ... },
  "gpt": {
    "model": "gpt-5",
    "messages": 12,
    "minutes": 25,
    "note": "인터뷰 가이드 v0.2 초안"
  }
}
```

→ 향후 `extract-gpt-usage.mjs` 스크립트로 daily log의 `## GPT 사용` 섹션을 자동 파싱해 위 형태로 넣을 수 있음 (미구현).

---

## 5. 실전 워크플로우

ChatGPT로 작업 끝낸 직후:

1. **세션 끝낼 때 30초만 투자** — daily log 열어서 한 줄 추가
2. **귀찮으면 Claude Code에 시킨다**: "오늘 GPT-5로 065 인터뷰 가이드 작업 12 메시지 25분, daily log에 추가해줘"
3. **잊었으면 ChatGPT 사이드바 보기**: VS Code 확장은 스레드 제목·프롬프트 기록은 남으므로, `~/Library/Application Support/Code/User/globalStorage/state.vscdb` 의 `openai.chatgpt` 키에서 역추적 가능

---

## 6. 한계

- ChatGPT 응답 텍스트는 캐시 안 됨 → 출력 토큰은 추정만
- 정액제라 비용은 실측 불가 → 활동 비중 분배가 최선
- 무료 모델/유료 모델 구분: 사용자가 직접 기재해야 함

비용 정밀도는 **Claude Code = 100%, GPT API = 100%, GPT Plus/Pro = 추정 ±30%**.
