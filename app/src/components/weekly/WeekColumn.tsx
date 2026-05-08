import Link from 'next/link';
import type { WeeklySnapshot } from '@/types/dashboard';
import ProjectTile from './ProjectTile';
import { parseWeekId, getWeekRange } from '@/lib/calendar';

type WeekState = 'current' | 'past' | 'empty' | 'future';

interface Props {
  /** 'YYYY-WXX' */
  weekId: string;
  /** 데이터 (없으면 empty/future 처리) */
  data: WeeklySnapshot | null;
  /** 현재 주차 ID (이거랑 같으면 current 표시) */
  currentWeekId: string;
  /** future/empty 구분 — 오늘 이후면 future, 이전이면 empty(백필 대기) */
  isFuture: boolean;
  /** 상위 N개만 표시. 기본 5 */
  topN?: number;
  /** 프로젝트 타일 클릭 시 갈 곳 (Q2=A: 톱 프로젝트 detail) */
  hrefForTopProject?: string;
}

export default function WeekColumn({
  weekId,
  data,
  currentWeekId,
  isFuture,
  topN = 5,
  hrefForTopProject,
}: Props) {
  const parsed = parseWeekId(weekId);
  if (!parsed) return null;
  const range = getWeekRange(parsed.year, parsed.week);

  let state: WeekState;
  if (weekId === currentWeekId) state = 'current';
  else if (data) state = 'past';
  else if (isFuture) state = 'future';
  else state = 'empty';

  const isInverse = state === 'current';
  const isInactive = state === 'empty' || state === 'future';

  const containerStyle: React.CSSProperties = {
    background: isInverse
      ? 'var(--black)'
      : isInactive
      ? 'var(--gray-50)'
      : 'var(--white)',
    border: '1px solid',
    borderColor: isInverse
      ? 'var(--black)'
      : isInactive
      ? 'var(--gray-200)'
      : 'var(--gray-300)',
    color: isInverse ? 'var(--white)' : 'inherit',
    minHeight: 360,
    display: 'flex',
    flexDirection: 'column',
    textDecoration: 'none',
    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
    cursor: isInactive ? 'default' : 'pointer',
  };

  // Body content
  let body: React.ReactNode;
  if (state === 'current' && !data) {
    body = (
      <EmptyMsg
        primary="아직 수집 안 됨"
        secondary={`다음 월요일에\n/주간업데이트 ${weekId}`}
        inverse={isInverse}
      />
    );
  } else if (state === 'future') {
    body = <EmptyMsg primary="예정" inverse={isInverse} />;
  } else if (state === 'empty') {
    body = <EmptyMsg primary="백필 대기" inverse={isInverse} />;
  } else if (data) {
    const sorted = [...data.projects].sort((a, b) => b.pct - a.pct);
    const top = sorted.slice(0, topN);
    const rest = sorted.length - topN;
    body = (
      <>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-3)',
            flex: 1,
          }}
        >
          {top.map(c => (
            <ProjectTile
              key={c.id}
              contribution={c}
              variant={isInverse ? 'inverse' : 'default'}
            />
          ))}
        </div>
        {rest > 0 ? (
          <Link
            href={hrefForTopProject ?? `/projects/${top[0]?.id ?? ''}`}
            style={{
              display: 'block',
              marginTop: 'var(--sp-3)',
              paddingTop: 'var(--sp-3)',
              borderTop: '1px dashed',
              borderTopColor: isInverse ? 'rgba(255,255,255,0.15)' : 'var(--gray-200)',
              fontSize: 'var(--text-xs)',
              color: isInverse ? 'var(--gray-400)' : 'var(--gray-500)',
              textDecoration: 'none',
              fontFamily: 'var(--font-mono)',
            }}
          >
            +{rest} more
          </Link>
        ) : null}
      </>
    );
  } else {
    body = null;
  }

  // Wrapper: 활성 카드는 Link, 비활성은 div
  const Inner = (
    <>
      <header
        style={{
          padding: 'var(--sp-4)',
          borderBottom: '1px solid',
          borderBottomColor: isInverse
            ? 'rgba(255,255,255,0.15)'
            : 'var(--gray-200)',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            color: isInverse ? 'var(--gray-300)' : 'var(--gray-500)',
            fontVariantNumeric: 'tabular-nums',
            marginBottom: 2,
          }}
        >
          {weekId}
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: isInverse
              ? 'rgba(255,255,255,0.85)'
              : isInactive
              ? 'var(--gray-300)'
              : 'var(--gray-700)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
          }}
        >
          {range.fromShort} ~ {range.toShort}
        </div>
        {state === 'current' ? (
          <span
            style={{
              position: 'absolute',
              top: 'var(--sp-4)',
              right: 'var(--sp-4)',
              background: 'var(--white)',
              color: 'var(--black)',
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 6px',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            CURRENT
          </span>
        ) : null}
      </header>
      <div
        style={{
          padding: 'var(--sp-4)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {body}
      </div>
    </>
  );

  if (isInactive || (state === 'current' && !data)) {
    return <div style={containerStyle}>{Inner}</div>;
  }

  // 클릭 가능 (current with data, or past with data)
  const topId = data?.projects[0]?.id;
  const href = hrefForTopProject ?? (topId ? `/projects/${topId}` : '#');
  return (
    <Link href={href} style={containerStyle}>
      {Inner}
    </Link>
  );
}

function EmptyMsg({
  primary,
  secondary,
  inverse,
}: {
  primary: string;
  secondary?: string;
  inverse: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: inverse ? 'rgba(255,255,255,0.5)' : 'var(--gray-300)',
        fontSize: 'var(--text-xs)',
        fontStyle: 'italic',
        whiteSpace: 'pre-line',
        lineHeight: 1.6,
      }}
    >
      <div>{primary}</div>
      {secondary ? <div style={{ marginTop: 4, fontSize: 10 }}>{secondary}</div> : null}
    </div>
  );
}

