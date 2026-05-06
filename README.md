# 063 workDashboard

> 박진현의 cloude_Code 27 프로젝트의 작업 활동을 주간·월간·연간 단위로 시각화하는 외부 공개 대시보드.

## 구조

```
063_workDashboard/
├── design/
│   ├── foundation/        — Design tokens (062 derived)
│   │   ├── tokens.css
│   │   └── README.md      — 5 design principles
│   ├── v0.1_dashboard_시안.html        — Editorial Navy (기록용)
│   ├── v0.2_dashboard_시안.html        — Foundation 적용 (current home design)
│   ├── v0.3_weekly_index.html
│   ├── v0.3_monthly_detail.html
│   ├── v0.3_project_detail.html
│   └── v0.3_yearly.html
├── app/                   — Next.js 16 + React 19 + Tailwind v4 production app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                 — Home (current week, public)
│   │   │   ├── login/page.tsx
│   │   │   ├── weekly/page.tsx          — protected
│   │   │   ├── monthly/[month]/page.tsx — protected
│   │   │   ├── yearly/[year]/page.tsx   — protected
│   │   │   ├── projects/[id]/page.tsx   — protected
│   │   │   └── api/auth/[...nextauth]/route.ts
│   │   ├── auth.ts                      — NextAuth v5 (GitHub + Credentials)
│   │   ├── middleware.ts                — route protection
│   │   ├── components/
│   │   │   ├── layout/                  — PageShell · Topbar · Footer
│   │   │   ├── charts/                  — 7 ECharts wrappers
│   │   │   ├── FileLink.tsx             — vscode://file/... opener
│   │   │   └── ProjectWorkPanel.tsx     — 3-column work panel
│   │   ├── data/
│   │   │   ├── projects.json            — 21 project meta
│   │   │   ├── weekly/                  — weekly snapshots (SSOT)
│   │   │   └── projects/                — per-project work data
│   │   ├── lib/                         — data loaders, type maps
│   │   ├── types/                       — TypeScript schemas
│   │   └── styles/tokens.css            — mirror of design/foundation
│   └── package.json
└── PROJECT.md             — internal project status
```

## 인증 정책

- **Home (`/`)** — public. 외부에서 메인 대시보드 KPI · 차트 · 의사결정 타임라인 · Active 프로젝트 목록 확인 가능
- **세부 페이지** (`/weekly`, `/monthly/*`, `/yearly/*`, `/projects/*`) — 인증 필요

지원 인증 수단:
1. **GitHub OAuth** — `tb6009` 계정만 화이트리스트 통과
2. **비밀번호** — `DASHBOARD_PASSWORD` env var

## 개발

```bash
cd app
npm install
cp .env.example .env.local       # AUTH_SECRET 등 채우기
npm run dev                      # http://localhost:3000
```

### 필수 환경변수

```
AUTH_SECRET=<openssl rand -base64 32>
AUTH_GITHUB_ID=<GitHub OAuth App Client ID>
AUTH_GITHUB_SECRET=<GitHub OAuth App Client Secret>
ALLOWED_GITHUB_USER=tb6009
DASHBOARD_PASSWORD=<your password>
```

## 배포 (Vercel)

1. GitHub repo 연결
2. Root Directory: `app`
3. 환경변수 등록 (위 5개)
4. GitHub OAuth App callback URL: `https://<your-vercel-url>/api/auth/callback/github`

## 데이터 모델

DB 없음 — 모든 데이터는 `src/data/**/*.json`. 주간 스냅샷이 SSOT (single source of truth), 월간·연간은 주간을 집계만 함. 매주 월요일 빌드 시 새 주간 JSON 생성 (예정: `scripts/build-week.ts`).

## 디자인 시스템

`design/foundation/tokens.css` — 062 논문리더 v0.2에서 추출한 그레이스케일 + warm-gray + 7 type colors. 5가지 원칙: weight = hierarchy / no rounded corners / importance dots / tabular numerals / color is auxiliary.
