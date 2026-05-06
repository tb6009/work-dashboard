import PageShell from '@/components/layout/PageShell';
import TypeStackedArea from '@/components/charts/TypeStackedArea';
import ProjectGantt, { type GanttRow } from '@/components/charts/ProjectGantt';
import { TYPE_COLOR, TYPE_LABEL, WARM_GRAY, GREY } from '@/lib/projectTypes';
import type { ProjectType } from '@/types/dashboard';

/** Next.js 16 dynamic route — `params` is a Promise. */
interface PageProps {
  params: Promise<{ year: string }>;
}

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

interface MonthCell {
  name: string;
  files?: number;
  top?: string;
  topType?: ProjectType;
  ms?: string;
  current?: boolean;
  future?: boolean;
}

const MONTH_CELLS: MonthCell[] = [
  { name: '1월',  files: 5,   top: undefined,         topType: undefined, ms: undefined },
  { name: '2월',  files: 55,  top: 'DSAPG',           topType: 'research', ms: '박사논문 트랙 시작' },
  { name: '3월',  files: 173, top: 'DSAPG',           topType: 'research', ms: '레퍼런스 시스템 완성' },
  { name: '4월',  files: 213, top: '51 페르소나',      topType: 'research', ms: '51 신규 등록' },
  { name: '5월',  files: 142, top: '061 LifeOS',      topType: 'product',  ms: 'LifeOS 1일 배포', current: true },
  { name: '6월',  future: true },
  { name: '7월',  future: true },
  { name: '8월',  future: true },
  { name: '9월',  future: true },
  { name: '10월', future: true },
  { name: '11월', future: true },
  { name: '12월', future: true },
];

const COMPOSITION: Record<ProjectType, number[]> = {
  research:   [2, 35, 130, 95, 25, 0, 0, 0, 0, 0, 0, 0],
  publishing: [0,  5,  15, 20, 18, 0, 0, 0, 0, 0, 0, 0],
  education:  [0,  3,   8, 18, 14, 0, 0, 0, 0, 0, 0, 0],
  product:    [1,  4,   8, 30, 60, 0, 0, 0, 0, 0, 0, 0],
  design:     [1,  3,   6, 22,  8, 0, 0, 0, 0, 0, 0, 0],
  data:       [1,  3,   4, 20,  9, 0, 0, 0, 0, 0, 0, 0],
  system:     [0,  2,   2,  8,  8, 0, 0, 0, 0, 0, 0, 0],
};

const GANTT_ROWS: GanttRow[] = [
  { yIndex: 0,  start: 1, end: 4.2, name: '05 DSAPG',          type: 'research' },
  { yIndex: 1,  start: 3, end: 4.2, name: '21 CPSF',           type: 'research' },
  { yIndex: 2,  start: 3, end: 4.2, name: '51 페르소나',        type: 'research' },
  { yIndex: 3,  start: 3, end: 4.2, name: '091 출판',          type: 'publishing' },
  { yIndex: 4,  start: 2, end: 4.2, name: '12 Data_Study',     type: 'education' },
  { yIndex: 5,  start: 2, end: 4.2, name: '31 촬영',           type: 'education' },
  { yIndex: 6,  start: 3, end: 4.2, name: '32 강연',           type: 'education' },
  { yIndex: 7,  start: 0, end: 4.2, name: '10 일상다반사',      type: 'product' },
  { yIndex: 8,  start: 3, end: 4.2, name: '061 LifeOS',        type: 'product' },
  { yIndex: 9,  start: 4, end: 4.2, name: '062 논문리더',       type: 'product' },
  { yIndex: 10, start: 4, end: 4.2, name: '063 workDashboard', type: 'product' },
  { yIndex: 11, start: 2, end: 4.2, name: '06 AI_Design',      type: 'design' },
  { yIndex: 12, start: 2, end: 4.2, name: '03 J스트라타',       type: 'design' },
  { yIndex: 13, start: 1, end: 4.2, name: '03 Data_Once',      type: 'data' },
  { yIndex: 14, start: 3, end: 4.2, name: '00 personal',       type: 'system' },
];

interface Milestone {
  date: string;
  type: ProjectType;
  title: string;
  milestone?: boolean;
}

const MILESTONES: Milestone[] = [
  { date: '2026-02-XX', type: 'research',   title: 'DSAPG 박사논문 트랙 시작' },
  { date: '2026-03-29', type: 'design',     title: 'AI_Design 시작' },
  { date: '2026-04-15', type: 'design',     title: 'J스트라타 가이드라인' },
  { date: '2026-04-19', type: 'research',   title: 'DSAPG 레퍼런스 시스템 완성' },
  { date: '2026-04-24', type: 'system',     title: '관리 마스터 구축' },
  { date: '2026-04-25', type: 'research',   title: 'CPSF 프로포절 SAI 프레임 확정 / 보살피고 v1.5β' },
  { date: '2026-04-27', type: 'research',   title: '51 페르소나 신규 등록' },
  { date: '2026-04-29', type: 'education',  title: '32 강연시리즈 트랙 신설 / 00_personal' },
  { date: '2026-05-02', type: 'product',    title: 'LifeOS 1일 배포', milestone: true },
  { date: '2026-05-03', type: 'product',    title: '하루 캐릭터 통합' },
  { date: '2026-05-05', type: 'product',    title: '062 논문리더 / 063 workDashboard 시작' },
];

