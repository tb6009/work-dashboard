import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import DailyActivityBar from '@/components/charts/DailyActivityBar';
import ProjectPie, { type PieSlice } from '@/components/charts/ProjectPie';
import ActiveProjectsGrid from '@/components/projects/ActiveProjectsGrid';
import ProjectComments from '@/components/ProjectComments';
import {
  loadWeek,
  loadRecentWeeks,
  getCurrentWeekId,
  getProject,
  PROJECTS,
} from '@/lib/data';
import {
  parseWeekId,
  getWeekRange,
  getCurrentWeekId as calCurrentWeekId,
} from '@/lib/calendar';
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/projectTypes';
import type { ProjectContribution, ProjectType } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const currentWeekId = await getCurrentWeekId();
  const week = await loadWeek(currentWeekId);
  const todayWeekId = calCurrentWeekId();

  // 최근 5주 — 데이터 있는 것만, 없으면 future placeholder 5개 채움
  const recentWeeks = await loadRecentWeeks(5);

  // ── 데이터 없을 때 fallback ────────────────────────────────
  if (!week) {
    return (
      <PageShell active="current">
        <EmptyState weekId={currentWeekId} />
      </PageShell>
    );
  }

  // 차트용 top 7
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

  // 프로젝트 ID → type 매핑 (차트 바 색상용)
  const projectTypeMap: Record<string, ProjectType> = {};
  for (const p of PROJECTS) {
    projectTypeMap[p.id] = p.type;
  }

  // 전체 프로젝트 — 00 personal 제외. 최신 작업 순 정렬.
  // 1) paused/archived는 맨 아래
  // 2) 이번 주 contribution pct 내림차순
  // 3) pct 동률이면 createdAt 내림차순 (신규가 위)
  // 4) 모두 동률이면 ID 오름차순
  const contribMap = new Map<string, ProjectContribution>(
    week.projects.map(p => [p.id, p]),
  );
  const allProjects = PROJECTS
    .filter(p => p.id !== '00')
    .sort((a, b) => {
      // 1) paused/archived 맨 아래
      const aDormant = a.status === 'paused' || a.status === 'archived';
      const bDormant = b.status === 'paused' || b.status === 'archived';
      if (aDormant !== bDormant) return aDormant ? 1 : -1;

      // 2) pct desc (이번 주 활동량)
      const aPct = contribMap.get(a.id)?.pct ?? 0;
      const bPct = contribMap.get(b.id)?.pct ?? 0;
      if (aPct !== bPct) return bPct - aPct;

      // 3) createdAt desc (신규가 위)
      if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;

      // 4) ID 오름차순 fallback
      const numA = parseInt(a.id, 10);
      const numB = parseInt(b.id, 10);
      if (numA !== numB) return numA - numB;
      return a.id.localeCompare(b.id);
    });

  const fmtRange = `${week.range.from} (월) ─ ${week.range.to} (일)`;
  const isCurrentWeek = week.week === todayWeekId;

  return (
    <PageShell active="current">
      {/* HERO */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
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
                marginBottom: 'var(--sp-2)',
              }}
            >
              {isCurrentWeek ? 'CURRENT WEEK' : `LATEST WEEK · ${week.week}`}
            </div>
            <h1
              style={{
                fontSize: 50,
                fontWeight: 300,
                color: 'var(--black)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1,
                marginBottom: 'var(--sp-2)',
              }}
            >
              {week.week}
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
          <div style={{ textAlign: 'right', maxWidth: 360 }}>
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
              {week.summary ?? '—'}
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
          <Kpi label="Active 프로젝트" value={week.kpis.activeProjects} meta={`${PROJECTS.length} 전체 중`} />
          <Kpi label="세션" value={week.kpis.sessions} meta={`${week.daily.filter(d => d.filesChanged > 0).length}일 활동`} />
          <Kpi label="신규 프로젝트" value={week.kpis.newProjects} meta={week.newProjects.join(' · ') || '—'} />
          <Kpi label="변경 파일" value={week.kpis.filesChanged} meta="md · tsx · html · sql" />
        </div>
      </section>

      {/* CHARTS */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 'var(--sp-5)',
          }}
        >
          <ChartCard title="일별 활동 강도" sub="대표 프로젝트 유형 색상 · 파일 변경 수">
            <DailyActivityBar daily={week.daily} projectTypeMap={projectTypeMap} />
          </ChartCard>
          <ChartCard title="프로젝트 비중" sub="% of changes">
            <ProjectPie slices={pieSlices} />
          </ChartCard>
        </div>
      </section>

      {/* PROJECT COMMENTS — from LifeOS Supabase */}
      <ProjectComments
        weekStart={week.range.from}
        weekEnd={week.range.to}
        projectTypeMap={projectTypeMap}
      />

      {/* DECISIONS TIMELINE */}
      {week.decisions.length > 0 ? (
        <section style={{ marginBottom: 'var(--sp-12)' }}>
          <SectionHead title="의사결정 타임라인" meta={`${week.decisions.length}건 · 가로 스크롤`} />
          <DecisionsTimeline decisions={week.decisions} />
        </section>
      ) : null}

      {/* RECENT WEEKS */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
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
            최근 주간 이동
          </h2>
          <Link
            href="/weekly"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-700)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            모든 주간 보기 →
          </Link>
        </div>
        <RecentWeeks weeks={recentWeeks.map(w => w.week)} currentWeekId={currentWeekId} />
      </section>

      {/* ACTIVE PROJECTS — v0.2 패턴 (외부 2열 + 내부 2열) */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 'var(--sp-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
            <h2
              style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 700,
                color: 'var(--black)',
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              전체 프로젝트
            </h2>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--gray-400)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {allProjects.length}개 · 최신 작업 순 · 클릭 → 상세
            </span>
          </div>
          <Link
            href="/projects"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-700)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            필터 + 전체 보기 →
          </Link>
        </div>
        <TypeColorIndex />
        <ActiveProjectsGrid projects={allProjects} contributions={contribMap} />
      </section>
    </PageShell>
  );
}

