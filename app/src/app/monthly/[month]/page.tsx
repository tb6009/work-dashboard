import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import PeriodTabs from '@/components/period/PeriodTabs';
import MonthStrip from '@/components/period/MonthStrip';
import PeriodProjectTile from '@/components/period/PeriodProjectTile';
import {
  loadMonth,
  loadWeek,
  loadProjectWork,
  getProject,
  getCurrentWeekId,
} from '@/lib/data';
import {
  parseMonthId,
  getMonthLabel,
  getWeeksOfMonth,
  parseWeekId,
  getWeekRange,
  getCurrentMonthId,
} from '@/lib/calendar';
import { TYPE_COLOR } from '@/lib/projectTypes';
import TokenSummary from '@/components/TokenSummary';
import { aggregateWeeks } from '@/lib/tokens';
import type { ProjectType, WeeklySnapshot, MonthlyRetro } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ month: string }>;
}

export default async function MonthlyPage({ params }: PageProps) {
  const { month } = await params;
  const parsed = parseMonthId(month);
  const currentMonthId = getCurrentMonthId();
  const currentWeekId = await getCurrentWeekId();

  if (!parsed) {
    return (
      <PageShell active="monthly">
        <div style={{ padding: 'var(--sp-16)', textAlign: 'center' }}>
          잘못된 월 형식: <code>{month}</code> (예: 2026-05)
        </div>
      </PageShell>
    );
  }

  const monthly = await loadMonth(month);
  const ml = getMonthLabel(month);
  const weekIds = getWeeksOfMonth(month);
  const weeks = await Promise.all(weekIds.map(loadWeek));
  const isCurrentMonth = month === currentMonthId;

  // 그 달 weekly에서 프로젝트별 did + 파일 수 집계
  const projectDids = new Map<string, string[]>();
  const projectFiles = new Map<string, number>();
  for (const w of weeks) {
    if (!w) continue;
    for (const p of w.projects) {
      if (p.did) {
        const list = projectDids.get(p.id) ?? [];
        if (!list.includes(p.did)) list.push(p.did);
        projectDids.set(p.id, list);
      }
      projectFiles.set(p.id, (projectFiles.get(p.id) ?? 0) + p.filesChanged);
    }
  }

  // 그 달 milestone — 프로젝트별 최대 1건
  const projectMilestones = new Map<string, { date: string; title: string; description: string }>();
  if (monthly) {
    for (const m of monthly.milestones) {
      if (!projectMilestones.has(m.projectId)) {
        projectMilestones.set(m.projectId, { date: m.date, title: m.title, description: m.description });
      }
    }
  }

  // top 10 ID 미리 계산해서 detail JSON 병렬 로드
  const top10Ids = [...projectFiles.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);
  const projectWorks = await Promise.all(top10Ids.map(loadProjectWork));
  const projectWorkMap = new Map(top10Ids.map((id, i) => [id, projectWorks[i]]));

  /** 풍부한 monthly narrative 빌더 — detail JSON + weekly did + milestone 합성 */
  function buildNarrative(pid: string): string {
    const work = projectWorkMap.get(pid);
    const dids = projectDids.get(pid) ?? [];
    const milestone = projectMilestones.get(pid);
    const parts: string[] = [];

    // 1) milestone (가장 강력한 시그널)
    if (milestone) {
      parts.push(`★ ${milestone.date.slice(5)}: ${milestone.title} — ${milestone.description}`);
    }

    // 2) detail JSON의 currentSituation (메인 narrative)
    if (work?.currentSituation.summary) {
      parts.push(work.currentSituation.summary);
    }
    if (work?.currentSituation.phase) {
      parts.push(`(${work.currentSituation.phase})`);
    }

    // 3) 그 달 weekly did (요약, 중복 제거)
    if (dids.length > 0) {
      parts.push(dids.join(' '));
    }

    // 4) recentLogs excerpt (있으면 1건만)
    const log = work?.currentSituation.recentLogs?.[0];
    if (log?.excerpt) {
      parts.push(`최근: ${log.excerpt}`);
    }

    // 5) blockers
    if (work?.currentSituation.blockers && work.currentSituation.blockers.length > 0) {
      parts.push(`블로커: ${work.currentSituation.blockers.join(' / ')}`);
    }

    return parts.join(' ');
  }

  // type 분포 계산 (optional)
  const typeBreakdown: Record<ProjectType, number> = {
    research: 0,
    publishing: 0,
    education: 0,
    product: 0,
    design: 0,
    data: 0,
    system: 0,
  };
  for (const [pid, files] of projectFiles) {
    const meta = getProject(pid);
    if (meta) typeBreakdown[meta.type] += files;
  }

  return (
    <PageShell active="monthly">
      {/* Period Tabs */}
      <PeriodTabs
        active="month"
        weekHref={`/weekly?w=${currentWeekId}`}
        monthHref={`/monthly/${month}`}
      />

      {/* Date Strip */}
      <MonthStrip selectedMonthId={month} />

      {monthly ? (
        <MonthDetail
          month={month}
          year={parsed.year}
          monthLabel={ml}
          isCurrentMonth={isCurrentMonth}
          monthly={monthly}
          weekIds={weekIds}
          weeks={weeks}
          currentWeekId={currentWeekId}
          projectFiles={projectFiles}
          typeBreakdown={typeBreakdown}
          buildNarrative={buildNarrative}
        />
      ) : (
        <NoData month={month} />
      )}
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   Month Detail (LEFT 1fr 사이드 + RIGHT 2fr Top 10)
   ───────────────────────────────────────────────────────────── */

interface MonthDetailProps {
  month: string;
  year: number;
  monthLabel: ReturnType<typeof getMonthLabel>;
  isCurrentMonth: boolean;
  monthly: NonNullable<Awaited<ReturnType<typeof loadMonth>>>;
  weekIds: string[];
  weeks: Array<Awaited<ReturnType<typeof loadWeek>>>;
  currentWeekId: string;
  projectFiles: Map<string, number>;
  typeBreakdown: Record<ProjectType, number>;
  buildNarrative: (pid: string) => string;
}

function MonthDetail({
  month,
  year,
  monthLabel,
  isCurrentMonth,
  monthly,
  weekIds,
  weeks,
  currentWeekId,
  projectFiles,
  typeBreakdown,
  buildNarrative,
}: MonthDetailProps) {
  // top 10 — projectFiles 기준 정렬
  const top10 = [...projectFiles.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // 총 파일 (sum)
  const totalFilesChanged = monthly.aggregated.totalFiles;

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
          MONTHLY · {month}
          {isCurrentMonth ? (
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
          {monthLabel?.name} · {year}
        </h1>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {weekIds.length} weeks · {weeks.filter((w) => w !== null).length} weeks 데이터 있음 · {totalFilesChanged} files
          {weekIds.length === 5 ? ' · 5-WEEK' : ''}
        </div>
        <TokenSummary
          tokens={aggregateWeeks(weeks.filter((w): w is WeeklySnapshot => w !== null))}
          scopeLabel={`${month} 월간`}
        />
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
          <Kpi label="총 변경 파일" value={monthly.aggregated.totalFiles} meta={`${weekIds.length} weeks 합산`} />
          <Kpi label="평균 Active" value={monthly.aggregated.avgActive} meta="weekly 평균" />
          <Kpi label="신규 프로젝트" value={monthly.aggregated.newProjectsCount} meta="이 달 등록" />
          <Kpi label="Milestone" value={monthly.aggregated.milestonesCount} meta="중요 결정" />
        </div>
      </section>

      {/* 한 달 요약 — 페이지 2/3 width hero */}
      <section style={{ marginBottom: 'var(--sp-6)' }}>
        <div
          style={{
            width: '66.66%',
            background: 'var(--white)',
            border: 'var(--border-1)',
            padding: 'var(--sp-6) var(--sp-8)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--gray-500)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
              marginBottom: 'var(--sp-3)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            한 달 요약
          </div>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--gray-800)', lineHeight: 1.75 }}>
            {top10.length > 0 ? (
              <>
                Top 활동 프로젝트는 <strong>#{top10[0][0]} {getProject(top10[0][0])?.name}</strong>
                {top10[1] ? <> · <strong>#{top10[1][0]} {getProject(top10[1][0])?.name}</strong></> : ''}
                {top10[2] ? <> · <strong>#{top10[2][0]} {getProject(top10[2][0])?.name}</strong></> : ''}.
                {' '}총 <strong>{totalFilesChanged}</strong> files ·
                <strong> {monthly.aggregated.newProjectsCount}</strong>개 신규 ·
                milestone <strong>{monthly.aggregated.milestonesCount}</strong>건.
                {weekIds.length === 5 ? ' (5-WEEK 월)' : ''}
              </>
            ) : (
              '데이터 없음'
            )}
          </div>
        </div>
      </section>

      {/* 월간 회고 */}
      {monthly.retro && <RetroSection retro={monthly.retro} />}

      {/* swap: 2fr (Milestone) + 1fr (sidebar: Top 10 · 주간 · Type) */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 'var(--sp-6)',
          alignItems: 'flex-start',
          marginBottom: 'var(--sp-12)',
        }}
      >
        {/* LEFT (2fr) — ★ Milestone (옛 Top 10 자리) */}
        <div>
          {monthly.milestones.length > 0 ? (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--gray-500)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-wide)',
                  padding: '0 4px var(--sp-2)',
                }}
              >
                ★ Milestone ({monthly.milestones.length}건)
              </div>
              {monthly.milestones.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr',
                    columnGap: 'var(--sp-3)',
                    padding: 'var(--sp-3) var(--sp-4)',
                    background: 'var(--white)',
                    border: 'var(--border-1)',
                    borderTop: i === 0 ? 'var(--border-1)' : 'none',
                    borderLeft: '3px solid var(--black)',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--gray-500)', fontFamily: 'var(--font-mono)' }}>
                    {m.date.slice(5)}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--gray-400)' }}>
                      PROJECT {m.projectId}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-900)', marginTop: 2 }}>
                      ★ {m.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 2, lineHeight: 1.5 }}>
                      {m.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* RIGHT (1fr) — sidebar: Top 10 (compact) + 주간 + Type 분포 */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-5)',
            position: 'sticky',
            top: 80,
          }}
        >
          {/* Top 10 (compact list) */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--gray-500)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                padding: '0 4px var(--sp-2)',
              }}
            >
              Top 10 · 이 달 진행 ({top10.length})
            </div>
            <div style={{ background: 'var(--white)', border: 'var(--border-1)' }}>
              {top10.length === 0 ? (
                <div style={{ padding: 'var(--sp-4)', fontSize: 11, color: 'var(--gray-500)', textAlign: 'center' }}>
                  이 달 활동 데이터 없음
                </div>
              ) : (
                top10.map(([pid, files], idx) => {
                  const meta = getProject(pid);
                  if (!meta) return null;
                  const pct = Math.round((files / Math.max(totalFilesChanged, 1)) * 100);
                  let imp = 0;
                  for (const w of weeks) {
                    if (!w) continue;
                    const p = w.projects.find((p) => p.id === pid);
                    if (p && p.imp > imp) imp = p.imp;
                  }
                  return (
                    <Link
                      key={pid}
                      href={`/projects/${pid}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '24px 1fr auto',
                        gap: 'var(--sp-2)',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderTop: idx === 0 ? 'none' : '1px solid var(--gray-100)',
                        borderLeft: `3px solid ${TYPE_COLOR[meta.type]}`,
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--gray-400)',
                          fontWeight: 700,
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.2 }}>
                          {meta.name}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--gray-400)',
                            marginTop: 2,
                          }}
                        >
                          {pid} · {files}f · imp{imp}
                        </span>
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--gray-900)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {pct}%
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* 이 달의 주간 */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--gray-500)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                padding: '0 4px var(--sp-2)',
              }}
            >
              이 달의 주간 ({weekIds.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekIds.length}, 1fr)`, gap: 4 }}>
              {weekIds.map((wid, i) => {
                const w = weeks[i];
                const isCurrent = wid === currentWeekId;
                const parsedW = parseWeekId(wid);
                const range = parsedW ? getWeekRange(parsedW.year, parsedW.week) : null;
                return (
                  <Link
                    key={wid}
                    href={w ? `/weekly?w=${wid}` : '#'}
                    style={{
                      padding: '8px 4px',
                      background: isCurrent ? 'var(--black)' : w ? 'var(--white)' : 'var(--gray-50)',
                      border: '1px solid',
                      borderColor: isCurrent ? 'var(--black)' : w ? 'var(--gray-300)' : 'var(--gray-200)',
                      color: isCurrent ? 'var(--white)' : 'inherit',
                      textAlign: 'center',
                      textDecoration: 'none',
                      pointerEvents: w ? 'auto' : 'none',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-mono)',
                        color: isCurrent ? 'var(--gray-300)' : w ? 'var(--gray-500)' : 'var(--gray-300)',
                      }}
                    >
                      {range ? `W${parsedW?.week}` : wid}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isCurrent ? 'var(--white)' : w ? 'var(--gray-900)' : 'var(--gray-300)',
                        marginTop: 4,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {w ? w.kpis.filesChanged : '—'}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Type 분포 */}
          <div style={{ background: 'var(--white)', border: 'var(--border-1)', padding: 'var(--sp-4)' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--gray-500)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                marginBottom: 'var(--sp-3)',
              }}
            >
              Type 분포
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.entries(typeBreakdown) as Array<[ProjectType, number]>)
                .sort((a, b) => b[1] - a[1])
                .filter(([, n]) => n > 0)
                .map(([type, n]) => (
                  <div
                    key={type}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i
                        style={{
                          width: 8,
                          height: 8,
                          background: TYPE_COLOR[type],
                          display: 'inline-block',
                        }}
                      />
                      {type.toUpperCase()}
                    </span>
                    <strong>{n} files</strong>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub
   ───────────────────────────────────────────────────────────── */

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

function NoData({ month }: { month: string }) {
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
        MONTHLY DATA NOT AVAILABLE
      </div>
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--gray-700)', marginBottom: 'var(--sp-4)' }}>
        <strong>{month}</strong> 데이터 없음. 좌우 화살표로 다른 월 탐색.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RetroSection — 월간 회고 (정량 + 사용자 코멘트)
   ───────────────────────────────────────────────────────────── */

function RetroSection({ retro }: { retro: MonthlyRetro }) {
  const LABEL: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: 'var(--sp-3)' };
  const maxFiles = Math.max(...retro.weeklyFlow.map(w => w.files));
  const hasComment = retro.userComment.overall || retro.userComment.wentWell.some(Boolean);

  return (
    <section style={{ marginBottom: 'var(--sp-6)' }}>
      {/* section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', fontFamily: 'var(--font-mono)' }}>
          월간 회고
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>{retro.headline}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-4)', alignItems: 'flex-start' }}>

        {/* LEFT — 정량 분석 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

          {/* 핵심 수치 */}
          <div style={{ background: 'var(--gray-100)', border: 'var(--border-1)', padding: 'var(--sp-4)' }}>
            <div style={LABEL}>정량 분석</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-3)' }}>
              {[
                { label: '활동일', value: `${retro.stats.activeDays} / ${retro.stats.totalDays}일` },
                { label: '의사결정', value: `${retro.stats.decisions}건` },
                { label: 'Peak 주', value: `${retro.stats.peakWeek.week} · ${retro.stats.peakWeek.files}f` },
                { label: 'AI 비용', value: `$${retro.stats.costUSD.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: 'var(--sp-3)', background: 'var(--white)', border: 'var(--border-1)' }}>
                  <div style={{ fontSize: 9, color: 'var(--gray-400)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 주차별 흐름 */}
          <div style={{ background: 'var(--gray-100)', border: 'var(--border-1)', padding: 'var(--sp-4)' }}>
            <div style={LABEL}>주차별 흐름</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {retro.weeklyFlow.map(w => {
                const barPct = Math.round((w.files / maxFiles) * 100);
                return (
                  <div key={w.week} style={{ borderLeft: '2px solid var(--gray-300)', paddingLeft: 'var(--sp-3)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '48px 80px 1fr', gap: 'var(--sp-2)', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--gray-500)' }}>{w.week}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ height: 10, width: `${barPct}%`, maxWidth: 60, background: 'var(--gray-700)', minWidth: 4 }} />
                        <div style={{ fontSize: 9, color: 'var(--gray-500)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{w.files}f</div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray-800)' }}>
                        <span style={{ fontWeight: 700, marginRight: 4 }}>[{w.label}]</span>
                        {w.headline}
                      </div>
                    </div>
                    {w.narrative && (
                      <div style={{ fontSize: 11, color: 'var(--gray-600)', lineHeight: 1.65, paddingLeft: 130 }}>
                        {w.narrative}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 영역별 분포 */}
          <div style={{ background: 'var(--gray-100)', border: 'var(--border-1)', padding: 'var(--sp-4)' }}>
            <div style={LABEL}>영역별 분포</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {retro.areaBreakdown.map(a => (
                <div key={a.area} style={{ borderLeft: '2px solid var(--gray-300)', paddingLeft: 'var(--sp-3)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 36px 100px 1fr', gap: 'var(--sp-2)', alignItems: 'center', marginBottom: a.narrative ? 4 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-800)' }}>{a.area}</div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--gray-500)' }}>{a.pct}%</div>
                    <div style={{ height: 8, background: 'var(--gray-300)' }}>
                      <div style={{ height: '100%', width: `${a.pct}%`, background: 'var(--gray-700)' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>{a.highlight}</div>
                  </div>
                  {a.narrative && (
                    <div style={{ fontSize: 11, color: 'var(--gray-600)', lineHeight: 1.65, paddingLeft: 218 }}>
                      {a.narrative}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 핵심 마일스톤 */}
          <div style={{ background: 'var(--gray-100)', border: 'var(--border-1)', padding: 'var(--sp-4)' }}>
            <div style={LABEL}>핵심 마일스톤 ({retro.keyMilestones.length}건)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {retro.keyMilestones.map((m, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 'var(--sp-2)', padding: 'var(--sp-2) 0', borderBottom: i < retro.keyMilestones.length - 1 ? '1px solid var(--gray-200)' : 'none' }}>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--gray-400)', paddingTop: 2 }}>{m.date}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 1 }}>{m.title}</div>
                    {m.impact && <div style={{ fontSize: 10, color: 'var(--gray-500)', lineHeight: 1.4 }}>{m.impact}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — 사용자 코멘트 */}
        <div style={{ background: 'var(--white)', border: 'var(--border-1)', padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div style={LABEL as React.CSSProperties}>내 회고</div>

          {!hasComment ? (
            <div style={{ fontSize: 11, color: 'var(--gray-400)', lineHeight: 1.6 }}>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>data/monthly/2026-05.json</code>의
              <br /><code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>retro.userComment</code> 필드를
              <br />직접 채워주세요.
              <br /><br />
              • <strong>overall</strong> — 한 달 총평<br />
              • <strong>wentWell</strong> — 잘 된 것<br />
              • <strong>couldImprove</strong> — 아쉬운 것<br />
              • <strong>nextMonth</strong> — 다음 달 이어갈 것
            </div>
          ) : (
            <>
              {retro.userComment.overall && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 'var(--sp-1)' }}>총평</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-800)', lineHeight: 1.7 }}>{retro.userComment.overall}</div>
                </div>
              )}
              {retro.userComment.wentWell.some(Boolean) && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 'var(--sp-1)' }}>잘 된 것</div>
                  {retro.userComment.wentWell.filter(Boolean).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.6, paddingLeft: 12, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>·</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {retro.userComment.couldImprove.some(Boolean) && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 'var(--sp-1)' }}>아쉬운 것</div>
                  {retro.userComment.couldImprove.filter(Boolean).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.6, paddingLeft: 12, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>·</span>{s}
                    </div>
                  ))}
                </div>
              )}
              {retro.userComment.nextMonth.some(Boolean) && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 'var(--sp-1)' }}>다음 달</div>
                  {retro.userComment.nextMonth.filter(Boolean).map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.6, paddingLeft: 12, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0 }}>·</span>{s}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </section>
  );
}
