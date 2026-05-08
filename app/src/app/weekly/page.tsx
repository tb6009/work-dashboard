import PageShell from '@/components/layout/PageShell';
import WeekColumn from '@/components/weekly/WeekColumn';
import {
  loadActiveMonthGroups,
  listAvailableYears,
  getCurrentWeekId,
} from '@/lib/data';
import {
  getMonthLabel,
  getCurrentMonthId,
  parseWeekId,
  getWeekRange,
} from '@/lib/calendar';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function WeeklyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const availableYears = await listAvailableYears();
  const requestedYear = sp.year;
  // active year: 요청 있으면 그것, 없으면 가장 최신
  const activeYear =
    requestedYear && availableYears.includes(requestedYear)
      ? requestedYear
      : availableYears[0] ?? String(new Date().getFullYear());

  const groups = await loadActiveMonthGroups(activeYear);
  const currentMonthId = getCurrentMonthId();
  const currentWeekId = await getCurrentWeekId();

  // 활동 미미한 월 자동 제외 (총 0건이면서 현재 월도 아닌 경우)
  const visibleGroups = groups.filter(g => {
    if (g.monthId === currentMonthId) return true; // current month always shown
    return g.hasAnyData;
  });

  return (
    <PageShell active="weekly">
      <Hero year={activeYear} groupCount={visibleGroups.length} />
      <YearTabs years={availableYears} activeYear={activeYear} />

      <div>
        {visibleGroups.map(g => {
          const isCurrentMonth = g.monthId === currentMonthId;
          const ml = getMonthLabel(g.monthId);
          const cols = g.weekIds.length === 5 ? 5 : 4;
          return (
            <section key={g.monthId} style={{ marginBottom: 'var(--sp-12)' }}>
              <MonthHead
                monthId={g.monthId}
                num={ml?.num ?? '??'}
                label={ml?.label ?? ''}
                name={ml?.name ?? ''}
                isCurrent={isCurrentMonth}
                totalFiles={g.totalFiles}
                weekCount={g.weekIds.length}
                filledCount={g.weeks.filter(w => w !== null).length}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gap: 'var(--sp-3)',
                }}
              >
                {g.weekIds.map((wid, i) => {
                  const data = g.weeks[i] ?? null;
                  const isFuture = isWeekFuture(wid);
                  return (
                    <WeekColumn
                      key={wid}
                      weekId={wid}
                      data={data}
                      currentWeekId={currentWeekId}
                      isFuture={isFuture}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        {visibleGroups.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--gray-400)',
              fontSize: 'var(--text-sm)',
              padding: 'var(--sp-16) 0',
            }}
          >
            {activeYear}년 데이터 없음.
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────── */

function Hero({ year, groupCount }: { year: string; groupCount: number }) {
  return (
    <section style={{ marginBottom: 'var(--sp-12)' }}>
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
        WEEKLY ARCHIVE
      </div>
      <h1
        style={{
          fontSize: 50,
          fontWeight: 300,
          color: 'var(--black)',
          letterSpacing: 'var(--tracking-tight)',
          lineHeight: 1,
          margin: '0 0 var(--sp-3) 0',
        }}
      >
        모든 주간
      </h1>
      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--gray-500)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {year} · 활동 있는 월 {groupCount}개 · 최신 → 과거 순
      </div>
    </section>
  );
}

function YearTabs({ years, activeYear }: { years: string[]; activeYear: string }) {
  // 현재 연도 + 다음 연도(future placeholder)
  const currentYearNum = Number(activeYear);
  const tabs: Array<{ year: string; state: 'active' | 'past' | 'future' }> = [];
  for (const y of years) tabs.push({ year: y, state: y === activeYear ? 'active' : 'past' });
  const nextYear = String(currentYearNum + 1);
  if (!years.includes(nextYear)) tabs.push({ year: nextYear, state: 'future' });

  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        border: '1px solid var(--gray-300)',
        background: 'var(--white)',
        marginBottom: 'var(--sp-12)',
        width: 'fit-content',
      }}
    >
      {tabs.map((t, i) => {
        const isActive = t.state === 'active';
        const isFuture = t.state === 'future';
        return (
          <a
            key={t.year}
            href={isFuture ? '#' : `?year=${t.year}`}
            style={{
              padding: 'var(--sp-3) var(--sp-6)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              background: isActive ? 'var(--black)' : isFuture ? 'var(--gray-50)' : 'var(--white)',
              color: isActive ? 'var(--white)' : isFuture ? 'var(--gray-300)' : 'var(--gray-500)',
              textDecoration: 'none',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 'var(--tracking-tight)',
              borderRight: i < tabs.length - 1 ? '1px solid var(--gray-300)' : 'none',
              cursor: isFuture ? 'not-allowed' : 'pointer',
              pointerEvents: isFuture ? 'none' : 'auto',
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
          </a>
        );
      })}
    </div>
  );
}

function MonthHead({
  num,
  label,
  name,
  isCurrent,
  totalFiles,
  weekCount,
  filledCount,
}: {
  monthId: string;
  num: string;
  label: string;
  name: string;
  isCurrent: boolean;
  totalFiles: number;
  weekCount: number;
  filledCount: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingBottom: 'var(--sp-3)',
        borderBottom: isCurrent ? '2px solid var(--black)' : '1px solid var(--gray-300)',
        marginBottom: 'var(--sp-5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
        <span
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 300,
            color: 'var(--black)',
            letterSpacing: 'var(--tracking-tight)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {num}
        </span>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-500)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wider)',
          }}
        >
          {label} · {name}
        </span>
        {isCurrent ? (
          <span
            style={{
              display: 'inline-block',
              fontSize: 9,
              fontWeight: 700,
              background: 'var(--black)',
              color: 'var(--white)',
              padding: '2px 6px',
              marginLeft: 'var(--sp-2)',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            CURRENT
          </span>
        ) : null}
        {weekCount === 5 ? (
          <span
            style={{
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              color: 'var(--gray-400)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            5-WEEK
          </span>
        ) : null}
      </div>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-400)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <strong style={{ color: 'var(--gray-700)', fontWeight: 600 }}>{totalFiles}</strong> files ·{' '}
        {filledCount} / {weekCount} weeks
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function isWeekFuture(weekId: string): boolean {
  const parsed = parseWeekId(weekId);
  if (!parsed) return false;
  const range = getWeekRange(parsed.year, parsed.week);
  // 빌드 타임 기준 — 오늘이 그 주 월요일보다 이전이면 future
  const now = new Date();
  return now < range.monday;
}
