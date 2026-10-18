# GPT/Codex·Gemini 토큰 재계산 — 2026-10-13

## 변경

기존 extract-external-ai-usage.py는 Codex의 last_token_usage 값이 직전 값과 같으면 제외했다. 동일한 토큰 수를 쓴 서로 다른 응답을 누락할 수 있었다. 현재 로그의 token_usage_record.response_id를 우선 사용하고, 구형 로그에만 total_token_usage 누적 차분을 사용하도록 수정했다. 두 형태를 동시에 더하지 않는다.

중복 response_id를 제거한다. 캐시 입력은 전체 입력의 부분집합이므로 비캐시 입력과 분리한다. 출력에는 reasoning이 포함되며 reasoning을 다시 더하지 않는다. 날짜는 Asia/Seoul로 변환한다.

cwd와 명시적 사용자 경로로 프로젝트를 연결한다. 연결되지 않은 응답은 같은 턴의 도구 호출 경로가 단일 프로젝트를 가리킬 때 추정 귀속한다. 이 경우 attribution에 same-turn-tool-path-inference를 저장한다. 복수 프로젝트·근거 없음은 미귀속으로 유지한다. 03_school_project/02_RISE는 명시적 039 매핑을 우선한다.

## 저장과 자동 실행

Claude daily.entries[].tokens는 수정하지 않는다. GPT/Codex는 weekly.projectTokenUsage.codex에 프로젝트·날짜·모델별로 별도 저장한다. externalAI.codex는 미귀속을 포함한 전체 수집량이다. 전체 externalAI와 프로젝트 부분합을 다시 합산하지 않는다.

auto-capture-activity.sh는 Claude 수집 후 외부 AI 수집기를 실행한다. 재실행하면 수집 결과를 교체하므로 누적 중복을 만들지 않는다. 기존 W40–W42는 _backups/token_recalculation_20261013에 보존했다.

```sh
python scripts/test-codex-token-records.py
python scripts/extract-external-ai-usage.py 2026-W42 --dry
python scripts/extract-external-ai-usage.py 2026-W42
```

scripts 기준 작업 위치는 063_workDashboard다. --records-file은 한 번 수집한 메타데이터의 여러 주간 집계에 사용한다. 프롬프트·도구 출력 본문은 결과 파일에 저장하지 않는다.

## 재계산 범위와 결과

이번 재계산은 RISE 제작 기간 W40–W42에 적용했다. 그 이전 주차는 변경하지 않았다.
RISE의 Codex 출력 토큰은 W41 485,529개, W42 51,176개, 합계 536,705개다. 일부는 같은 턴의 파일 경로로 추정 귀속한 값이다. 비용이나 실제 작업시간이 아니다.
시각화는 Claude 출력 토큰과 Codex 프로젝트별 출력 토큰만 합산한다. 세션 전체 tokens 합은 원의 면적으로 사용하지 않는다.

## Gemini 확인

로컬 Antigravity conversations DB 30개를 발견했다. 복사본의 gen_metadata를 읽는다. W41에서 24개 요청의 입력 345,859·캐시 1,433,586·출력 23,240을 해석했다. protobuf 필드 의미는 기존 역해석에 기반한 추정이며 공식 usageMetadata로 검증한 값이 아니다. GPT와 같은 확정 수준으로 취급하지 않는다.

W42에서는 해당 주간 기록을 확보하지 못했다. 0 사용으로 단정하지 않는다. 프로젝트별 귀속도 미확인이다. Gemini는 RISE 원 면적에 더하지 않았다. 여러 주차에 걸친 대화는 요청별 시각을 확정할 수 없어 주간 배분에서 제외한다. 현재 수집기에서 그 제외 수를 audit에 기록한다.

GPT는 로컬 Codex 로그 범위다. ChatGPT 웹·모바일·다른 API 계정의 전체 사용량을 포함한다고 주장하지 않는다. Gemini 웹·모바일도 로컬 Antigravity DB 범위 밖이다.

## 비용 한계

기존 2026-09-28 가격표는 이번에 재검증하지 않았다. 미등록 모델 비용은 계산에서 빠져 있으며 0원이라는 뜻이 아니다. externalAI의 금액은 부분 추정값이다. costCoverage와 unpricedModels를 함께 확인한다. 실제 청구 비용·구독 요금으로 사용하지 않는다.

## 검증

6개 테스트: 응답 중복·누적값 중복·캐시·한국시간 경계·RISE 매핑 우선·단일 턴 경로 추정·미귀속 보존을 확인했다. 실제 W40–W42 재계산을 수행했다.

## 도구별 표현 제안 — 미적용

프로젝트 유형 색상을 유지한다. 원의 테두리에 GPT·Claude·Gemini의 고정 세 구간을 두고 확인된 사용 구간만 표시한다. 미확인과 미사용은 구분한다. 작은 원에는 간단한 기호 또는 확대 시 표시를 사용한다. 서로 다른 수집 범위가 맞춰지기 전에는 구간 길이를 토큰 점유율로 해석하지 않는다. 번호 코어는 유지한다.
