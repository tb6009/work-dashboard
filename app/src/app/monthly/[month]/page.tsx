import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import {
  loadMonth,
  loadWeek,
  listAvailableMonths,
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

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ month: string }>;
}

export default async function MonthlyPage({ params }: PageProps) {
  const { month } = await params;
  const parsed = parseMonthId(month);
  if (!parsed) {
    return (
      <PageShell active="monthly">
        <div style={{ padding: 'var(--sp-16)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--gray-700)' }}>
            잘못된 월 형식: <code>{month}</code>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 8 }}>
            예: <code>/monthly/2026-05</code>
          </div>
        </div>
      </PageShell>
    );
  }

  const monthly = await loadMonth(month);
  const availableMonths = await listAvailableMonths();
  const currentMonthId = getCurrentMonthId();
  const currentWeekId = await getCurrentWeekId();

  if (!monthly) {
    return (
      <PageShell active="monthly">
        <NotAvailable month={month} availableMonths={availableMonths} currentMonthId={currentMonthId} />
      </PageShell>
    );
  }

  const ml = getMonthLabel(month);
  const weekIds = getWeeksOfMonth(month);
  const weeks = await Promise.all(weekIds.map(loadWeek));
  const isCurrentMonth = month === currentMonthId;

  return (
    <PageShell active="monthly">
      {/* Crumbs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-2)',
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-500)',
          marginBottom: 'var(--sp-6)',
        }}
      >
        <Link href="/" style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>DASHBOARD</Link>
        <span style={{ color: 'var(--gray-300)' }}>/</span>
        <Link href={`/yearly/${parsed.year}`} style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>
          {parsed.year}
        </Link>
        <span style={{ color: 'var(--gray-300)' }}>/</span>
        <span style={{ color: 'var(--gray-900)', fontWeight: 600 }}>
          {ml?.label} · {ml?.name}
        </span>
      </div>

      {/* Hero */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingBottom: 'var(--sp-5)',
            borderBottom: isCurrentMonth ? '2px solid var(--black)' : '1px solid var(--gray-300)',
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
                fontFamily: 'var(--font-mono)',
              }}
            >
              MONTHLY · {month}
            </div>
            <h1
              style={{
                fontSize: 50,
                fontWeight: 300,
                color: 'var(--black)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1,
                margin: '0 0 var(--sp-2) 0',
              }}
            >
              {ml?.name} · {parsed.year}
            </h1>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-500)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {weekIds.length} weeks · {weeks.filter(w => w !== null).length} weeks 데이터 있음
              {isCurrentMonth ? ' · CURRENT MONTH' : ''}
            </div>
          </div>
          {isCurrentMonth ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                background: 'var(--black)',
                color: 'var(--white)',
                padding: '2px 6px',
                letterSpacing: 'var(--tracking-wide)',
              }}
            >
              CURRENT
            </span>
          ) : null}
        </div>
      </section>

      {/* KPI */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
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

      {/* Weeks of this month */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <SectionHead title="이 달의 주간" meta={`${weekIds.length} weeks`} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${weekIds.length === 5 ? 5 : 4}, 1fr)`,
            gap: 'var(--sp-3)',
          }}
        >
          {weekIds.map((wid, i) => {
            const w = weeks[i];
            const isCurrent = wid === currentWeekId;
            const parsedW = parseWeekId(wid);
            const range = parsedW ? getWeekRange(parsedW.year, parsedW.week) : null;

            return (
              <Link
                key={wid}
                href={w ? '/weekly' : '#'}
                style={{
                  background: isCurrent ? 'var(--black)' : w ? 'var(--white)' : 'var(--gray-50)',
                  border: '1px solid',
                  borderColor: isCurrent ? 'var(--black)' : w ? 'var(--gray-300)' : 'var(--gray-200)',
                  color: isCurrent ? 'var(--white)' : 'inherit',
                  padding: 'var(--sp-4)',
                  textDecoration: 'none',
                  pointerEvents: w ? 'auto' : 'none',
                  display: 'block',
                  minHeight: 110,
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    color: isCurrent ? 'var(--gray-300)' : w ? 'var(--gray-500)' : 'var(--gray-300)',
                  }}
                >
                  {wid}
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: isCurrent ? 'var(--white)' : w ? 'var(--gray-700)' : 'var(--gray-300)',
                    fontWeight: 500,
                    marginTop: 2,
                  }}
                >
                  {range ? `${range.fromShort} ~ ${range.toShort}` : ''}
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 700,
                    color: isCurrent ? 'var(--white)' : w ? 'var(--black)' : 'var(--gray-300)',
                    marginTop: 'var(--sp-3)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: 'var(--tracking-tight)',
                  }}
                >
                  {w ? w.kpis.filesChanged : '—'}
                  {w ? (
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 400,
                        color: isCurrent ? 'var(--gray-300)' : 'var(--gray-400)',
                        marginLeft: 4,
                      }}
                    >
                      files
                    </span>
                  ) : null}
                </div>
                {isCurrent ? (
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
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Top Projects + Milestones */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 'var(--sp-5)',
          marginBottom: 'var(--sp-12)',
        }}
      >
        <div>
          <SectionHead title="이 달 Top Projects" meta={`${monthly.topProjects.length}개`} />
          <div style={{ background: 'var(--white)', border: 'var(--border-1)' }}>
            {monthly.topProjects.length === 0 ? (
              <div style={{ padding: 'var(--sp-6)', color: 'var(--gray-400)', fontSize: 'var(--text-sm)' }}>
                활동 없음
              </div>
            ) : (
              monthly.topProjects.map((pid, i) => {
                const meta = getProject(pid);
                if (!meta) return null;
                const color = TYPE_COLOR[meta.type];
                return (
                  <Link
                    key={pid}
                    href={`/projects/${pid}`}
                    style={{
                      position: 'relative',
                      display: 'block',
                      padding: 'var(--sp-3) var(--sp-5) var(--sp-3) calc(var(--sp-5) + 4px)',
                      borderTop: i === 0 ? 'none' : '1px solid var(--gray-100)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background: color,
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--gray-400)',
                          fontWeight: 500,
                        }}
                      >
                        {pid}
                      </span>
                      <span
                        style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 600,
                          color: 'var(--gray-900)',
                        }}
                      >
                        {meta.name}
                      </span>
                      <span
                        style={{
                          fontSize: 'var(--text-2xs)',
                          color: color,
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          letterSpacing: 'var(--tracking-wide)',
                          marginLeft: 'auto',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        #{i + 1}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 2 }}>
                      {meta.define}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div>
          <SectionHead title="Milestones" meta={`${monthly.milestones.length}건`} />
          <div style={{ background: 'var(--white)', border: 'var(--border-1)' }}>
            {monthly.milestones.length === 0 ? (
              <div style={{ padding: 'var(--sp-6)', color: 'var(--gray-400)', fontSize: 'var(--text-sm)' }}>
                Milestone 없음
              </div>
            ) : (
              monthly.milestones.map((m, i) => (
                <div
                  key={i}
                  style={{
                    padding: 'var(--sp-3) var(--sp-4)',
                    borderTop: i === 0 ? 'none' : '1px solid var(--gray-100)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--gray-500)',
                      }}
                    >
                      {m.date.slice(5)}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-2xs)',
                        color: 'var(--gray-400)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      · #{m.projectId}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-900)' }}>
                    ★ {m.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 2 }}>
                    {m.description}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/* ─────────── Sub ─────────── */

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
        marginBottom: 'var(--sp-4)',
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

function NotAvailable({
  month,
  availableMonths,
  currentMonthId,
}: {
  month: string;
  availableMonths: string[];
  currentMonthId: string;
}) {
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
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--gray-700)', marginBottom: 'var(--sp-5)' }}>
        <strong>{month}</strong> 데이터 없음.
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginBottom: 'var(--sp-3)' }}>
        활동 있는 월:
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
        {availableMonths.length === 0 ? (
          <span style={{ color: 'var(--gray-400)', fontSize: 'var(--text-xs)' }}>없음</span>
        ) : (
          availableMonths.map(m => (
            <Link
              key={m}
              href={`/monthly/${m}`}
              style={{
                padding: '4px 10px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: m === currentMonthId ? 'var(--white)' : 'var(--gray-700)',
                background: m === currentMonthId ? 'var(--black)' : 'var(--white)',
                border: '1px solid',
                borderColor: m === currentMonthId ? 'var(--black)' : 'var(--gray-300)',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {m}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
