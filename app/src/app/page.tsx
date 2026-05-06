import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import DailyActivityBar from '@/components/charts/DailyActivityBar';
import ProjectPie, { type PieSlice } from '@/components/charts/ProjectPie';
import { loadWeek, getProject, CURRENT_WEEK_ID } from '@/lib/data';
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/projectTypes';
import type { LabelStatus, ProjectContribution } from '@/types/dashboard';

const RECENT_WEEKS: Array<{ id: string; range: string; files: number; current?: boolean }> = [
  { id: '2026-W14', range: '04-06 ~ 04-12', files: 12 },
  { id: '2026-W15', range: '04-13 ~ 04-19', files: 38 },
  { id: '2026-W16', range: '04-20 ~ 04-26', files: 95 },
  { id: '2026-W17', range: '04-27 ~ 05-03', files: 68 },
  { id: '2026-W18', range: '04-27 ~ 05-03', files: 142, current: true },
];

const LABEL_MAP: Record<LabelStatus, { cls: string; text: string }> = {
  new:      { cls: 'chip-new',      text: 'NEW' },
  active:   { cls: 'chip-active',   text: 'ACTIVE' },
  paused:   { cls: 'chip-paused',   text: 'PAUSED' },
  archived: { cls: 'chip-archived', text: 'ARCHIVED' },
};

function ImpDots({ level }: { level: number }) {
  const high = level >= 4;
  return (
    <span className="imp-dots">
      {Array.from({ length: 5 }, (_, i) => {
        const active = i < level;
        const cls = `imp-dot${active ? ' active' : ''}${active && high ? ' high' : ''}`;
        return <span key={i} className={cls} />;
      })}
    </span>
  );
}

