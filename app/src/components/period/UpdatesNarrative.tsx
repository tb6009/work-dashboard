import type { WeeklySnapshot } from '@/types/dashboard';
import { lookupProject } from '@/lib/projects';

interface Props {
  week: WeeklySnapshot;
  /** 표시할 milestone 최대 수. 기본 4. */
  limit?: number;
}

/** 업데이트 서술 — 일별 활동 강도 차트 아래 동반.
 *  week.summary 1줄 + 최근 milestone 결정 4건 (최신순) bullet. */
export default function UpdatesNarrative({ week, limit = 4 }: Props) {
  const milestones = [...week.decisions]
    .filter((d) => d.isMilestone)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  if (milestones.length === 0 && !week.summary) return null;

  return (
    <div
      style={{
        marginTop: 'var(--sp-4)',
        paddingTop: 'var(--sp-4)',
        borderTop: '1px dashed var(--gray-200)',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          letterSpacing: 'var(--tracking-wider)',
          color: 'var(--gray-400)',
          textTransform: 'uppercase',
          marginBottom: 'var(--sp-2)',
        }}
      >
        업데이트 요약 · {week.week}
      </div>

      {week.summary ? (
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-700)',
            lineHeight: 'var(--leading-relaxed)',
            margin: '0 0 var(--sp-3) 0',
          }}
        >
          {week.summary}
        </p>
      ) : null}

      {milestones.length > 0 ? (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {milestones.map((d, i) => {
            const meta = lookupProject(d.projectId);
            return (
              <li
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 1fr',
                  gap: 'var(--sp-3)',
                  alignItems: 'baseline',
                  fontSize: 'var(--text-xs)',
                  lineHeight: 'var(--leading-relaxed)',
                  paddingLeft: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--gray-400)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {d.date.slice(5)}
                </span>
                <span style={{ color: 'var(--gray-700)' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--black)',
                      marginRight: 4,
                    }}
                  >
                    ★
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{d.title}</span>
                  {meta ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: 'var(--gray-400)',
                        marginLeft: 6,
                      }}
                    >
                      [{d.projectId}]
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
