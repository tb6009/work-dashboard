import type { ProjectWorkData } from '@/types/projectWork';
import FileLink from './FileLink';

interface Props { data: ProjectWorkData; }

/** 3-column work panel for /projects/[id]:
 *  [01 현재 상황] | [02 작업 결과물] | [03 다음 작업] */
export default function ProjectWorkPanel({ data }: Props) {
  return (
    <section
      style={{
        background: 'var(--white)',
        border: 'var(--border-1)',
        marginBottom: 'var(--sp-12)',
      }}
    >
      <header
        style={{
          padding: 'var(--sp-4) var(--sp-6)',
          borderBottom: 'var(--border-1)',
          background: 'var(--gray-50)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-2xs)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--gray-700)',
          }}
        >
          WORK PANEL
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
          현재 상황 · 결과물 · 다음 작업
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 0,
          background: 'var(--gray-200)',
        }}
      >
        <Column1 data={data} />
        <Column2 data={data} />
        <Column3 data={data} />
      </div>
    </section>
  );
}

/* ───────── Column 1 — 현재 상황 ───────── */
function Column1({ data }: { data: ProjectWorkData }) {
  const cs = data.currentSituation;
  return (
    <div style={{ background: 'var(--white)', padding: 'var(--sp-6)' }}>
      <ColHeader index={1} title="현재 상황" subtitle="LOGS · 진행 단계" />

      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--gray-900)',
          fontWeight: 500,
          lineHeight: 'var(--leading-relaxed)',
          marginBottom: 'var(--sp-5)',
        }}
      >
        {cs.summary}
      </p>

      {cs.phase && (
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-500)',
            paddingBottom: 'var(--sp-4)',
            marginBottom: 'var(--sp-4)',
            borderBottom: '1px solid var(--gray-100)',
          }}
        >
          <span style={miniLabelStyle}>PHASE</span>
          <div style={{ marginTop: 2 }}>{cs.phase}</div>
        </div>
      )}

      <div style={miniLabelStyle}>RECENT LOGS</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--sp-3) 0 0' }}>
        {cs.recentLogs.map((log, i) => (
          <li
            key={i}
            style={{
              paddingBottom: 'var(--sp-3)',
              marginBottom: 'var(--sp-3)',
              borderBottom: '1px solid var(--gray-100)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--gray-500)',
                fontFamily: 'var(--font-mono)',
                marginBottom: 4,
              }}
            >
              {log.date}
            </div>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-900)',
                fontWeight: 600,
                lineHeight: 'var(--leading-tight)',
                marginBottom: 4,
              }}
            >
              {log.title}
            </div>
            {log.excerpt && (
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--gray-500)',
                  lineHeight: 'var(--leading-relaxed)',
                  marginBottom: 6,
                }}
              >
                {log.excerpt}
              </p>
            )}
            <FileLink filePath={log.logFilePath} fileKind="md" />
          </li>
        ))}
      </ul>

      {cs.blockers && cs.blockers.length > 0 && (
        <div
          style={{
            marginTop: 'var(--sp-5)',
            padding: 'var(--sp-3) var(--sp-4)',
            background: 'var(--warm-100)',
            borderLeft: '3px solid var(--warm-700)',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-wide)',
              color: 'var(--warm-700)',
              textTransform: 'uppercase',
              marginBottom: 'var(--sp-2)',
            }}
          >
            BLOCKERS
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {cs.blockers.map((b, i) => {
              if (typeof b === 'string') {
                return (
                  <li
                    key={i}
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--gray-700)',
                      lineHeight: 'var(--leading-relaxed)',
                      marginBottom: 4,
                    }}
                  >
                    — {b}
                  </li>
                );
              }
              const sevColor = b.severity === 'resolved'
                ? 'var(--gray-400)'
                : b.severity === 'permanent'
                  ? 'var(--warm-700)'
                  : 'var(--gray-700)';
              return (
                <li
                  key={i}
                  style={{
                    marginBottom: 'var(--sp-3)',
                    paddingBottom: 'var(--sp-3)',
                    borderBottom: i < cs.blockers!.length - 1 ? '1px solid var(--warm-200, #e8ddd0)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                    {b.severity && (
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: 'var(--tracking-wide)',
                          textTransform: 'uppercase',
                          color: sevColor,
                        }}
                      >
                        {b.severity === 'resolved' ? 'RESOLVED' : b.severity === 'permanent' ? 'RULE' : b.severity.toUpperCase()}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: b.severity === 'resolved' ? 'var(--gray-500)' : 'var(--gray-900)',
                        textDecoration: b.severity === 'resolved' ? 'line-through' : 'none',
                      }}
                    >
                      {b.title}
                    </span>
                  </div>
                  {b.description && (
                    <p
                      style={{
                        fontSize: 'var(--text-2xs)',
                        color: 'var(--gray-500)',
                        lineHeight: 'var(--leading-relaxed)',
                        margin: 0,
                      }}
                    >
                      {b.description}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────── Column 2 — 결과물 ───────── */
function Column2({ data }: { data: ProjectWorkData }) {
  return (
    <div style={{ background: 'var(--white)', padding: 'var(--sp-6)' }}>
      <ColHeader index={2} title="작업 결과물" subtitle="DELIVERABLES · 클릭 → VS Code" />
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {data.deliverables.map((d, i) => (
          <li
            key={i}
            style={{
              paddingBottom: 'var(--sp-4)',
              marginBottom: 'var(--sp-4)',
              borderBottom: '1px solid var(--gray-100)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-900)',
                fontWeight: 600,
                lineHeight: 'var(--leading-tight)',
                marginBottom: 4,
              }}
            >
              {d.title}
            </div>
            <p
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--gray-500)',
                lineHeight: 'var(--leading-relaxed)',
                marginBottom: 6,
              }}
            >
              {d.summary}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--sp-3)',
              }}
            >
              <FileLink filePath={d.filePath} fileKind={d.fileKind} />
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--gray-400)',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {d.modifiedAt}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────── Column 3 — 다음 작업 ───────── */
function Column3({ data }: { data: ProjectWorkData }) {
  return (
    <div style={{ background: 'var(--white)', padding: 'var(--sp-6)' }}>
      <ColHeader index={3} title="다음 작업" subtitle="NEXT TASKS · 우선순위" />
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {data.nextTasks.map((t, i) => (
          <li
            key={i}
            style={{
              paddingBottom: 'var(--sp-4)',
              marginBottom: 'var(--sp-4)',
              borderBottom: '1px solid var(--gray-100)',
              display: 'grid',
              gridTemplateColumns: '24px 1fr',
              gap: 'var(--sp-3)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: 'var(--gray-300)',
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.2,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 'var(--sp-2)',
                  marginBottom: 4,
                }}
              >
                <h4
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gray-900)',
                    fontWeight: 700,
                    lineHeight: 'var(--leading-tight)',
                    margin: 0,
                  }}
                >
                  {t.title}
                </h4>
                {t.priority && <PriorityBadge priority={t.priority} />}
              </div>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--gray-500)',
                  lineHeight: 'var(--leading-relaxed)',
                  marginBottom: 6,
                }}
              >
                {t.description}
              </p>
              {t.estimate && (
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--gray-400)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: 'var(--tracking-wide)',
                  }}
                >
                  EST · {t.estimate}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────── helpers ───────── */
const miniLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 'var(--tracking-wide)',
  color: 'var(--gray-400)',
  textTransform: 'uppercase',
};

function ColHeader({ index, title, subtitle }: { index: number; title: string; subtitle: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 'var(--sp-3)',
        paddingBottom: 'var(--sp-3)',
        marginBottom: 'var(--sp-4)',
        borderBottom: '2px solid var(--gray-300)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--gray-400)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        0{index}
      </span>
      <h3
        style={{
          fontSize: 'var(--text-base)',
          fontWeight: 700,
          color: 'var(--gray-900)',
          letterSpacing: 'var(--tracking-tight)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      <span
        style={{
          fontSize: 9,
          color: 'var(--gray-400)',
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
          marginLeft: 'auto',
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: 'high' | 'mid' | 'low' }) {
  const map = {
    high: { bg: 'var(--black)', fg: 'var(--white)', label: 'HIGH' },
    mid:  { bg: 'var(--gray-200)', fg: 'var(--gray-700)', label: 'MID' },
    low:  { bg: 'var(--gray-100)', fg: 'var(--gray-400)', label: 'LOW' },
  }[priority];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 'var(--tracking-wide)',
        padding: '2px 6px',
        background: map.bg,
        color: map.fg,
        flexShrink: 0,
      }}
    >
      {map.label}
    </span>
  );
}
