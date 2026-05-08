import Link from 'next/link';
import {
  parseMonthId,
  getMonthLabel,
  getMonthsAround,
  getCurrentMonthId,
} from '@/lib/calendar';
import { loadMonth } from '@/lib/data';

interface Props {
  selectedMonthId: string;
}

/** 7개월 strip — 선택된 월 중심 ± 3 (v0.6, 인라인 style) */
export default async function MonthStrip({ selectedMonthId }: Props) {
  const monthIds = getMonthsAround(selectedMonthId, 7);
  const todayMonthId = getCurrentMonthId();

  const months = await Promise.all(
    monthIds.map(async (id) => ({ id, data: await loadMonth(id) })),
  );

  const wide = getMonthsAround(selectedMonthId, 13);
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
      <Arrow href={`/monthly/${prevId}`} dir="left" />

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 'var(--sp-2)',
        }}
      >
        {months.map(({ id, data }) => {
          const p = parseMonthId(id);
          if (!p) return null;
          const label = getMonthLabel(id);
          const isSelected = id === selectedMonthId;
          const isCurrent = id === todayMonthId;
          const monthStart = new Date(Date.UTC(p.year, p.month - 1, 1));
          const isFuture = monthStart > todayDate && !isCurrent;

          const meta = data
            ? `${data.aggregated.totalFiles} files`
            : isFuture
            ? '예정'
            : isCurrent
            ? '진행 중'
            : '—';

          return (
            <StripCell
              key={id}
              href={`/monthly/${id}`}
              label={label?.label ?? id.slice(5)}
              num={String(p.month).padStart(2, '0')}
              meta={meta}
              isSelected={isSelected}
              isCurrent={isCurrent}
              isFuture={isFuture}
            />
          );
        })}
      </div>

      <Arrow href={`/monthly/${nextId}`} dir="right" />
    </div>
  );
}

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
    ? '#8aa8c9'
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
