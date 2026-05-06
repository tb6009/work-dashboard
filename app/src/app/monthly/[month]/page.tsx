import PageShell from '@/components/layout/PageShell';
import WeeklyTrendLine from '@/components/charts/WeeklyTrendLine';
import TypeBreakdownPie, { TypeSlice } from '@/components/charts/TypeBreakdownPie';
import { loadWeek, getProject } from '@/lib/data';
import { TYPE_COLOR } from '@/lib/projectTypes';
import type { ProjectType } from '@/types/dashboard';

interface MonthlyPageProps {
  params: Promise<{ month: string }>;
}

/* ─────────────────────────────────────────────────────────────────
   Hardcoded data for 2026-05 (per mockup v0.3).
   For other months, render a "no data yet" message.
   ───────────────────────────────────────────────────────────────── */

interface WeekCard {
  id: string;        // '2026-W18'
  short: string;     // 'W18'
  range: string;     // '04-27 ~ 05-03'
  files: number | null;
  topLabel: string;  // 'TOP' | 'UPCOMING'
  topText: string;
  state: 'current' | 'future';
}

const WEEK_CARDS_2026_05: WeekCard[] = [
  {
    id: '2026-W18',
    short: 'W18',
    range: '04-27 ~ 05-03',
    files: 142,
    topLabel: 'TOP',
    topText: '061 LifeOS · product',
    state: 'current',
  },
  { id: '2026-W19', short: 'W19', range: '05-04 ~ 05-10', files: null, topLabel: 'UPCOMING', topText: '데이터 미수집', state: 'future' },
  { id: '2026-W20', short: 'W20', range: '05-11 ~ 05-17', files: null, topLabel: 'UPCOMING', topText: '데이터 미수집', state: 'future' },
  { id: '2026-W21', short: 'W21', range: '05-18 ~ 05-24', files: null, topLabel: 'UPCOMING', topText: '데이터 미수집', state: 'future' },
  { id: '2026-W22', short: 'W22', range: '05-25 ~ 05-31', files: null, topLabel: 'UPCOMING', topText: '데이터 미수집', state: 'future' },
];

interface MilestoneCard {
  date: string;
  weekday: string;
  projectId: string;
  title: string;
  body: string;
  isMilestone?: boolean;
}

const MILESTONES_2026_05: MilestoneCard[] = [
  {
    date: '04-29',
    weekday: '수',
    projectId: '32',
    title: '강연시리즈 트랙 신설',
    body: '단발성 폴더가 아니라 회차별 자산화 트랙으로 승격. K-MOOC(31)와 책임 분리.',
  },
  {
    date: '04-29',
    weekday: '수',
    projectId: '00',
    title: '00_personal 단방향 권한',
    body: '개인 비서 시스템은 다른 폴더에 대해 읽기만 허용. 쓰기 절대 금지.',
  },
  {
    date: '05-01',
    weekday: '금',
    projectId: '51',
    title: '챗봇 4단계 비교 설계',
    body: 'UUID구조화 / UUID서사 / 기본자기입력 / 진 — 4종 시스템프롬프트 v1 확정.',
  },
  {
    date: '05-02',
    weekday: '토',
    projectId: '061',
    title: 'LifeOS 1일 만에 배포',
    body: 'Next.js 16 + Supabase + ChatGPT API. Vercel 배포 완료 (life-os-7wj2).',
    isMilestone: true,
  },
  {
    date: '05-03',
    weekday: '일',
    projectId: '061',
    title: "'하루' 캐릭터 통합",
    body: '진+모미+마음 → 단일 비서 캐릭터. Daily Insight DB 기반 동적화.',
  },
  {
    date: '05-05',
    weekday: '화',
    projectId: '062',
    title: '논문리더 스펙 v0.2',
    body: 'Obsidian + 공유 Supabase + 독립 Next.js 16. 데이터모델 v0.2 확정.',
  },
];

/** Gantt row spec.
 *  start/end indices into [W18, W19, W20, W21, W22] (0..4).
 *  partial: render the W18 (current) bar at 0.45 opacity.
 *  future: future-week bars (idx>0) rendered at 0.45 opacity. */
interface GanttRow {
  id: string;
  name: string;
  type: ProjectType;
  start: number;
  end: number;
  partial: boolean;
  future: boolean;
}

