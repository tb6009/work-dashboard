# 063 workDashboard

> 한 줄 정의: cloude_Code 27 프로젝트의 주간·월간·연간 작업 활동을 시각화하는 외부 공개 대시보드
> 상태: 🟢 active
> 최종 업데이트: 2026-05-09

---

## 1. 목적

- 박진현의 작업 활동을 **주간/월간/연간 누적 시각화**로 외부에 공개 가능한 형태로 제공
- 운영가이드 §9의 마크다운 리포트 체계와 **공존**하면서 시각화 레이어로 보강
- 강연·논문·심사·교수 평가 자료로 그대로 활용 가능한 포트폴리오 사이트

## 2. 현재 상태

- **Foundation 정의 완료** — `design/foundation/tokens.css` + `README.md`
  - 062_논문리더 v0.2에서 추출. 그레이스케일 + 검정 액센트, weight = hierarchy, no rounded
- **v0.2 시안 완성** — `design/v0.2_dashboard_시안.html`
  - foundation 적용. Active 프로젝트는 외부 2열 그리드 + 카드 내부 좌(메타) 우(Next) 2컬럼
  - 프로젝트 유형 컬러 7색 + 좌측 4px 스트립 + warm-gray bar 적용
- **v0.3 드릴다운 4개 페이지 병렬 제작 완료**
  - `v0.3_weekly_index.html` — 12개월 그룹 주차 그리드 (현재 W18 강조)
  - `v0.3_monthly_detail.html` — 5월 상세 (KPI · 주별 추이 · Gantt · 결정 타임라인)
  - `v0.3_project_detail.html` — 061 LifeOS 상세 (KPI · 기여 추이 · 결정 history · 산출물 표)
  - `v0.3_yearly.html` — 2026 연간 (12개월 그리드 · stacked area · Gantt · milestone)
- **v0.1 보존** — `design/v0.1_dashboard_시안.html` (Editorial Navy 톤, 기록용)
- **v0.4 시안** — `design/v0.4_weekly_5col_시안.html` (주간 5열 레이아웃)
- **v0.5 시안 4종** — compact 리디자인 (home, weekly, projects index, project detail)
- **v0.6 시안 2종** — strip nav + home/weekly 시안

### Phase 2 — Next.js 16 앱 구축 완료 (2026-05-05/06)

- **스택**: Next.js 16.2.4 + React 19.2.4 + Tailwind v4 + TypeScript (LifeOS와 동일)
- **위치**: `app/` (src dir, App Router, ECharts npm)
- **6개 라우트 모두 200 OK**:
  - `/` — 홈 = 현재 주간 (Dynamic)
  - `/weekly` — 전체 주간 인덱스 (Dynamic)
  - `/monthly/[month]` — 월간 상세 (Dynamic, 현재 2026-05 데이터)
  - `/yearly/[year]` — 연간 (Dynamic, 현재 2026 데이터)
  - `/projects` — 프로젝트 인덱스 (Dynamic)
  - `/projects/[id]` — 프로젝트 상세 (Dynamic, 061 LifeOS 데이터)
- **공통 컴포넌트**: `PageShell` / `Topbar` / `Footer`
- **프로젝트 컴포넌트**: `ActiveProjectsGrid` / `ActiveProjectTile`
- **주간 컴포넌트**: `WeekColumn` / `ProjectTile`
- **데이터 레이어**: `types/dashboard.ts` 스키마 + `data/projects.json` + `data/weekly/2026-W18.json` + `data/projects/*.json` (17개) + `lib/data.ts` loader
- **차트 컴포넌트** (`'use client'` ECharts wrapper): `DailyActivityBar`, `ProjectPie`, `WeeklyTrendLine`, `TypeBreakdownPie`, `WeeklyContributionBar`, `TypeStackedArea`, `ProjectGantt`
- **Foundation 통합**: `src/styles/tokens.css`(미러) → `globals.css`에서 `@import` + vtimeline/deliv/related 컴포넌트 스타일 추가
- **Dev 서버**: `npm run dev` (`http://localhost:3001`, port 3000 점유 시 자동 swap)
- 데이터: 2026-W18 (04-27 ~ 05-03) 하드코딩 1주분
- 자동화·라우팅·드릴다운 미구현

