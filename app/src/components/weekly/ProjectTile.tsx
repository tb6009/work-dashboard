import type { ProjectContribution } from '@/types/dashboard';
import { getProject } from '@/lib/data';
import { TYPE_COLOR } from '@/lib/projectTypes';

interface Props {
  contribution: ProjectContribution;
  variant?: 'default' | 'inverse'; // 'inverse' = 검정 배경(current week)
}

/** Weekly 페이지의 한 주 컬럼 안에 들어가는 1개 프로젝트 라인.
 *  - 좌측 3px 컬러 스트립 (type 색)
 *  - ID + 이름 + imp dots 한 줄
 *  - did 텍스트 1-2줄 */
export default function ProjectTile({ contribution, variant = 'default' }: Props) {
  const meta = getProject(contribution.id);
  if (!meta) return null;

  const color = TYPE_COLOR[meta.type];
  const inverse = variant === 'inverse';

  return (
    <div
      style={{
        position: 'relative',
        padding: '6px 12px 6px 14px',
        background: inverse ? 'rgba(255,255,255,0.04)' : 'transparent',
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
      <div
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: inverse ? 'var(--white)' : 'var(--gray-900)',
          lineHeight: 1.3,
          marginBottom: 2,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: inverse ? 'var(--gray-400)' : 'var(--gray-400)',
            fontVariantNumeric: 'tabular-nums',
            marginRight: 4,
          }}
        >
          {contribution.id}
        </span>
        <span>{meta.name}</span>
        <ImpDots level={contribution.imp} inverse={inverse} />
      </div>
      {contribution.did ? (
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: inverse ? 'rgba(255,255,255,0.75)' : 'var(--gray-700)',
            lineHeight: 1.4,
          }}
        >
          {contribution.did}
        </div>
      ) : null}
    </div>
  );
}

function ImpDots({ level, inverse }: { level: number; inverse: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 2,
        marginLeft: 4,
        verticalAlign: 'middle',
      }}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const active = i < level;
        const bg = active
          ? inverse ? 'var(--white)' : 'var(--gray-700)'
          : inverse ? 'rgba(255,255,255,0.2)' : 'var(--gray-200)';
        return (
          <span
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: bg,
              display: 'inline-block',
            }}
          />
        );
      })}
    </span>
  );
}