const GANTT_ROWS_2026_05: GanttRow[] = [
  { id: '061', name: 'LifeOS',     type: 'product',    start: 0, end: 4, partial: false, future: true },
  { id: '062', name: '논문리더',     type: 'product',    start: 0, end: 4, partial: false, future: true },
  { id: '051', name: '페르소나',     type: 'research',   start: 0, end: 0, partial: false, future: false },
  { id: '091', name: '출판',        type: 'publishing', start: 0, end: 0, partial: false, future: false },
  { id: '32',  name: '강연시리즈',   type: 'education',  start: 0, end: 0, partial: false, future: false },
  { id: '21',  name: 'CPSF',       type: 'research',   start: 0, end: 0, partial: true,  future: false },
  { id: '05',  name: 'DSAPG',      type: 'research',   start: 0, end: 0, partial: true,  future: false },
  { id: '00',  name: 'personal',   type: 'system',     start: 0, end: 0, partial: false, future: false },
];

const TYPE_BREAKDOWN_2026_05: TypeSlice[] = [
  { name: 'product',    value: 43 },
  { name: 'research',   value: 29 },
  { name: 'publishing', value: 12 },
  { name: 'education',  value: 8 },
  { name: 'system',     value: 5 },
  { name: 'data',       value: 3 },
];

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */

export default async function MonthlyPage({ params }: MonthlyPageProps) {
  const { month } = await params;

  if (month !== '2026-05') {
    return (
      <PageShell active="monthly">
        <div className="crumb-row" style={crumbStyle}>
          <span style={{ color: 'var(--gray-500)' }}>Dashboard</span>
          <span style={{ color: 'var(--gray-300)' }}>/</span>
          <span style={{ color: 'var(--gray-500)' }}>월간</span>
          <span style={{ color: 'var(--gray-300)' }}>/</span>
          <span style={{ color: 'var(--gray-900)', fontWeight: 600 }}>{month}</span>
        </div>
        <div
          style={{
            background: 'var(--white)',
            border: 'var(--border-1)',
            padding: 'var(--sp-12)',
            textAlign: 'center',
            color: 'var(--gray-500)',
            fontSize: 'var(--text-base)',
          }}
        >
          {month} — 데이터 미수집
        </div>
      </PageShell>
    );
  }

  // Pull current week (W18) for any cross-checks (currently used as a guard).
  await loadWeek('2026-W18');

  return (
    <PageShell active="monthly">
      {/* Breadcrumb */}
      <div style={crumbStyle}>
        <span style={{ color: 'var(--gray-500)' }}>Dashboard</span>
        <span style={{ color: 'var(--gray-300)' }}>/</span>
        <span style={{ color: 'var(--gray-500)' }}>월간</span>
        <span style={{ color: 'var(--gray-300)' }}>/</span>
        <span style={{ color: 'var(--gray-900)', fontWeight: 600 }}>2026-05</span>
      </div>

      {/* Hero */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-8)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wider)',
                marginBottom: 'var(--sp-2)',
              }}
            >
              MONTHLY DETAIL
            </div>
            <h1
              className="num"
              style={{
                fontSize: 50,
                fontWeight: 300,
                color: 'var(--black)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1,
                marginBottom: 'var(--sp-2)',
              }}
            >
              2026 · May
            </h1>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-500)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              5주차 (W18 ~ W22) · 30일
            </div>
          </div>
          <div style={{ textAlign: 'right', maxWidth: 320 }}>
            <div
              style={{
                fontSize: 'var(--text-2xs)',
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                marginBottom: 'var(--sp-2)',
              }}
            >
              한 줄 요약
            </div>
            <div
              style={{
                fontSize: 'var(--text-base)',
                color: 'var(--gray-700)',
                fontWeight: 500,
                lineHeight: 'var(--leading-relaxed)',
              }}
            >
              신규 3개 · 배포 1건 · W18 시작점 · 4주 미래
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            border: 'var(--border-1)',
            background: 'var(--gray-200)',
          }}
        >
          <Kpi label="총 변경 파일"  value="142" meta="W18 only · W19~22 미래" />
          <Kpi label="평균 Active"   value="15"  meta="projects / week" />
          <Kpi label="신규 프로젝트" value="3"   meta="32 · 061 · 062" />
          <Kpi label="Milestones"   value="5"   meta="decisions this month" />
        </div>
      </section>

      {/* Week mini-cards */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <SectionHead title="주차별 요약" meta="5주 · 클릭하여 주간 상세로 이동" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 'var(--sp-3)',
          }}
        >
          {WEEK_CARDS_2026_05.map(card => (
            <WeekCardEl key={card.id} card={card} />
          ))}
        </div>
      </section>

      {/* Charts row */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 'var(--sp-5)',
          }}
        >
          <div style={chartCardStyle}>
            <ChartCardHead title="주차별 활동 추이" sub="파일 변경 수 · W18 highlighted" />
            <WeeklyTrendLine data={[142, null, null, null, null]} />
          </div>
          <div style={chartCardStyle}>
            <ChartCardHead title="유형별 비중" sub="% of changes · 5월" />
            <TypeBreakdownPie data={TYPE_BREAKDOWN_2026_05} />
          </div>
        </div>
      </section>

      {/* Project Lifecycle Gantt (HTML/CSS grid) */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div style={chartCardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 'var(--sp-4)',
            }}
          >
            <div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--gray-900)' }}>
                프로젝트 라이프사이클
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                5월 5주간 프로젝트별 활동 구간
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
              {GANTT_ROWS_2026_05.length} active projects
            </div>
          </div>

          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '220px repeat(5, 1fr)',
              borderBottom: 'var(--border-1)',
              paddingBottom: 'var(--sp-2)',
              marginBottom: 'var(--sp-2)',
            }}
          >
            <div style={ganttHeadCellStyle('label')}>PROJECT</div>
            <div style={ganttHeadCellStyle('current')}>W18</div>
            <div style={ganttHeadCellStyle()}>W19</div>
            <div style={ganttHeadCellStyle()}>W20</div>
            <div style={ganttHeadCellStyle()}>W21</div>
            <div style={ganttHeadCellStyle()}>W22</div>
          </div>

          {/* Body rows */}
          <div style={{ borderTop: 'var(--border-1)' }}>
            {GANTT_ROWS_2026_05.map((row, idx) => (
              <GanttRowEl key={row.id} row={row} isLast={idx === GANTT_ROWS_2026_05.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* Decision timeline */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <SectionHead title="의사결정 타임라인" meta={`${MILESTONES_2026_05.length}건 · 5월 전체 · 가로 스크롤`} />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 30,
              height: 1,
              background: 'var(--gray-200)',
            }}
          />
          <div
            style={{
              display: 'flex',
              gap: 'var(--sp-4)',
              overflowX: 'auto',
              paddingBottom: 'var(--sp-4)',
              position: 'relative',
            }}
          >
            {MILESTONES_2026_05.map((m, i) => (
              <TimelineCard key={i} m={m} />
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Sub-components (server-rendered, no interactivity)
   ───────────────────────────────────────────────────────────────── */

function Kpi({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div style={{ background: 'var(--white)', padding: 'var(--sp-5) var(--sp-6)' }}>
      <div
        style={{
          fontSize: 'var(--text-2xs)',
          fontWeight: 600,
          color: 'var(--gray-400)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        {label}
      </div>
      <div
        className="num"
        style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 700,
          color: 'var(--black)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-500)',
          marginTop: 'var(--sp-3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {meta}
      </div>
    </div>
  );
}

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 'var(--sp-5)',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--black)',
          letterSpacing: 'var(--tracking-tight)',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{meta}</div>
    </div>
  );
}

function ChartCardHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 'var(--sp-4)',
      }}
    >
      <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--gray-900)' }}>
        {title}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{sub}</div>
    </div>
  );
}

