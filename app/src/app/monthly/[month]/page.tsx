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
import type { ProjectType } from '@/types/dashboard';

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

      {/* 1fr (sidebar) + 2fr (top 10 narrative) */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: 'var(--sp-6)',
          alignItems: 'flex-start',
          marginBottom: 'var(--sp-12)',
        }}
      >
        {/* LEFT — sidebar (sticky) */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-5)',
            position: 'sticky',
            top: 80,
          }}
        >
          {/* 한 달 요약 */}
          <div style={{ background: 'var(--white)', border: 'var(--border-1)', padding: 'var(--sp-5)' }}>
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
              한 달 요약
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.7 }}>
              {top10.length > 0 ? (
                <>
                  Top 활동 프로젝트는 <strong>#{top10[0][0]} {getProject(top10[0][0])?.name}</strong>
                  {top10[1] ? ` · #${top10[1][0]} ${getProject(top10[1][0])?.name}` : ''}.
                  {' '}
                  총 {totalFilesChanged} files · {monthly.aggregated.newProjectsCount}개 신규
                  · milestone {monthly.aggregated.milestonesCount}건.
                  {weekIds.length === 5 ? ' (5-WEEK 월)' : ''}
                </>
              ) : (
                '데이터 없음'
              )}
            </div>
          </div>

          {/* Milestone */}
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

        {/* RIGHT — Top 10 narrative */}
        <div>
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
              Top 10 · 이 달 진행
            </h2>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
              {top10.length}개 · 파일 변경 수 기준
            </div>
          </div>

          {top10.length === 0 ? (
            <div
              style={{
                padding: 'var(--sp-8)',
                background: 'var(--white)',
                border: 'var(--border-1)',
                color: 'var(--gray-500)',
                fontSize: 'var(--text-sm)',
                textAlign: 'center',
              }}
            >
              이 달 활동 데이터 없음.
            </div>
          ) : (
            <div>
              {top10.map(([pid, files], idx) => {
                const meta = getProject(pid);
                if (!meta) return null;
                // imp는 그 달 weekly 중 최댓값
                let imp = 0;
                for (const w of weeks) {
                  if (!w) continue;
                  const p = w.projects.find((p) => p.id === pid);
                  if (p && p.imp > imp) imp = p.imp;
                }
                return (
                  <PeriodProjectTile
                    key={pid}
                    projectId={pid}
                    rank={idx + 1}
                    pct={Math.round((files / Math.max(totalFilesChanged, 1)) * 100)}
                    imp={imp}
                    metaLine={`${files} files`}
                    narrative={buildNarrative(pid)}
                  />
                );
              })}
            </div>
          )}
        </div>
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
