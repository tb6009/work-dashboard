import Link from 'next/link';
import { getProject } from '@/lib/data';
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/projectTypes';

interface Props {
  /** 프로젝트 ID */
  projectId: string;
  /** 랭크 (월간 모드 #1, #2 등). week 모드는 생략 */
  rank?: number;
  /** % */
  pct?: number;
  /** 중요도 1-5 */
  imp?: number;
  /** 좌측 하단 메타 (예: "50 files · W18 집중" 또는 "NEXT · 본문 집필") */
  metaLine?: string;
  /** 우측 narrative (이번 주 한 일 / 그 달 진행) */
  narrative?: string;
}

/** v0.6 1/3·2/3 프로젝트 타일.
 *  좌(메타 stacked) + 우(narrative). 클릭 → /projects/[id] */
export default function PeriodProjectTile({
  projectId,
  rank,
  pct,
  imp = 0,
  metaLine,
  narrative,
}: Props) {
  const meta = getProject(projectId);
  if (!meta) return null;
  const color = TYPE_COLOR[meta.type];
  const typeLabel = TYPE_LABEL[meta.type];
  const high = imp >= 4;

  return (
    <Link
      href={`/projects/${projectId}`}
      style={{
        position: 'relative',
        background: 'var(--white)',
        padding: '14px 18px 14px 20px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
        gap: 'var(--sp-6)',
        alignItems: 'flex-start',
        textDecoration: 'none',
        color: 'inherit',
        borderBottom: '1px solid var(--gray-200)',
        transition: 'background .12s',
      }}
    >
      {/* 좌측 4px 컬러 스트립 */}
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

      {/* LEFT — 메타 stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        {rank !== undefined ? (
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--gray-400)',
              fontWeight: 700,
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            #{rank}
          </div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--gray-400)',
              fontWeight: 700,
            }}
          >
            {projectId}
          </span>
          <span
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              color: 'var(--gray-900)',
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 1.25,
            }}
          >
            {meta.name}
          </span>
        </div>
        <span
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            fontSize: 8,
            fontWeight: 700,
            color: 'var(--white)',
            background: color,
            padding: '1px 5px',
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase',
          }}
        >
          {typeLabel}
        </span>
        {pct !== undefined ? (
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--gray-900)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              letterSpacing: 'var(--tracking-tight)',
              marginTop: 4,
            }}
          >
            {pct}
            <span
              style={{
                fontSize: 12,
                color: 'var(--gray-400)',
                fontWeight: 500,
                marginLeft: 2,
              }}
            >
              %
            </span>
          </div>
        ) : null}
        {imp > 0 ? (
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {Array.from({ length: 5 }, (_, i) => {
              const active = i < imp;
              const bg = active
                ? high
                  ? 'var(--black)'
                  : 'var(--gray-700)'
                : 'var(--gray-200)';
              return (
                <span
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: bg,
                    display: 'inline-block',
                  }}
                />
              );
            })}
          </span>
        ) : null}
        {metaLine ? (
          <span
            style={{
              fontSize: 10,
              color: 'var(--gray-500)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {metaLine}
          </span>
        ) : null}
      </div>

      {/* RIGHT — narrative */}
      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--gray-700)',
          lineHeight: 'var(--leading-relaxed)',
        }}
      >
        {narrative ?? '—'}
      </div>
    </Link>
  );
}