function WeekCardEl({ card }: { card: WeekCard }) {
  const isCurrent = card.state === 'current';
  const isFuture = card.state === 'future';

  const bg = isCurrent ? 'var(--black)' : isFuture ? 'var(--gray-50)' : 'var(--white)';
  const borderStyle = isFuture ? 'dashed' : 'solid';
  const borderColor = isCurrent ? 'var(--black)' : 'var(--gray-200)';
  const idColor = isCurrent || isFuture ? 'var(--gray-300)' : 'var(--gray-500)';
  const rangeColor = isCurrent ? 'var(--white)' : isFuture ? 'var(--gray-300)' : 'var(--gray-700)';
  const filesColor = isCurrent ? 'var(--white)' : isFuture ? 'var(--gray-300)' : 'var(--black)';
  const filesWeight = isFuture ? 300 : 700;
  const topColor = isCurrent || isFuture ? 'var(--gray-300)' : 'var(--gray-500)';

  return (
    <div
      style={{
        background: bg,
        border: `1px ${borderStyle} ${borderColor}`,
        padding: 'var(--sp-4)',
        minHeight: 140,
        textDecoration: 'none',
        display: 'block',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          color: idColor,
          marginBottom: 'var(--sp-1)',
        }}
      >
        {card.id}
      </div>
      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: rangeColor,
          fontWeight: 500,
        }}
      >
        {card.range}
      </div>
      <div
        className="num"
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: filesWeight,
          color: filesColor,
          marginTop: 'var(--sp-3)',
        }}
      >
        {card.files === null ? (
          '—'
        ) : (
          <>
            {card.files}
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: isCurrent ? 'var(--gray-300)' : 'var(--gray-400)',
                fontWeight: 400,
                marginLeft: 4,
              }}
            >
              files
            </span>
          </>
        )}
      </div>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: topColor,
          marginTop: 'var(--sp-2)',
          lineHeight: 'var(--leading-tight)',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--gray-400)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wide)',
            display: 'block',
            marginBottom: 2,
          }}
        >
          {card.topLabel}
        </span>
        {card.topText}
      </div>
      {isCurrent && (
        <div
          style={{
            display: 'inline-block',
            fontSize: 9,
            fontWeight: 700,
            background: 'var(--white)',
            color: 'var(--black)',
            padding: '1px 6px',
            marginTop: 'var(--sp-2)',
            letterSpacing: 'var(--tracking-wide)',
          }}
        >
          CURRENT
        </div>
      )}
    </div>
  );
}

