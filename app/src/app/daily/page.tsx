import PageShell from '@/components/layout/PageShell';
import DailyListClient from '@/components/period/DailyListClient';
import { loadWeek, getCurrentWeekId, listWeekIds } from '@/lib/data';
import {
  parseWeekId,
  getWeekRange,
  getCurrentWeekId as calCurrentWeekId,
} from '@/lib/calendar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ w?: string }>;
}

export default async function DailyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const fallbackWeekId = await getCurrentWeekId();
  const selectedWeekId = sp.w ?? fallbackWeekId;
  const week = await loadWeek(selectedWeekId);

  const todayWeekId = calCurrentWeekId();
  const isCurrentWeek = selectedWeekId === todayWeekId;
  const todayDate = new Date().toISOString().slice(0, 10);

  // 이전/다음 주차 (네비게이션)
  const allWeekIds = await listWeekIds();
  const idx = allWeekIds.indexOf(selectedWeekId);
  const prevWeekId = idx >= 0 && idx < allWeekIds.length - 1 ? allWeekIds[idx + 1] : null;
  const nextWeekId = idx > 0 ? allWeekIds[idx - 1] : null;

  // 활동 있는 날만 (entries 존재) · 최신 → 오래된 순
  const activeDays = week
    ? [...week.daily]
        .filter((d) => (d.entries && d.entries.length > 0) || d.filesChanged > 0)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const parsed = parseWeekId(selectedWeekId);
  const range = parsed ? getWeekRange(parsed.year, parsed.week) : null;
  const rangeStr = range ? `${range.fromISO} ~ ${range.toISO}` : '';

  return (
    <PageShell active="daily">
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
          DAILY · {selectedWeekId}
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
              CURRENT WEEK
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
          일간 기록
        </h1>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {rangeStr} · {activeDays.length}일 활동
        </div>
        {week?.summary ? (
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

      {/* 주차 네비게이션 */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--sp-4)',
          paddingBottom: 'var(--sp-3)',
          borderBottom: '1px solid var(--gray-200)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          {prevWeekId ? (
            <Link
              href={`/daily?w=${prevWeekId}`}
              style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--gray-500)',
                textDecoration: 'none',
              }}
            >
              ← {prevWeekId}
            </Link>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          {!isCurrentWeek ? (
            <Link
              href="/daily"
              style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--gray-700)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              CURRENT
            </Link>
          ) : null}
          {nextWeekId ? (
            <Link
              href={`/daily?w=${nextWeekId}`}
              style={{
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--gray-500)',
                textDecoration: 'none',
              }}
            >
              {nextWeekId} →
            </Link>
          ) : null}
        </div>
      </nav>

      {/* Daily rows */}
      {activeDays.length === 0 ? (
        <NoData weekId={selectedWeekId} isCurrentWeek={isCurrentWeek} />
      ) : (
        <DailyListClient
          activeDays={activeDays}
          weekStart={range?.fromISO ?? selectedWeekId}
          weekEnd={range?.toISO ?? selectedWeekId}
          todayDate={todayDate}
        />
      )}
    </PageShell>
  );
}

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
        NO DAILY ENTRIES
      </div>
      <div style={{ fontSize: 'var(--text-base)', color: 'var(--gray-700)', marginBottom: 'var(--sp-4)' }}>
        <strong>{weekId}</strong> {isCurrentWeek ? '— 아직 활동 기록 없음' : '— 데이터 없음'}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', fontFamily: 'var(--font-mono)' }}>
        일일 로그(`docs/logs/YYYYMMDD_log.md`) 작성 후{' '}
        <code>node scripts/extract-daily-entries.mjs {weekId}</code>
      </div>
    </div>
  );
}
