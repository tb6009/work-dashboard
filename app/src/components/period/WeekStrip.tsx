import Link from 'next/link';
import {
  parseWeekId,
  getWeekRange,
  getWeeksAround,
  getCurrentWeekId as calCurrentWeekId,
} from '@/lib/calendar';
import { loadWeek } from '@/lib/data';

interface Props {
  selectedWeekId: string;
  hrefBase?: string;
}

/** 7주 strip — 선택된 주차 중심 ± 3 (v0.6, 인라인 style) */
export default async function WeekStrip({ selectedWeekId, hrefBase = '/weekly' }: Props) {
  const weekIds = getWeeksAround(selectedWeekId, 7);
  const todayWeekId = calCurrentWeekId();

  const weeks = await Promise.all(
    weekIds.map(async (id) => ({ id, data: await loadWeek(id) })),
  );

  // ±6주 점프
  const wide = getWeeksAround(selectedWeekId, 13);
  const prevId = wide[0];
  const nextId = wide[12];

  const todayDate = new Date();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        marginBottom: 'var(--sp-8)',
        paddingBottom: 'var(--sp-5)',
        borderBottom: '1px solid var(--gray-200)',
      }}
    >
      <Arrow href={`${hrefBase}?w=${prevId}`} dir="left" />

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 'var(--sp-2)',
        }}
      >
        {weeks.map(({ id, data }) => {
          const p = parseWeekId(id);
          if (!p) return null;
          const range = getWeekRange(p.year, p.week);
          const isSelected = id === selectedWeekId;
          const isCurrent = id === todayWeekId;
          const isFuture = range.monday > todayDate;

          const meta = data
            ? `${data.kpis.filesChanged} files`
            : isFuture
            ? '예정'
            : isCurrent
            ? '진행 중'
            : '—';

          return (
            <StripCell
              key={id}
              href={`${hrefBase}?w=${id}`}
              label={`W${p.week}`}
              num={range.fromShort}
              meta={meta}
              isSelected={isSelected}
              isCurrent={isCurrent}
              isFuture={isFuture}
            />
          );
        })}
      </div>

      <Arrow href={`${hrefBase}?w=${nextId}`} dir="right" />
    </div>
  );
}

/* ─────────── Sub: Arrow ─────────── */
function Arrow({ href, dir }: { href: string; dir: 'left' | 'right' }) {
  return (
    <Link
      href={href}
      aria-label={dir === 'left' ? '이전' : '다음'}
      style={{
        flexShrink: 0,
        width: 32,
        height: 32,
        border: '1px solid var(--gray-300)',
        background: 'var(--white)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--gray-700)',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {dir === 'left' ? '←' : '→'}
    </Link>
  );
}

/* ─────────── Sub: StripCell ─────────── */
interface StripCellProps {
  href: string;
  label: string;
  num: string;
  meta: string;
  isSelected: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

function StripCell({ href, label, num, meta, isSelected, isCurrent, isFuture }: StripCellProps) {
  // 색상 분기
  const labelColor = isSelected
    ? 'var(--gray-300)'
    : isFuture
    ? 'var(--gray-300)'
    : 'var(--gray-400)';
  const numColor = isSelected
    ? 'var(--white)'
    : isFuture
    ? 'var(--gray-300)'
    : isCurrent
    ? '#8aa8c9' // 파란 강조
    : 'var(--gray-900)';
  const metaColor = isSelected
    ? 'var(--gray-300)'
    : isFuture
    ? 'var(--gray-300)'
    : 'var(--gray-400)';

  const cellStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '8px 0',
    textDecoration: 'none',
    color: 'inherit',
    background: isSelected ? 'var(--black)' : 'transparent',
    cursor: isFuture ? 'default' : 'pointer',
  };

  const inner = (
    <>
      <div
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: labelColor,
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: numColor,
          letterSpacing: 'var(--tracking-tight)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {num}
      </div>
      <div
        style={{
          fontSize: 10,
          color: metaColor,
          fontVariantNumeric: 'tabular-nums',
          marginTop: 4,
        }}
      >
        {meta}
      </div>
    </>
  );

  return isFuture ? (
    <div style={cellStyle}>{inner}</div>
  ) : (
    <Link href={href} style={cellStyle}>{inner}</Link>
  );
}