/* ─────────── Sub-components ─────────── */

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
        style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 700,
          color: 'var(--black)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 'var(--tracking-tight)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-500)',
          marginTop: 'var(--sp-3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {meta}
      </div>
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
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
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--sp-4)',
        }}
      >
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--gray-900)' }}>
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
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
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
        {title}
      </h2>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{meta}</div>
    </div>
  );
}

interface Decision {
  date: string;
  projectId: string;
  title: string;
  description: string;
  isMilestone?: boolean;
}

function DecisionsTimeline({ decisions }: { decisions: Decision[] }) {
  // 시간순 (오래된 → 최신) — 가로 타임라인 멘탈모델 유지
  const sorted = [...decisions].sort((a, b) => a.date.localeCompare(b.date));
  const milestones = sorted.filter((d) => d.isMilestone);
  const regulars = sorted.filter((d) => !d.isMilestone);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {milestones.length > 0 ? (
        <TimelineStrip label="MILESTONE" sublabel={`${milestones.length}건`} items={milestones} milestone />
      ) : null}
      {regulars.length > 0 ? (
        <TimelineStrip label="결정사항" sublabel={`${regulars.length}건`} items={regulars} />
      ) : null}
    </div>
  );
}

interface StripProps {
  label: string;
  sublabel?: string;
  items: Decision[];
  milestone?: boolean;
}

function TimelineStrip({ label, sublabel, items, milestone = false }: StripProps) {
  return (
    <div>
      {/* 행 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--sp-2)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wider)',
            background: milestone ? 'var(--black)' : 'transparent',
            color: milestone ? 'var(--white)' : 'var(--gray-500)',
            padding: milestone ? '2px 6px' : '0',
          }}
        >
          {label}
        </span>
        {sublabel ? (
          <span
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--gray-400)',
            }}
          >
            {sublabel}
          </span>
        ) : null}
      </div>

      {/* 가로 타임라인 */}
      <div style={{ position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 30,
            height: 1,
            background: milestone ? 'var(--gray-400)' : 'var(--gray-200)',
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: 'var(--sp-4)',
            overflowX: 'auto',
            paddingBottom: 'var(--sp-4)',
            position: 'relative',
          }}
        >
          {items.map((d, i) => {
            const ms = !!d.isMilestone;
            const dateObj = new Date(d.date + 'T00:00:00+09:00');
            const wd = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
            const datePart = d.date.slice(5);
            return (
              <article key={i} style={{ flexShrink: 0, width: 248 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-3)',
                    marginBottom: 'var(--sp-3)',
                  }}
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
    </div>
  );
}

function RecentWeeks({ weeks, currentWeekId }: { weeks: string[]; currentWeekId: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--sp-3)' }}>
      {weeks.slice(0, 5).map(wid => {
        const isCurrent = wid === currentWeekId;
        const parsed = parseWeekId(wid);
        const range = parsed ? getWeekRange(parsed.year, parsed.week) : null;
        return (
          <Link
            key={wid}
            href="/weekly"
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
              {wid}
            </div>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: isCurrent ? 'var(--white)' : 'var(--gray-700)',
                fontWeight: 500,
              }}
            >
              {range ? `${range.fromShort} ~ ${range.toShort}` : ''}
            </div>
            {isCurrent ? (
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 9,
                  fontWeight: 700,
                  background: 'var(--white)',
                  color: 'var(--black)',
                  padding: '1px 6px',
                  marginTop: 'var(--sp-3)',
                  letterSpacing: 'var(--tracking-wide)',
                }}
              >
                CURRENT
              </div>
            ) : null}
          </Link>
        );
      })}
      {/* fill empty slots if less than 5 */}
      {Array.from({ length: Math.max(0, 5 - weeks.length) }).map((_, i) => (
        <div
          key={`empty-${i}`}
          style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            padding: 'var(--sp-4)',
            color: 'var(--gray-300)',
            fontSize: 'var(--text-xs)',
            fontStyle: 'italic',
          }}
        >
          데이터 미수집
        </div>
      ))}
    </div>
  );
}

function TypeColorIndex() {
  const types = Object.keys(TYPE_COLOR) as ProjectType[];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        flexWrap: 'wrap',
        marginBottom: 'var(--sp-4)',
        padding: 'var(--sp-3) 0',
      }}
    >
      {types.map(type => (
        <div
          key={type}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              background: TYPE_COLOR[type],
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              color: 'var(--gray-500)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            {TYPE_LABEL[type]}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ weekId }: { weekId: string }) {
  return (
    <div
      style={{
        padding: 'var(--sp-16) var(--sp-12)',
        textAlign: 'center',
        background: 'var(--white)',
        border: 'var(--border-1)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-2xs)',
          fontWeight: 700,
          color: 'var(--gray-400)',
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          marginBottom: 'var(--sp-3)',
        }}
      >
        WEEKLY DATA NOT FOUND
      </div>
      <div
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--gray-700)',
          marginBottom: 'var(--sp-4)',
        }}
      >
        {weekId} 주간 데이터가 없습니다.
      </div>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-500)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        node scripts/extract-week.mjs {weekId}
      </div>
    </div>
  );
}
