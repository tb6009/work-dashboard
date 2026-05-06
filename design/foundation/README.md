# 063 workDashboard — Design Foundation

> 본 폴더는 063 작업 대시보드의 디자인 시스템 single source of truth.
> 062_논문리더 v0.2 시안에서 추출·정제. 향후 다른 프로젝트도 본 토큰 import 가능.

---

## 1. 디자인 원칙 5가지

### 1) Weight = Visual Hierarchy
색이 아니라 **폰트 weight + 그레이 단계**로 위계를 만든다.
- 제목 = `--gray-900` + weight 700
- 부제 = `--gray-700` + weight 600
- 본문 = `--gray-500` + weight 400

색은 위계를 만들지 않는다. 컬러로 강조하고 싶으면 **검정**을 쓴다.

### 2) No Rounded Corners
모든 면은 직각. 라운딩은 **원형 점**(importance dots), **pill 태그**에만 사용.
이유: 인쇄물·연구 자료의 정연한 느낌. 디지털 trendy함보다 영속성.

### 3) Importance via Dots
중요도·진척도·강도는 5단계 점으로 표현.
- ●●●●● → ●●●○○ → ○○○○○
- color coding은 보조. dots가 일차 표현.

### 4) Tabular Numerals
모든 숫자는 `font-variant-numeric: tabular-nums` + `letter-spacing: -0.02em`.
대시보드 숫자가 흔들리면 신뢰도가 떨어진다.

### 5) Color is Auxiliary
8색 색 코딩은 **muted/low-saturation**. 카테고리 구분에만 쓰고,
비중·강도는 그레이 단계로 표현. 차트도 그레이 그라데이션 우선.

---

## 2. 토큰 카테고리

| 카테고리 | 토큰 prefix | 용도 |
|---------|------------|-----|
| Grayscale | `--black`, `--gray-{50~900}`, `--white` | 텍스트·면·보더 |
| Color Coding | `--color-{red\|orange\|amber\|green\|blue\|violet\|pink\|slate}` | 카테고리 구분 보조 |
| Spacing | `--sp-{1~16}` | margin·padding·gap (4px base) |
| Typography | `--text-{2xs~4xl}`, `--leading-*`, `--tracking-*` | 폰트 크기·행간·자간 |
| Border | `--border-{1\|2\|strong}` | 면 분리 |
| Shadow | `--shadow-{card\|pop}` | 약한 그림자만 |

---

## 3. 사용법

### HTML 시안 (Phase 1)
```html
<link rel="stylesheet" href="./foundation/tokens.css">
```

### Next.js (Phase 2)
```ts
// app/layout.tsx
import './foundation/tokens.css'
```

또는 Tailwind v4 `@theme` 블록에 토큰 import.

### 헬퍼 클래스
- `.num` — 모든 숫자에 적용
- `.imp-dots` + `.imp-dot[.active][.high]` — 5단계 중요도
- `.chip-{active|paused|archived|new|milestone}` — 라벨 배지

---

## 4. 차트 컬러 규칙

| 컨텍스트 | 컬러 |
|---------|------|
| 일별 활동 bar (기본) | `--warm-500` (#8c7765) — orange-tinted gray |
| 일별 활동 bar (milestone) | `--warm-900` (#2d231b) |
| 비중 그래프 (donut) | 프로젝트 유형 컬러(`--type-*`) 매핑 |
| 그리드·격자 | `--gray-100`, `--gray-50` |
| Tooltip 배경 | `--black` |

순수 검정 대신 warm-gray를 기본으로 — 페이지의 그레이 톤과 살짝 분리되어
숫자가 전면에 떠오르고, 따뜻한 인상을 준다.

ECharts 적용 예시는 v0.2 시안 참조.

---

## 5. 프로젝트 유형 컬러 매핑

타일·차트에서 프로젝트 정체성을 한눈에 보이게 하는 7색 분류.
좌측 4px 컬러 스트립으로 표현 (062 v0.3 패턴 차용).

| 유형 토큰 | 색 | 적용 프로젝트 |
|----------|---|-------------|
| `--type-research`   | red    `#c9918e` | 05 DSAPG · 21 연구논문02 · 51 페르소나 연구 |
| `--type-publishing` | amber  `#bfac7e` | 091 출판 · 09 몸과마음의과학 |
| `--type-education`  | orange `#c4a07a` | 12 Data_Study · 31 촬영 · 32 강연 |
| `--type-product`    | blue   `#8aa8c9` | 10 일상다반사 · 061 LifeOS · 062 논문리더 · 063 workDashboard |
| `--type-design`     | violet `#a593c2` | 03 Data_Jstrata · 06 AI_Design · 11 디자인에이전트 |
| `--type-data`       | green  `#8bb89a` | 03 Data_Once · 08 MNServe · 22 Data_Kaywon |
| `--type-system`     | slate  `#94a0ad` | 00 personal · 04 antigravity · 07 AIDX |

신규 프로젝트는 위 7개 중 하나에 매핑. 어디에도 안 맞으면 `--type-system`.

---

## 5. 참조

- 원본: `../../062_논문리더/design/v0.2_크롬익스텐션_시안.html`
- 적용 시안: `../v0.2_dashboard_시안.html`
- 보존: `../v0.1_dashboard_시안.html` (Editorial Navy 톤, 기록용)