### Phase 3 — Vercel 배포 (2026-05-08)

- **Vercel CLI 배포 완료** — `work-dashboard-app` 프로젝트
- **Production URL**: `https://work-dashboard-app.vercel.app`
- **GitHub repo**: `tb6009/work-dashboard` (main 브랜치)
- **GitHub 자동 배포**: 연결됨, 단 Root Directory 설정 필요 (`app`)
- **현재 이슈**: GitHub → Vercel 자동 배포 시 Root Directory 미설정으로 빌드 실패 → Vercel 웹 대시보드에서 `work-dashboard-app` > Settings > General > Root Directory = `app` 설정 필요

## 3. 다음 액션

- [x] **프로젝트 detail JSON 16개 추가** (2026-05-06) — 22개 중 20개 완비 (00 폴더 부재로 스킵)
- [x] **주간 업데이트 인프라 구축** (2026-05-06)
  - `scripts/extract-week.mjs` — Tier 1 자동 추출 (Node.js)
  - `.claude/commands/주간업데이트.md` — Tier 2 Claude 슬래시 커맨드
  - `docs/주간업데이트_가이드.md` — 표준 절차 문서
- [x] **v0.5 UI 컴팩트 리디자인** (2026-05-07) — 시안 4종 + 앱 반영
- [x] **v0.6 strip nav + monthly narrative** (2026-05-08) — 시안 2종 + 앱 반영
- [x] **Vercel 배포 + URL 확보** (2026-05-08) — `https://work-dashboard-app.vercel.app`
- [ ] **Vercel GitHub 자동 배포 수정** — Root Directory = `app` 설정 (Vercel 웹 대시보드)
- [ ] `data/weekly/*.json` 지난 4주(W14~W17) 소급 생성 — `extract-week.mjs` 사용
- [ ] Claude cron으로 매주 월요일 09:00 자동 빌드 (`schedule` 스킬)
- [ ] Phase 4 — Monthly·Yearly 집계 자동화

## 3-1. 주간 업데이트 절차 요약

매주 월요일 약 15~20분:

```bash
# 1. 자동 추출 (1분)
node scripts/extract-week.mjs 2026-WXX

# 2. Claude 보강 (10분) — VS Code에서 063_workDashboard 열고
/주간업데이트 2026-WXX

# 3. 검토 + 배포 (5분)
cd app && npm run dev    # 시각 확인
git add . && git commit -m "weekly: 2026-WXX" && git push
```

상세는 `docs/주간업데이트_가이드.md` 참조.

## 4. 작업 규칙·경계

- 데이터 파일(`data/**/*.json`) **삭제·덮어쓰기 절대 금지** (운영가이드 §9.6 영구 보존 룰)
- 빌드 스크립트는 **새 파일 생성만** 허용
- 개인정보 보호: `00_personal/data/`, `00_personal/reports/일간~월간/` **자동 제외** (allowlist 방식)
- 학생/연구 참여자 데이터는 명시적 허용 없으면 노출 금지
- 산출물 본문은 노출 금지 (파일명·타이틀까지만)

## 5. 관련 프로젝트

- 관리 마스터(루트): `PROJECTS.md`, `docs/logs/*.md`, `docs/reports/*.md` 를 데이터 소스로 읽음 (read-only)
- 32_강연시리즈: 동일한 Editorial Navy 디자인 톤 공유
- 062_논문리더: 별도 트랙. 의존성 없음

## 6. 참고 문서

- `.claude/CLAUDE.md` — AI 행동 규칙
- `design/v0.1_dashboard_시안.html` — 현재 시안
- `../docs/관리_운영가이드.md` §9 — 리포팅 체계
