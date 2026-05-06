# 063 workDashboard — AI 작업 지침

## 시작 시 필독
세션 시작 시 같은 폴더의 `PROJECT.md` 를 먼저 읽고 현재 맥락을 파악할 것.

## 프로젝트 정체
cloude_Code 27 프로젝트의 작업 활동을 시각화하는 외부 공개 대시보드. 운영가이드 §9의 마크다운 리포트와 공존.

## 작업 규칙

1. 데이터 파일(`data/**/*.json`) 삭제·덮어쓰기 금지 — 영구 누적
2. 빌드 스크립트는 새 파일 생성만 허용. 기존 파일은 read-only 검증
3. 외부 폴더(`../docs/logs/`, `../PROJECTS.md`, `../*/PROJECT.md`)는 read-only
4. 산출물은 `design/`(시안), `app/`(Next.js), `data/`(JSON), `docs/`(문서)
5. 파일 삭제·덮어쓰기 전 사용자 확인 필수

## 개인정보 차단 (절대 규칙)

파서·렌더러는 다음을 **자동 제외**:
- `00_personal/data/**`
- `00_personal/reports/daily/**`, `reports/weekly/**`, `reports/monthly/**`
- 학생/연구 참여자 raw 데이터
- 산출물 본문 (파일명만 노출)

allowlist 방식: 기본 제외, 명시적으로 허용된 경로만 노출.

## 출력 규약

- 디자인 톤: Editorial Navy (#1A2B4A) + Warm Accent (#C9A96E) + Sage (#7C9885)
  → 32_강연시리즈와 통일
- 한국어 typography: Pretendard
- 차트: ECharts (Phase 1 CDN, Phase 2 npm)
- 모든 차트는 데이터 출처 표기 필수

## 경계

- 마크다운 리포트(`../docs/reports/*.md`) 작성은 본 프로젝트 책임 아님
  → 운영가이드 §9 따라 별도 생성. 063은 시각화만.
- 062_논문리더와 무관
