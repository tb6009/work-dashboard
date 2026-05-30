import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import {
  loadYear,
  listAvailableYears,
  loadAllWeeks,
  getProject,
} from '@/lib/data';
import { TYPE_COLOR } from '@/lib/projectTypes';
import TokenSummary from '@/components/TokenSummary';
import { aggregateWeeks } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ year: string }>;
}

const MONTHS = [
  { num: '01', label: 'JAN', name: '1월' },
  { num: '02', label: 'FEB', name: '2월' },
  { num: '03', label: 'MAR', name: '3월' },
  { num: '04', label: 'APR', name: '4월' },
  { num: '05', label: 'MAY', name: '5월' },
  { num: '06', label: 'JUN', name: '6월' },
  { num: '07', label: 'JUL', name: '7월' },
  { num: '08', label: 'AUG', name: '8월' },
  { num: '09', label: 'SEP', name: '9월' },
  { num: '10', label: 'OCT', name: '10월' },
  { num: '11', label: 'NOV', name: '11월' },
  { num: '12', label: 'DEC', name: '12월' },
];

export default async function YearlyPage({ params }: PageProps) {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) {
    return (
      <PageShell active="yearly">
        <div style={{ padding: 'var(--sp-16)', textAlign: 'center' }}>
          잘못된 연도 형식: <code>{year}</code>
        </div>
      </PageShell>
    );
  }

  const yearly = await loadYear(year);
  const availableYears = await listAvailableYears();
  const allWeeks = await loadAllWeeks();
  const yearWeeks = allWeeks.filter((w) => w.week.startsWith(`${year}-W`));
  const yearTokens = aggregateWeeks(yearWeeks);
  const currentYear = String(new Date().getFullYear());
  const isCurrentYear = year === currentYear;

  if (!yearly) {
    return (
      <PageShell active="yearly">
        <NotAvailable year={year} availableYears={availableYears} currentYear={currentYear} />
      </PageShell>
    );
  }

  // monthly totals → map: monthNum (1-12) → { files, topProjectId, keyMilestone }
  const monthlyMap = new Map<string, { files: number; topProjectId?: string; keyMilestone?: string }>();
  for (const mt of yearly.monthlyTotals) {
    const m = mt.month.split('-')[1]; // 'YYYY-MM' → 'MM'
    monthlyMap.set(m, { files: mt.files, topProjectId: mt.topProjectId, keyMilestone: mt.keyMilestone });
  }

  const todayMonth = new Date().getMonth() + 1; // 1-12

  return (
    <PageShell active="yearly">
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
        <span style={{ color: 'var(--gray-900)', fontWeight: 600 }}>{year}</span>
      </div>

      {/* Hero + Year Tabs */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingBottom: 'var(--sp-5)',
            borderBottom: isCurrentYear ? '2px solid var(--black)' : '1px solid var(--gray-300)',
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
              YEARLY · {year}
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
              {year}
            </h1>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-500)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {yearly.months.length} 개월 활동 · {yearly.aggregated.activeProjects} active 프로젝트
              {isCurrentYear ? ' · CURRENT YEAR' : ''}
            </div>
          </div>

          {/* Year tabs */}
          <YearTabs years={availableYears} active={year} currentYear={currentYear} />
        </div>
        <TokenSummary tokens={yearTokens} scopeLabel={`${year} 연간`} />
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
          <Kpi label="총 변경 파일" value={yearly.aggregated.totalFiles} meta={`${yearly.months.length} 개월 누적`} />
          <Kpi label="Active 프로젝트" value={yearly.aggregated.activeProjects} meta="평균" />
          <Kpi label="신규 프로젝트 (YTD)" value={yearly.aggregated.newProjectsYTD} meta="이번 해 등록" />
          <Kpi label="Milestone" value={yearly.aggregated.milestonesCount} meta="중요 결정" />
        </div>
      </section>

      {/* 12 Month Grid */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <SectionHead title="12개월 한눈에" meta={`${yearly.months.length} / 12 active`} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 'var(--sp-2)',
          }}
        >
          {MONTHS.map((m, idx) => {
            const mNum = idx + 1;
            const isCurrent = isCurrentYear && mNum === todayMonth;
            const isFuture = isCurrentYear && mNum > todayMonth;
            const data = monthlyMap.get(m.num);
            const hasData = !!data && data.files > 0;
            const monthId = `${year}-${m.num}`;
            const top = data?.topProjectId ? getProject(data.topProjectId) : null;

            return (
              <Link
                key={m.num}
                href={hasData ? `/monthly/${monthId}` : '#'}
                style={{
                  background: isCurrent ? 'var(--black)' : hasData ? 'var(--white)' : 'var(--gray-50)',
                  border: '1px solid',
                  borderColor: isCurrent ? 'var(--black)' : hasData ? 'var(--gray-300)' : 'var(--gray-200)',
                  color: isCurrent ? 'var(--white)' : 'inherit',
                  padding: 'var(--sp-4)',
                  textDecoration: 'none',
                  pointerEvents: hasData ? 'auto' : 'none',
                  display: 'block',
                  minHeight: 130,
                  opacity: isFuture && !isCurrent ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 300,
                      color: isCurrent ? 'var(--white)' : hasData ? 'var(--black)' : 'var(--gray-300)',
                      letterSpacing: 'var(--tracking-tight)',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1,
                    }}
                  >
                    {m.num}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 600,
                      color: isCurrent ? 'var(--gray-300)' : hasData ? 'var(--gray-500)' : 'var(--gray-300)',
                      letterSpacing: 'var(--tracking-wide)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {m.label}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 700,
                    color: isCurrent ? 'var(--white)' : hasData ? 'var(--black)' : 'var(--gray-300)',
                    marginTop: 'var(--sp-3)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}
                >
                  {hasData ? data.files : '—'}
                  {hasData ? (
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

                {top ? (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: isCurrent ? 'var(--gray-300)' : TYPE_COLOR[top.type],
                      marginTop: 'var(--sp-2)',
                      letterSpacing: 'var(--tracking-wide)',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    TOP · {top.id}
                  </div>
                ) : null}

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

      {/* Year Milestones */}
      {yearly.milestones.length > 0 ? (
        <section style={{ marginBottom: 'var(--sp-12)' }}>
          <SectionHead title="올해의 Milestone" meta={`${yearly.milestones.length}건`} />
          <div style={{ background: 'var(--white)', border: 'var(--border-1)' }}>
            {yearly.milestones.map((m, i) => {
              const meta = getProject(m.projectId);
              const color = meta ? TYPE_COLOR[meta.type] : 'var(--gray-300)';
              return (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    padding: 'var(--sp-4) var(--sp-5) var(--sp-4) calc(var(--sp-5) + 4px)',
                    borderTop: i === 0 ? 'none' : '1px solid var(--gray-100)',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: 0, top: 0, bottom: 0,
                      width: 4,
                      background: color,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--gray-500)',
                      }}
                    >
                      {m.date}
                    </span>
                    <Link
                      href={`/projects/${m.projectId}`}
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--gray-700)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {m.projectId} {meta?.name}
                    </Link>
                  </div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--gray-900)' }}>
                    ★ {m.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 4 }}>
                    {m.description}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

/* ─────────── Sub ─────────── */

function YearTabs({ years, active, currentYear }: { years: string[]; active: string; currentYear: string }) {
  // 데이터 있는 연도 + 다음 연도 placeholder
  const tabs: Array<{ year: string; state: 'active' | 'past' | 'future' }> = years.map(y => ({
    year: y,
    state: y === active ? 'active' : 'past',
  }));
  const nextYear = String(Number(currentYear) + 1);
  if (!years.includes(nextYear)) tabs.push({ year: nextYear, state: 'future' });

  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        border: '1px solid var(--gray-300)',
        background: 'var(--white)',
        width: 'fit-content',
      }}
    >
      {tabs.map((t, i) => {
        const isActive = t.state === 'active';
        const isFuture = t.state === 'future';
        return (
          <Link
            key={t.year}
            href={isFuture ? '#' : `/yearly/${t.year}`}
            style={{
              padding: 'var(--sp-3) var(--sp-5)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              background: isActive ? 'var(--black)' : isFuture ? 'var(--gray-50)' : 'var(--white)',
              color: isActive ? 'var(--white)' : isFuture ? 'var(--gray-300)' : 'var(--gray-500)',
              textDecoration: 'none',
              fontVariantNumeric: 'tabular-nums',
              borderRight: i < tabs.length - 1 ? '1px solid var(--gray-300)' : 'none',
              pointerEvents: isFuture ? 'none' : 'auto',
              cursor: isFuture ? 'not-allowed' : 'pointer',
            }}
          >
            {t.year}
            <span
              style={{
                display: 'block',
                fontSize: 9,
                fontWeight: 500,
                opacity: 0.6,
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              {isActive ? 'CURRENT' : isFuture ? 'UPCOMING' : 'PAST'}
            </span>
          </Link>
        );
      })}
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
  year,
  availableYears,
  currentYear,
}: {
  year: string;
  availableYears: string[];
  currentYear: string;
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
        YEARLY DATA NOT AVAILABLE
      </div>
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--gray-700)', marginBottom: 'var(--sp-5)' }}>
        <strong>{year}</strong> 데이터 없음.
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginBottom: 'var(--sp-3)' }}>
        활동 있는 연도:
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
        {availableYears.length === 0 ? (
          <span style={{ color: 'var(--gray-400)', fontSize: 'var(--text-xs)' }}>없음</span>
        ) : (
          availableYears.map(y => (
            <Link
              key={y}
              href={`/yearly/${y}`}
              style={{
                padding: '4px 10px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: y === currentYear ? 'var(--white)' : 'var(--gray-700)',
                background: y === currentYear ? 'var(--black)' : 'var(--white)',
                border: '1px solid',
                borderColor: y === currentYear ? 'var(--black)' : 'var(--gray-300)',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {y}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
