# Design Versions — 063 workDashboard

> 시안 누적 기록. 모든 이전 버전은 보존 (영구 누적 원칙).
> 최신 = 가장 위.

---

## v0.6 — Strip Navigation + 1/3·2/3 Tile Layout (2026-05-08)

**파일**: `v0.6_weekly_strip_시안.html`

### 트리거
사용자가 LifeOS Diary의 TODAY/WEEK/MONTH 탭 + 날짜 strip UI를 본 뒤,
"한주씩·한달씩 좌우로 이동하며 보는" 패턴을 dashboard에 적용 요청.

### 변경
- ✨ **상단 탭** — 주 / 월 (Diary의 TODAY/WEEK/MONTH 패턴)
- ✨ **날짜 Strip** — 좌우 화살표 + 7개 셀, 선택된 항목 검정, 오늘 파란 라벨, 미래 회색
- ✨ **주 모드** = 상세 (Hero 3~4줄 요약 + Daily Activity + 프로젝트별 한 일 + 결정사항 풀)
- ✨ **월 모드** = 압축 → 사용자 피드백 후 Top 10 narrative 중심으로 재설계
- 🔄 **월간 레이아웃 v0.6.1**: 좌(narrower) 한 달 요약 2x + 사이드바 / 우(wider) Top 10
- 🔄 **ptile 구조 v0.6.2**: 모든 타일을 **LEFT 1/3 (메타 stacked) + RIGHT 2/3 (서술)** 로 통일
  - 좌측: rank · ID · name · type chip · 95% (큰 숫자) · imp dots · files
  - 우측: narrative 텍스트만

### 사용자 피드백 반영
1. "주차별은 괜찮은데 월간은 top10을 왼쪽으로" → 월간 layout 재구성
2. "한 달 요약 2배 길게, top10 텍스트 2배 길게" → narrative 확장
3. "왼쪽 1/3에 제목+95%, 오른쪽 2/3 설명" → ptile 구조 통일

---

## v0.5 — Compact 4 Pages (2026-05-08)

**파일들** (4개):
- `v0.5_home_compact_시안.html` (홈 / current week)
- `v0.5_weekly_compact_시안.html` (Weekly archive 5-col)
- `v0.5_projects_index_compact_시안.html` (Projects index — v0.2 2-col 패턴)
- `v0.5_project_detail_compact_시안.html` (3컬럼 Work Panel)

### 트리거
v0.4 (Weekly 5-col)의 행간이 너무 길어서 정보 밀도 낮음 + 내용 누락.
사용자: "행간들이 너무 길어서 디자인을 조금 더 컴팩트하고 정보 밀도를 높였으면 좋겠어"

### 변경
- ✨ **컴팩트 톤 전체 적용** — padding 30% 압축, font-size 다운스케일, line-height 1.3~1.35
- ✨ Hero title 50px → 36px
- ✨ Tile padding 16px → 8~10px
- ✨ Min-height 360px → 240px
- ✨ **4개 페이지 시안 풀세트** 작성 (Home·Weekly·Projects·ProjectDetail)
- 🔄 **Projects Index** — 처음에 4-col card 형태로 만들었으나 사용자가 "이전 v0.2 2-col 패턴 그대로" 요청 → v0.2 외부 2열 + 내부 2열 (메타/액션) 패턴으로 재구성
- ✨ W19 (current week)에 061~065 가시화 (데모 데이터)

### 사용자 피드백 반영
1. "이전 스타일을 그대로 했으면 해요" → v0.2 패턴 정확히 복원
2. "061-065 내용들이 안 보여서" → projects.json + W19 데모 데이터 추가

---

## v0.4 — Weekly 5-Column Grid (2026-05-08)

**파일**: `v0.4_weekly_5col_시안.html`

### 트리거
v0.3 weekly_index가 단순 "주차 리스트"였음. 사용자: "월의 주차별로 4컬럼을 만들어서
주차별 프로젝트 이름과 작업 내용만 보면 좋겠어"

### 변경
- ✨ **월별 4 컬럼 그리드** (5주 발생 시 5컬럼 자동) — Thursday rule
- ✨ **주차 컬럼 안에 프로젝트 타일 리스트** (top 5 + "+N more")
- ✨ **이번 주가 맨 위** (최신 → 과거 정렬)
- ✨ **1월 자동 생략** (활동 미미)
- ✨ 4 상태 카드: current(검정) / past(흰) / empty(회색) / future(회색·예정)
- ✨ `did` 필드 추가 (`ProjectContribution.did`) — "이번 주 한 일" 1~2줄

