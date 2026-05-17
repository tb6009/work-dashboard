import Link from 'next/link';
import type { ProjectMeta, ProjectContribution } from '@/types/dashboard';
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/projectTypes';

interface Props {
  project: ProjectMeta;
  /** 이번 주(현재 weekly) 기여도. 없으면 표시 안 함. */
  contribution?: ProjectContribution;
  /** 미설정 시 PROJECT detail 페이지로 이동 */
  href?: string;
}

/** v0.2 패턴 — 외부 2열 그리드 안의 "내부 2열" 타일 (메타 / 액션) */
export default function ActiveProjectTile({ project, contribution, href }: Props) {
  const color = TYPE_COLOR[project.type];
  const typeLabel = TYPE_LABEL[project.type];
  const isPaused = project.status === 'paused';
  const isArchived = project.status === 'archived';

  const statusChip = (() => {
    switch (project.status) {
      case 'new':      return { cls: 'chip-new',      text: 'NEW' };
      case 'active':   return { cls: 'chip-active',   text: 'ACTIVE' };
      case 'paused':   return { cls: 'chip-paused',   text: 'PAUSED' };
      case 'archived': return { cls: 'chip-archived', text: 'ARCHIVED' };
    }
  })();

  // imp dots — contribution 있으면 그 값, 없으면 0
  const imp = contribution?.imp ?? 0;
  const high = imp >= 4;

  // pct & did & next
  const pct = contribution?.pct;
  const did = contribution?.did;
  const nextAction = contribution?.nextAction;

  // 라벨 분기 — paused는 RESUME WHEN, 그 외는 NEXT
  const nextLabel = isPaused ? 'RESUME WHEN' : 'NEXT';

  return (
    <Link
      href={href ?? `/projects/${project.id}`}
      style={{
        position: 'relative',
        background: isPaused ? 'var(--gray-50)' : 'var(--white)',
        padding: 'var(--sp-4) var(--sp-5) var(--sp-4) calc(var(--sp-5) + 4px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
        gap: 'var(--sp-5)',
        alignItems: 'center',
        minHeight: 64,
        textDecoration: 'none',
        color: 'inherit',
        borderTop: 'var(--border-1)',
        borderBottom: 'var(--border-1)',
        cursor: 'pointer',
        opacity: isArchived ? 0.6 : 1,
        transition: 'background .12s',
        ['--type-color' as string]: color,
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
          width: 4,
          background: color,
        }}
      />
      {/* 좌측 — 메타 */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--gray-400)',
              fontWeight: 500,
              minWidth: 28,
            }}
          >
            {project.id}
          </span>
          <span
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              color: isPaused ? 'var(--gray-700)' : 'var(--gray-900)',
              letterSpacing: 'var(--tracking-tight)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {project.name}
          </span>
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: isPaused ? 'var(--gray-400)' : 'var(--gray-500)',
            lineHeight: 'var(--leading-tight)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginLeft: 36,
          }}
        >
          {project.define}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            marginLeft: 36,
            marginTop: 4,
          }}
        >
          <span className={`chip ${statusChip.cls}`}>{statusChip.text}</span>
          {imp > 0 ? (
            <span className="imp-dots">
              {Array.from({ length: 5 }, (_, i) => {
                const active = i < imp;
                const cls = `imp-dot${active ? ' active' : ''}${active && high ? ' high' : ''}`;
                return <span key={i} className={cls} />;
              })}
            </span>
          ) : null}
        </div>
      </div>

      {/* 우측 — 액션 (이번 주 DID + NEXT) */}
      <div
        style={{
          minWidth: 0,
          borderLeft: '1px solid var(--gray-200)',
          paddingLeft: 'var(--sp-5)',
        }}
      >
        {did ? (
          <>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                marginBottom: 2,
              }}
            >
              DID
            </div>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: isPaused ? 'var(--gray-600)' : 'var(--gray-800)',
                fontWeight: 400,
                lineHeight: 'var(--leading-tight)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 'var(--sp-2)',
              }}
            >
              {did}
            </div>
          </>
        ) : null}
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--gray-400)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wide)',
            marginBottom: 2,
          }}
        >
          {nextLabel}
        </div>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: isPaused ? 'var(--gray-700)' : 'var(--gray-900)',
            fontWeight: 500,
            lineHeight: 'var(--leading-tight)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {nextAction ?? '—'}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'var(--sp-2)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-500)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
            }}
          >
            {typeLabel}
            {pct !== undefined ? ` · ${pct}%` : ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