export default async function Home() {
  const week = await loadWeek(CURRENT_WEEK_ID);

  if (!week) {
    return (
      <PageShell active="current">
        <div style={{ padding: 'var(--sp-12)', color: 'var(--gray-500)' }}>
          주간 데이터를 찾을 수 없습니다 ({CURRENT_WEEK_ID}).
        </div>
      </PageShell>
    );
  }

  // Top 7 projects for pie
  const pieSlices: PieSlice[] = [...week.projects]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 7)
    .map(p => {
      const meta = getProject(p.id);
      return {
        id: p.id,
        name: meta?.name ?? p.id,
        value: p.pct,
        type: meta?.type ?? 'system',
      };
    });

  const fmtRange = `${week.range.from} (월) ─ ${week.range.to} (일)`;

  return (
    <PageShell active="current">
      {/* ─── Hero ─── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          className="flex justify-between"
          style={{ alignItems: 'flex-end', marginBottom: 'var(--sp-8)' }}
        >
          <div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wider)',
                marginBottom: 'var(--sp-2)',
              }}
            >
              CURRENT WEEK
            </div>
            <h1
              className="num"
              style={{
                fontSize: 50,
                fontWeight: 300,
                color: 'var(--black)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1,
                marginBottom: 'var(--sp-2)',
              }}
            >
              2026 · Week 18
            </h1>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-500)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmtRange}
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
              {week.summary}
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            border: 'var(--border-1)',
            background: 'var(--gray-200)',
          }}
        >
          <Kpi label="Active 프로젝트" value={week.kpis.activeProjects} meta="+2 this week" />
          <Kpi label="세션" value={week.kpis.sessions} meta="04-29 · 05-01~03" />
          <Kpi label="신규 프로젝트" value={week.kpis.newProjects} meta="32 · 061 · 062" />
          <Kpi label="변경 파일" value={week.kpis.filesChanged} meta="md · tsx · html · sql" />
        </div>
      </section>

      {/* ─── Charts Row ─── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: '2fr 1fr',
            gap: 'var(--sp-5)',
          }}
        >
          <ChartCard title="일별 활동 강도" sub="파일 변경 수 · md/tsx/html/json">
            <DailyActivityBar daily={week.daily} />
          </ChartCard>
          <ChartCard title="프로젝트 비중" sub="% of changes">
            <ProjectPie slices={pieSlices} />
          </ChartCard>
        </div>
      </section>

      {/* ─── Decision Timeline ─── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <SectionHead title="의사결정 타임라인" meta={`${week.decisions.length}건 · 가로 스크롤`} />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 30,
              height: 1,
              background: 'var(--gray-200)',
            }}
          />
          <div
            className="flex"
            style={{
              gap: 'var(--sp-4)',
              overflowX: 'auto',
              paddingBottom: 'var(--sp-4)',
              position: 'relative',
            }}
          >
            {week.decisions.map((d, i) => {
              const ms = !!d.isMilestone;
              const dateObj = new Date(d.date);
              const wd = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
              const datePart = d.date.slice(5);
              return (
                <article
                  key={i}
                  style={{ flexShrink: 0, width: 248 }}
                >
                  <div
                    className="flex items-center"
                    style={{ gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}
                  >
                    <div
                      style={{
                        width: ms ? 13 : 11,
                        height: ms ? 13 : 11,
                        borderRadius: '50%',
                        background: ms ? 'var(--black)' : 'var(--gray-700)',
                        boxShadow: '0 0 0 4px var(--gray-100)',
                      }}
                    />
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--gray-500)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {datePart} ({wd})
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'var(--white)',
                      border: ms ? '1px solid var(--black)' : 'var(--border-1)',
                      padding: 'var(--sp-4)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'var(--text-2xs)',
                        fontWeight: 600,
                        color: ms ? 'var(--black)' : 'var(--gray-500)',
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--tracking-wide)',
                        marginBottom: 'var(--sp-2)',
                      }}
                    >
                      PROJECT {d.projectId}
                      {ms ? ' · MILESTONE' : ''}
                    </div>
                    <h3
                      style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: 700,
                        color: 'var(--gray-900)',
                        marginBottom: 'var(--sp-2)',
                        letterSpacing: 'var(--tracking-tight)',
                      }}
                    >
                      {d.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--gray-500)',
                        lineHeight: 'var(--leading-relaxed)',
                      }}
                    >
                      {d.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Recent Weeks ─── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          className="flex justify-between"
          style={{ alignItems: 'baseline', marginBottom: 'var(--sp-5)' }}
        >
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--black)',
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            최근 주간 이동
          </h2>
          <a
            href="/weekly"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-700)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            모든 주간 보기 →
          </a>
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--sp-3)' }}
        >
          {RECENT_WEEKS.map(w => {
            const isCurrent = !!w.current;
            return (
              <a
                key={w.id}
                href="#"
                style={{
                  background: isCurrent ? 'var(--black)' : 'var(--white)',
                  border: isCurrent ? '1px solid var(--black)' : 'var(--border-1)',
                  padding: 'var(--sp-4)',
                  textDecoration: 'none',
                  display: 'block',
                  color: isCurrent ? 'var(--white)' : 'inherit',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'var(--font-mono)',
                    color: isCurrent ? 'var(--gray-300)' : 'var(--gray-500)',
                    marginBottom: 'var(--sp-1)',
                  }}
                >
                  {w.id}
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: isCurrent ? 'var(--white)' : 'var(--gray-700)',
                    fontWeight: 500,
                  }}
                >
                  {w.range}
                </div>
                <div
                  className="num"
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 700,
                    color: isCurrent ? 'var(--white)' : 'var(--black)',
                    marginTop: 'var(--sp-3)',
                  }}
                >
                  {w.files}
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: isCurrent ? 'var(--gray-300)' : 'var(--gray-400)',
                      fontWeight: 400,
                      marginLeft: 4,
                    }}
                  >
                    files
                  </span>
                </div>
                {isCurrent && (
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: 9,
                      fontWeight: 700,
                      background: 'var(--white)',
                      color: 'var(--black)',
                      padding: '1px 6px',
                      marginTop: 'var(--sp-2)',
                      letterSpacing: 'var(--tracking-wide)',
                    }}
                  >
                    CURRENT
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </section>

      {/* ─── Active Projects ─── */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <SectionHead
          title="Active 프로젝트"
          meta={`${week.projects.length}개 · 좌(메타) ─ 우(다음 액션) · 중요도 = 점`}
        />
        <div
          className="grid"
          style={{
            gridTemplateColumns: '1fr 1fr',
            columnGap: 10,
            rowGap: 1,
            background: 'var(--gray-200)',
          }}
        >
          {week.projects.map(p => (
            <ProjectTile key={p.id} contribution={p} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

/* ─── small subcomponents ─── */

function Kpi({ label, value, meta }: { label: string; value: number; meta: string }) {
  return (
    <div style={{ background: 'var(--white)', padding: 'var(--sp-5) var(--sp-6)' }}>
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
        {label}
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
        {value}
      </div>
      <div
        className="num"
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-500)',
          marginTop: 'var(--sp-3)',
        }}
      >
        {meta}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--white)',
        border: 'var(--border-1)',
        padding: 'var(--sp-6)',
      }}
    >
      <div
        className="flex justify-between"
        style={{ alignItems: 'baseline', marginBottom: 'var(--sp-4)' }}
      >
        <div
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            color: 'var(--gray-900)',
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      className="flex justify-between"
      style={{ alignItems: 'baseline', marginBottom: 'var(--sp-5)' }}
    >
      <h2
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--black)',
          letterSpacing: 'var(--tracking-tight)',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{meta}</div>
    </div>
  );
}