### 사용자 결정
- Q1 (작업 내용 데이터 소스): A — 새 `did` 필드 추가
- Q2 (5주차 처리): A — 5컬럼 자동 통일
- Q3 (셀 내 정렬): B — 상위 5개 + "+N more"

---

## v0.3 — Drilldown 4 Pages (이전 세션)

**파일들** (4개):
- `v0.3_weekly_index.html` (12개월 주차 그리드)
- `v0.3_monthly_detail.html` (5월 상세)
- `v0.3_project_detail.html` (061 LifeOS 상세 — KPI · 기여 추이 · 결정 history · 산출물 표)
- `v0.3_yearly.html` (2026 연간 — stacked area · Gantt · milestone)

### 변경
- ✨ **드릴다운 4종 병렬 제작** — Weekly/Monthly/Yearly/ProjectDetail
- ✨ ECharts 차트 통합 (stacked area · Gantt · pie · bar)
- ✨ 프로젝트 디테일 3컬럼 워크 패널 (현재 상황 · 결과물 · 다음 작업)
- ✨ KPI · 기여 추이 · 결정 history · 산출물 표 패턴 정립

---

## v0.2 — Foundation Tokens Applied (이전 세션)

**파일**: `v0.2_dashboard_시안.html`

### 변경
- ✨ **Foundation tokens 도입** — 062 논문리더 v0.2에서 추출
- ✨ 그레이스케일 + 검정 액센트 (no rounded corner)
- ✨ Weight = hierarchy 원칙
- ✨ Project type 7색 + 좌측 4px 컬러 스트립
- ✨ Warm-gray 차트 bar
- ✨ **외부 2열 그리드 + 내부 2열 (메타 / 다음 액션)** ← 이 패턴이 v0.5/v0.6에서 재사용됨

---

## v0.1 — Editorial Navy (이전 세션, 아카이브)

**파일**: `v0.1_dashboard_시안.html`

### 변경
- 첫 dashboard 시안
- Editorial Navy + Warm Accent 톤 (32 강연시리즈 통일)
- 이후 v0.2부터는 그레이스케일+블랙 톤으로 전환됨
- 톤 비교용 아카이브로 보존

---

## 패턴 진화 요약

| 패턴 | 도입 | 현재 |
|---|---|---|
| Editorial Navy 톤 | v0.1 | v0.1만, 이후 그레이스케일 |
| Foundation tokens | v0.2 | 모든 버전 |
| 좌측 4px 컬러 스트립 (type) | v0.2 | 유지 |
| 외부 2열 + 내부 2열 (메타/액션) | v0.2 | v0.5 Projects, v0.6 |
| 컴팩트 톤 (padding 압축) | v0.5 | 유지 |
| 5-col weekly grid | v0.4 | v0.4만, v0.6에서 strip으로 대체 |
| Strip 날짜 네비 | v0.6 | 현재 |
| 1/3·2/3 ptile (메타/서술) | v0.6.2 | 현재 |

---

## 관련 React 컴포넌트 매핑

| 시안 패턴 | React 컴포넌트 |
|---|---|
| v0.2 외부 2열 ptile | `app/src/components/projects/ActiveProjectTile.tsx` + `ActiveProjectsGrid.tsx` |
| v0.4 5-col WeekColumn | `app/src/components/weekly/WeekColumn.tsx` + `ProjectTile.tsx` |
| 3-Column Work Panel | `app/src/components/ProjectWorkPanel.tsx` |
| **v0.6 Strip Nav** | (아직 React 미반영, 디자인 확정 후 작업 예정) |
| **v0.6 1/3·2/3 ptile** | (아직 React 미반영, 디자인 확정 후 작업 예정) |

---

## 향후 버전 기록 규칙

- 새 버전 = 새 파일 (`vX.Y_*.html`)
- 이전 파일 **삭제·덮어쓰기 금지** (영구 누적)
- 본 문서 (`VERSIONS.md`) 에 변경 사항 기록
- 기록 항목: 트리거 (사용자 요청) · 변경 (✨ 신규 / 🔄 수정) · 사용자 피드백 반영

*매 시안 변경 시 본 문서 갱신 필수*
