import PageShell from '@/components/layout/PageShell';
import PeriodTabs from '@/components/period/PeriodTabs';
import WeekStrip from '@/components/period/WeekStrip';
import PeriodProjectTile from '@/components/period/PeriodProjectTile';
import DailyActivityBar from '@/components/charts/DailyActivityBar';
import {
  loadWeek,
  getCurrentWeekId,
  getProject,
} from '@/lib/data';
import {
  parseWeekId,
  getWeekRange,
  getMonthOfWeek,
  getCurrentWeekId as calCurrentWeekId,
} from '@/lib/calendar';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ w?: string }>;
}

export default async function WeeklyPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // 선택된 주차 = 쿼리스트링 ?w= / 없으면 가장 최근 데이터 있는 주차
  const fallbackWeekId = await getCurrentWeekId();
  const selectedWeekId = sp.w ?? fallbackWeekId;

  const week = await loadWeek(selectedWeekId);
  const todayWeekId = calCurrentWeekId();
  const isCurrentWeek = selectedWeekId === todayWeekId;

  // 현재 월 ID (Topbar 월간 링크용)
  const monthOfSelected = getMonthOfWeek(selectedWeekId) ?? '2026-04';

  return (
    <PageShell active="weekly">
      {/* Period Tabs */}
      <PeriodTabs
        active="week"
        weekHref={`/weekly?w=${selectedWeekId}`}
        monthHref={`/monthly/${monthOfSelected}`}
      />

      {/* Date Strip */}
      <WeekStrip selectedWeekId={selectedWeekId} />

      {week ? (
        <WeekDetail week={week} isCurrentWeek={isCurrentWeek} selectedWeekId={selectedWeekId} />
      ) : (
        <NoData weekId={selectedWeekId} isCurrentWeek={isCurrentWeek} />
      )}
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   Week Detail (선택된 주차 상세)
   ───────────────────────────────────────────────────────────── */

interface WeekDetailProps {
  week: NonNullable<Awaited<ReturnType<typeof loadWeek>>>;
  isCurrentWeek: boolean;
  selectedWeekId: string;
}

function WeekDetail({ week, isCurrentWeek }: WeekDetailProps) {
  const parsed = parseWeekId(week.week);
  const range = parsed ? getWeekRange(parsed.year, parsed.week) : null;
  const fmtRange = range
    ? `${range.fromISO} (월) ─ ${range.toISO} (일)`
    : '';

  // 활동 일수
  const sessionDays = week.daily.filter((d) => d.filesChanged > 0).length;

  // 프로젝트 정렬 (pct 내림차순) — top 10
  const topProjects = [...week.projects].sort((a, b) => b.pct - a.pct).slice(0, 10);

  return (
    <>
      {/* HERO */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--gray-400)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wider)',
            marginBottom: 'var(--sp-2)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          WEEKLY · {week.week}
          {isCurrentWeek ? (
            <span
              style={{
                marginLeft: 8,
                background: 'var(--black)',
                color: 'var(--white)',
                padding: '1px 5px',
                fontSize: 9,
              }}
            >
              CURRENT
            </span>
          ) : null}
        </div>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 300,
            color: 'var(--black)',
            letterSpacing: 'var(--tracking-tight)',
            lineHeight: 1,
            margin: '0 0 var(--sp-2) 0',
          }}
        >
          {week.week}
        </h1>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtRange} · {sessionDays}일 활동
        </div>
        {week.summary ? (
          <p
            style={{
              marginTop: 'var(--sp-3)',
              fontSize: 'var(--text-base)',
              color: 'var(--gray-700)',
              lineHeight: 'var(--leading-relaxed)',
              maxWidth: 720,
            }}
          >
            {week.summary}
          </p>
        ) : null}
      </section>

      {/* KPI */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            border: 'var(--border-1)',
            background: 'var(--gray-200)',
          }}
        >
          <Kpi label="Active 프로젝트" value={week.kpis.activeProjects} meta="이번 주 활동" />
          <Kpi label="세션" value={week.kpis.sessions} meta={`${sessionDays}일 / 7일`} />
          <Kpi label="신규 프로젝트" value={week.kpis.newProjects} meta={week.newProjects.join(' · ') || '—'} />
          <Kpi label="변경 파일" value={week.kpis.filesChanged} meta="md · tsx · html · sql" />
        </div>
      </section>

      {/* Daily Activity */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <SectionHead title="일별 활동 강도" meta="파일 변경 수 · peak = warm-900" />
        <div style={{ background: 'var(--white)', border: 'var(--border-1)', padding: 'var(--sp-4)' }}>
          <DailyActivityBar daily={week.daily} />
        </div>
      </section>

      {/* Top 10 — 1/3·2/3 ptile (week mode) */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <SectionHead
          title="이번 주 프로젝트별 한 일"
          meta={`${week.projects.length}개 활동 · pct 내림차순 · 상위 10`}
        />
        <div>
          {topProjects.map((p) => {
            const meta = getProject(p.id);
            if (!meta) return null;
            const metaLine = p.nextAction ? `NEXT · ${p.nextAction}` : undefined;
            return (
              <PeriodProjectTile
                key={p.id}
                projectId={p.id}
                pct={p.pct}
                imp={p.imp}
                metaLine={metaLine}
                narrative={p.did}
              />
            );
          })}
        </div>
      </section>

      {/* Decisions */}
      {week.decisions.length > 0 ? (
        <section style={{ marginBottom: 'var(--sp-12)' }}>
          <SectionHead
            title="의사결정 · Milestone"
            meta={`${week.decisions.length}건 · ${week.decisions.filter((d) => d.isMilestone).length} milestone`}
          />
          <div>
            {[...week.decisions].sort((a, b) => b.date.localeCompare(a.date)).map((d, i) => {
              const ms = !!d.isMilestone;
              const dateObj = new Date(d.date + 'T00:00:00+09:00');
              const wd = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr',
                    columnGap: 'var(--sp-3)',
                    padding: 'var(--sp-3) var(--sp-4)',
                    background: 'var(--white)',
                    border: '1px solid var(--gray-200)',
                    borderTop: i === 0 ? 'var(--border-1)' : 'none',
                    borderLeft: ms ? '3px solid var(--black)' : '1px solid var(--gray-200)',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', fontFamily: 'var(--font-mono)', paddingTop: 2 }}>
                    {d.date.slice(5)} ({wd})
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--gray-400)' }}>
                      PROJECT {d.projectId}
                      {ms ? ' · MILESTONE' : ''}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--gray-900)',
                        marginTop: 2,
                        lineHeight: 1.3,
                      }}
                    >
                      {ms ? '★ ' : ''}
                      {d.title}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--gray-600)',
                        marginTop: 4,
                        lineHeight: 'var(--leading-relaxed)',
                      }}
                    >
                      {d.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub
   ───────────────────────────────────────────────────────────── */

function NoData({ weekId, isCurrentWeek }: { weekId: string; isCurrentWeek: boolean }) {
  return (
    <div
      style={{
        padding: 'var(--sp-16) var(--sp-12)',
        textAlign: 'center',
        background: 'var(--white)',
        border: 'var(--border-1)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-2xs)',
          fontWeight: 700,
          color: 'var(--gray-400)',
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          marginBottom: 'var(--sp-3)',
        }}
      >
        WEEKLY DATA NOT YET AVAILABLE
      </div>
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--gray-700)', marginBottom: 'var(--sp-4)' }}>
        <strong>{weekId}</strong> {isCurrentWeek ? '— 진행 중인 주차' : '데이터 없음'}.
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', fontFamily: 'var(--font-mono)' }}>
        {isCurrentWeek
          ? '다음 월요일에 /주간업데이트 슬래시 커맨드로 채울 수 있습니다.'
          : `node scripts/extract-week.mjs ${weekId}`}
      </div>
    </div>
  );
}

function Kpi({ label, value, meta }: { label: string; value: number; meta: string }) {
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
        style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 700,
          color: 'var(--black)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 'var(--sp-3)' }}>
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
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingBottom: 'var(--sp-2)',
        borderBottom: '1px solid var(--gray-300)',
        marginBottom: 'var(--sp-3)',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--text-lg)',
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