function ProjectTile({ contribution }: { contribution: ProjectContribution }) {
  const meta = getProject(contribution.id);
  const type = meta?.type ?? 'system';
  const status: LabelStatus = meta?.status ?? 'active';
  const label = LABEL_MAP[status];
  const typeColor = TYPE_COLOR[type];

  return (
    <Link
      href={`/projects/${contribution.id}`}
      style={{
        position: 'relative',
        background: 'var(--white)',
        padding: 'var(--sp-4) var(--sp-5) var(--sp-4) calc(var(--sp-5) + 4px)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
        gap: 'var(--sp-5)',
        alignItems: 'center',
        minHeight: 64,
        borderTop: 'var(--border-1)',
        borderBottom: 'var(--border-1)',
        color: 'inherit',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: typeColor,
        }}
      />
      {/* left: meta */}
      <div style={{ minWidth: 0 }}>
        <div
          className="flex items-center"
          style={{ gap: 'var(--sp-2)', marginBottom: 2 }}
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
            #{contribution.id}
          </span>
          <span
            style={{
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              color: 'var(--gray-900)',
              letterSpacing: 'var(--tracking-tight)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {meta?.name ?? contribution.id}
          </span>
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-500)',
            lineHeight: 'var(--leading-tight)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginLeft: 36,
          }}
        >
          {meta?.define ?? ''}
        </div>
        <div
          className="flex items-center"
          style={{ gap: 'var(--sp-2)', marginLeft: 36, marginTop: 4 }}
        >
          <span className={`chip ${label.cls}`}>{label.text}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: typeColor,
              letterSpacing: '0.06em',
            }}
          >
            {TYPE_LABEL[type]}
          </span>
          <ImpDots level={contribution.imp} />
        </div>
      </div>
      {/* right: NEXT */}
      <div
        style={{
          minWidth: 0,
          borderLeft: '1px solid var(--gray-200)',
          paddingLeft: 'var(--sp-5)',
        }}
      >
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
          NEXT
        </div>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-900)',
            fontWeight: 500,
            lineHeight: 'var(--leading-tight)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {contribution.nextAction ?? ''}
        </div>
        <div
          className="flex justify-between"
          style={{ alignItems: 'center', marginTop: 'var(--sp-2)' }}
        >
          <span
            className="num"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-500)',
              fontWeight: 500,
            }}
          >
            contribution · {contribution.pct}%
          </span>
        </div>
      </div>
    </Link>
  );
}