const INSIGHTS = [
  '박사논문 두 트랙 동시 진행 (DSAPG, CPSF)',
  '신규 프로젝트 7개 — 가속 페이즈 진입',
  '출판 기획 첫 실행 (091)',
  '관리 마스터 체계 구축 → 27개 프로젝트 동시 운영 가능',
];

export default async function YearlyPage({ params }: PageProps) {
  const { year } = await params;

  if (year !== '2026') {
    return (
      <PageShell active="yearly">
        <div
          style={{
            padding: 'var(--sp-12)',
            background: 'var(--white)',
            border: 'var(--border-1)',
            textAlign: 'center',
            color: 'var(--gray-500)',
          }}
        >
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--gray-900)' }}>
            {year}
          </div>
          <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-sm)' }}>
            해당 연도의 데이터가 없습니다.
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell active="yearly">
      {/* ── Hero ─────────────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-8)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wider)',
                marginBottom: 'var(--sp-3)',
              }}
            >
              YEARLY OVERVIEW
            </div>
            <h1
              className="num"
              style={{
                fontSize: 80,
                fontWeight: 300,
                color: 'var(--black)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1,
                marginBottom: 'var(--sp-3)',
              }}
            >
              {year}
            </h1>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-500)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              5월 5일까지 · 27 프로젝트 · 누적 ~600 변경
            </div>
          </div>
          <div style={{ textAlign: 'right', maxWidth: 320 }}>
            <div
              style={{
                fontSize: 'var(--text-2xs)',
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                marginBottom: 'var(--sp-2)',
              }}
            >
              한 줄 요약
            </div>
            <div
              style={{
                fontSize: 'var(--text-base)',
                color: 'var(--gray-700)',
                fontWeight: 500,
                lineHeight: 'var(--leading-relaxed)',
              }}
            >
              박사논문 두 트랙 동시 진행 · 신규 프로젝트 가속
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            border: 'var(--border-1)',
            background: 'var(--gray-200)',
          }}
        >
          {[
            { label: '총 변경 파일', value: '596', meta: 'md · tsx · html · sql' },
            { label: 'Active 프로젝트', value: '15', meta: 'of 27 total' },
            { label: '신규 (YTD)', value: '7', meta: '32 · 51 · 00 · 061 · 062 · 063 · 091' },
            { label: '결정 (Milestones)', value: '18', meta: '2건/월 평균' },
          ].map(k => (
            <div
              key={k.label}
              style={{
                background: 'var(--white)',
                padding: 'var(--sp-5) var(--sp-6)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-2xs)',
                  fontWeight: 600,
                  color: 'var(--gray-400)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-wide)',
                  marginBottom: 'var(--sp-3)',
                }}
              >
                {k.label}
              </div>
              <div
                className="num"
                style={{
                  fontSize: 'var(--text-4xl)',
                  fontWeight: 700,
                  color: 'var(--black)',
                  lineHeight: 1,
                }}
              >
                {k.value}
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--gray-500)',
                  marginTop: 'var(--sp-3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {k.meta}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 12-Month Grid ───────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-5)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--black)',
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            월별 활동 그리드
          </h2>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
            3 × 4 · 1~5월 actual · 6~12월 placeholder
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            background: 'var(--gray-200)',
            border: 'var(--border-1)',
          }}
        >
          {MONTH_CELLS.map(m => (
            <div
              key={m.name}
              style={{
                background: m.future ? 'var(--gray-50)' : 'var(--white)',
                padding: 'var(--sp-5) var(--sp-5) var(--sp-4)',
                minHeight: 132,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              {m.current && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'var(--sp-4)',
                    right: 'var(--sp-5)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 'var(--tracking-wide)',
                    background: 'var(--black)',
                    color: 'var(--white)',
                    padding: '2px 6px',
                  }}
                >
                  CURRENT
                </div>
              )}
              <div style={{ marginBottom: 'var(--sp-3)' }}>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: m.future ? 'var(--gray-300)' : 'var(--gray-500)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: 'var(--tracking-wide)',
                  }}
                >
                  {m.name}
                </div>
              </div>

              <div
                className="num"
                style={{
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 700,
                  color: m.future ? 'var(--gray-300)' : 'var(--black)',
                  lineHeight: 1,
                }}
              >
                {m.future ? '—' : m.files}
                {!m.future && (
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--gray-400)',
                      fontWeight: 400,
                      marginLeft: 4,
                    }}
                  >
                    files
                  </span>
                )}
              </div>

              {m.future ? (
                <div style={{ marginTop: 'var(--sp-3)', marginBottom: 4 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-300)' }}>
                    미래
                  </span>
                </div>
              ) : m.top && m.topType ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-2)',
                    marginTop: 'var(--sp-3)',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      flexShrink: 0,
                      background: TYPE_COLOR[m.topType],
                    }}
                  />
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--gray-700)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {m.top}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: TYPE_COLOR[m.topType],
                      letterSpacing: '0.06em',
                    }}
                  >
                    {TYPE_LABEL[m.topType]}
                  </span>
                </div>
              ) : (
                <div style={{ marginTop: 'var(--sp-3)', marginBottom: 4 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-300)' }}>—</span>
                </div>
              )}

              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: m.future ? 'var(--gray-300)' : 'var(--gray-500)',
                  lineHeight: 'var(--leading-tight)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.future ? '—' : m.ms || '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stacked Area ────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            background: 'var(--white)',
            border: 'var(--border-1)',
            padding: 'var(--sp-6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 'var(--sp-4)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  color: 'var(--gray-900)',
                }}
              >
                프로젝트 유형별 비중 (월별)
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                stacked area · % of monthly file changes
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
              2026 · 1~5월 actual
            </div>
          </div>

          <TypeStackedArea composition={COMPOSITION} months={MONTHS} />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--sp-4)',
              marginTop: 'var(--sp-4)',
            }}
          >
            {(Object.keys(TYPE_COLOR) as ProjectType[]).map(t => (
              <div
                key={t}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--gray-500)',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: TYPE_COLOR[t],
                  }}
                />
                <span>{TYPE_LABEL[t]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gantt ───────────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            background: 'var(--white)',
            border: 'var(--border-1)',
            padding: 'var(--sp-6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 'var(--sp-4)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  color: 'var(--gray-900)',
                }}
              >
                프로젝트 라이프사이클
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                top 15 · active span across 12 months · today marker
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
              vertical line = today (5/5)
            </div>
          </div>

          <ProjectGantt
            rows={GANTT_ROWS}
            todayX={4.15}
            todayLabel="TODAY 5/5"
            months={MONTHS}
          />
        </div>
      </section>

      {/* ── Vertical Milestone Timeline ─────────────── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-5)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--black)',
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            연간 결정 타임라인
          </h2>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
            11건 · 시간순
          </div>
        </div>

        <div
          className="vtimeline"
          style={{
            position: 'relative',
            paddingLeft: 'var(--sp-8)',
          }}
        >
          <div
            style={{
              content: "''",
              position: 'absolute',
              left: 7,
              top: 8,
              bottom: 8,
              width: 1,
              background: 'var(--gray-200)',
            }}
          />
          {MILESTONES.map((m, i) => {
            const isMs = !!m.milestone;
            return (
              <div
                key={i}
                className="vt-item"
                style={{
                  position: 'relative',
                  paddingBottom: i === MILESTONES.length - 1 ? 0 : 'var(--sp-6)',
                }}
              >
                <div
                  className={`vt-dot${isMs ? ' milestone' : ''}`}
                  style={{
                    position: 'absolute',
                    left: isMs ? 'calc(var(--sp-8) * -1 + 1px)' : 'calc(var(--sp-8) * -1 + 2px)',
                    top: isMs ? 5 : 6,
                    width: isMs ? 13 : 11,
                    height: isMs ? 13 : 11,
                    borderRadius: '50%',
                    background: isMs ? 'var(--black)' : 'var(--gray-700)',
                    boxShadow: '0 0 0 4px var(--white)',
                  }}
                />
                <div
                  className="vt-row"
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 'var(--sp-4)',
                    marginBottom: 4,
                  }}
                >
                  <div
                    className="vt-date"
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--gray-500)',
                      fontFamily: 'var(--font-mono)',
                      minWidth: 76,
                    }}
                  >
                    {m.date}
                  </div>
                  <div
                    className={`vt-tag${isMs ? ' milestone' : ''}`}
                    style={{
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--tracking-wide)',
                      padding: '2px 8px',
                      ...(isMs
                        ? { background: 'var(--gray-900)', color: 'var(--white)' }
                        : { background: `${TYPE_COLOR[m.type]}33`, color: TYPE_COLOR[m.type] }),
                    }}
                  >
                    {isMs ? 'MILESTONE · ' : ''}
                    {TYPE_LABEL[m.type]}
                  </div>
                </div>
                <div
                  className={`vt-title${isMs ? ' milestone' : ''}`}
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: isMs ? 700 : 600,
                    color: 'var(--gray-900)',
                    letterSpacing: 'var(--tracking-tight)',
                    paddingLeft: 92,
                  }}
                >
                  {m.title}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Insight box ─────────────────────────────── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            background: WARM_GRAY[100],
            padding: 'var(--sp-8)',
            borderLeft: `4px solid ${GREY.black}`,
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              color: 'var(--gray-500)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wider)',
              marginBottom: 'var(--sp-4)',
            }}
          >
            Annual Insight · 2026 1H
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {INSIGHTS.map((it, i) => (
              <li
                key={i}
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--gray-900)',
                  lineHeight: 'var(--leading-relaxed)',
                  fontWeight: 500,
                  paddingLeft: 'var(--sp-5)',
                  position: 'relative',
                  marginBottom: i === INSIGHTS.length - 1 ? 0 : 'var(--sp-2)',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: 'var(--gray-400)',
                    fontWeight: 400,
                  }}
                >
                  —
                </span>
                {it}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