function GanttRowEl({ row, isLast }: { row: GanttRow; isLast: boolean }) {
  const color = TYPE_COLOR[row.type];
  const project = getProject(row.id);
  const displayName = project?.name ?? row.name;

  // Build 5 cells (W18..W22)
  const cells = [];
  for (let i = 0; i < 5; i++) {
    const inSpan = i >= row.start && i <= row.end;
    const isCurrent = i === 0;

    let bar: React.ReactNode = null;
    if (inSpan) {
      let left = '4%';
      let right = '4%';
      if (row.start === row.end) {
        left = '15%';
        right = '15%';
      } else {
        if (i === row.start) left = '15%';
        if (i === row.end) right = '15%';
        if (i > row.start && i < row.end) {
          left = '0%';
          right = '0%';
        }
      }
      const isFuture = i > 0;
      const partial = (row.partial && i === 0) || isFuture;
      bar = (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            height: 14,
            left,
            right,
            background: color,
            opacity: partial ? 0.45 : 1,
            zIndex: 1,
          }}
        />
      );
    }

    cells.push(
      <div
        key={i}
        style={{
          position: 'relative',
          height: '100%',
          borderLeft: '1px solid var(--gray-100)',
          background: isCurrent ? 'var(--gray-50)' : 'transparent',
        }}
      >
        {bar}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px repeat(5, 1fr)',
        alignItems: 'center',
        height: 36,
        borderBottom: isLast ? 'none' : '1px solid var(--gray-100)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-2)',
          paddingRight: 'var(--sp-3)',
        }}
      >
        <div
          style={{
            width: 4,
            height: 18,
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--gray-400)',
            fontWeight: 500,
            minWidth: 28,
          }}
        >
          #{row.id}
        </span>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-900)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </span>
      </div>
      {cells}
    </div>
  );
}

function TimelineCard({ m }: { m: MilestoneCard }) {
  return (
    <article style={{ flexShrink: 0, width: 248 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-3)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        <div
          style={{
            width: m.isMilestone ? 13 : 11,
            height: m.isMilestone ? 13 : 11,
            borderRadius: '50%',
            background: m.isMilestone ? 'var(--black)' : 'var(--gray-700)',
            boxShadow: '0 0 0 4px var(--gray-100)',
          }}
        />
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-500)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {m.date} ({m.weekday})
        </div>
      </div>
      <div
        style={{
          background: 'var(--white)',
          border: m.isMilestone ? '1px solid var(--black)' : 'var(--border-1)',
          padding: 'var(--sp-4)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-2xs)',
            fontWeight: 600,
            color: m.isMilestone ? 'var(--black)' : 'var(--gray-500)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wide)',
            marginBottom: 'var(--sp-2)',
          }}
        >
          PROJECT {m.projectId}
          {m.isMilestone ? ' · MILESTONE' : ''}
        </div>
        <h3
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            color: 'var(--gray-900)',
            marginBottom: 'var(--sp-2)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          {m.title}
        </h3>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-500)',
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          {m.body}
        </p>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Style helpers
   ───────────────────────────────────────────────────────────────── */

const crumbStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--sp-2)',
  fontSize: 'var(--text-xs)',
  color: 'var(--gray-500)',
  marginBottom: 'var(--sp-6)',
  fontFamily: 'var(--font-mono)',
};

const chartCardStyle: React.CSSProperties = {
  background: 'var(--white)',
  border: 'var(--border-1)',
  padding: 'var(--sp-6)',
};

function ganttHeadCellStyle(variant?: 'label' | 'current'): React.CSSProperties {
  return {
    fontSize: 'var(--text-2xs)',
    color: variant === 'current' ? 'var(--black)' : 'var(--gray-400)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-wide)',
    textAlign: variant === 'label' ? 'left' : 'center',
  };
}
