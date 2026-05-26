import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';
import WeeklyContributionBar from '@/components/charts/WeeklyContributionBar';
import ProjectWorkPanel from '@/components/ProjectWorkPanel';
import { getProject, loadWeek, loadProjectWork, loadProjectDailyActivity, getCurrentWeekId } from '@/lib/data';
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/projectTypes';
import ProjectActivityFeed from '@/components/period/ProjectActivityFeed';

function buildWeekly(currentPct: number) {
  return [
    { week: 'W14', pct: 0 },
    { week: 'W15', pct: 0 },
    { week: 'W16', pct: 0 },
    { week: 'W17', pct: 0 },
    { week: 'W18', pct: currentPct, current: true },
  ];
}

function formatCreated(iso: string): { iso: string; rel: string } {
  const created = new Date(iso + 'T00:00:00+09:00');
  const today = new Date('2026-05-06T00:00:00+09:00');
  const diff = Math.round((today.getTime() - created.getTime()) / 86400000);
  let rel = '';
  if (diff === 0) rel = '오늘';
  else if (diff === 1) rel = '1일 전';
  else rel = `${diff}일 전`;
  return { iso, rel };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const typeColor = TYPE_COLOR[project.type];
  const typeLabel = TYPE_LABEL[project.type];

  const work = await loadProjectWork(id);
  const currentWeekId = await getCurrentWeekId();
  const week = await loadWeek(currentWeekId);
  const contribution = week?.projects.find(p => p.id === id);
  const currentPct = contribution?.pct ?? 0;
  const filesChanged = contribution?.filesChanged ?? 0;
  const activities = await loadProjectDailyActivity(id);
  const totalImages = activities.reduce((s, a) => s + (a.images?.length ?? 0), 0);

  return (
    <PageShell active="projects">
      <Crumbs id={id} typeLabel={typeLabel} name={project.name} />
      <Hero project={project} typeColor={typeColor} typeLabel={typeLabel} />

      {work ? (
        <>
          {/* ── KPI ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
              border: 'var(--border-1)',
              background: 'var(--gray-200)',
              marginBottom: 'var(--sp-10)',
            }}
          >
            <Kpi label="총 변경 파일" value={String(filesChanged)} meta={`이번 주 (${currentWeekId})`} />
            <Kpi label="결과물" value={String(work.deliverables.length)} meta="클릭 → VS Code" />
            <Kpi label="다음 작업" value={String(work.nextTasks.length)} meta="우선순위순" />
            <Kpi
              label="Contribution"
              value={
                <>
                  <span className="num">{currentPct}</span>
                  <span style={{ fontSize: 24, fontWeight: 500, color: 'var(--gray-500)', marginLeft: 2 }}>%</span>
                </>
              }
              meta={`${currentWeekId} 기준`}
            />
          </div>

          {/* ── 3-column WORK PANEL (현재 상황 / 결과물 / 다음 작업) ── */}
          <ProjectWorkPanel data={work} />

          {/* ── 일간 활동 feed (entries + images, 최신순) ── */}
          <section style={{ marginBottom: 'var(--sp-12)' }}>
            <SectionHead
              title="일간 활동"
              meta={`${activities.length}일 · ${totalImages} 이미지 · 최신순`}
            />
            <ProjectActivityFeed activities={activities} />
          </section>

          {/* ── Weekly Contribution Chart ── */}
          <section style={{ marginBottom: 'var(--sp-12)' }}>
            <SectionHead title="주간 Contribution" meta="% of week's total file changes · W14 ~ W18" />
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
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--gray-900)' }}>
                  주간 비중 추이
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                  W18 = warm-900 (current)
                </div>
              </div>
              <WeeklyContributionBar data={buildWeekly(currentPct)} />
            </div>
          </section>
        </>
      ) : (
        <PlaceholderPanel name={project.name} />
      )}
    </PageShell>
  );
}

/* ─────────────────────── Sub-components ─────────────────────── */

function Crumbs({ id, typeLabel, name }: { id: string; typeLabel: string; name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-2)',
        fontSize: 'var(--text-xs)',
        color: 'var(--gray-500)',
        marginBottom: 'var(--sp-6)',
      }}
    >
      <Link href="/" style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>DASHBOARD</Link>
      <span style={{ color: 'var(--gray-300)' }}>/</span>
      <Link href="/projects/061" style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>PROJECTS</Link>
      <span style={{ color: 'var(--gray-300)' }}>/</span>
      <span style={{ color: 'var(--gray-900)', fontWeight: 600 }}>
        #{id} {name} <span style={{ color: 'var(--gray-400)', fontWeight: 500 }}>({typeLabel})</span>
      </span>
    </div>
  );
}

function Hero({
  project,
  typeColor,
  typeLabel,
}: {
  project: NonNullable<ReturnType<typeof getProject>>;
  typeColor: string;
  typeLabel: string;
}) {
  const created = project.createdAt ? formatCreated(project.createdAt) : null;
  return (
    <section
      style={{
        position: 'relative',
        background: 'var(--white)',
        border: 'var(--border-1)',
        padding: 'var(--sp-10) var(--sp-10) var(--sp-8) calc(var(--sp-10) + 4px)',
        marginBottom: 'var(--sp-10)',
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
      <div
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--gray-400)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wider)',
          marginBottom: 'var(--sp-3)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        PROJECT · #{project.id}
      </div>
      <h1
        style={{
          fontSize: 50,
          fontWeight: 300,
          color: 'var(--black)',
          letterSpacing: 'var(--tracking-tight)',
          lineHeight: 1,
          marginBottom: 'var(--sp-3)',
        }}
      >
        {project.name}
      </h1>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--gray-700)',
          lineHeight: 'var(--leading-relaxed)',
          maxWidth: 720,
          marginBottom: 'var(--sp-4)',
        }}
      >
        {project.define}
      </p>
      <ExternalLinkRow
        projectName={project.name}
        webUrl={project.webUrl}
        designHistoryUrl={project.designHistoryUrl}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-3)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 'var(--text-2xs)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase',
            padding: '4px 10px',
            color: 'var(--white)',
            background: typeColor,
          }}
        >
          {typeLabel}
        </span>
        {project.status === 'new' ? (
          <span className="chip chip-new">NEW · ACTIVE</span>
        ) : (
          <span className={`chip chip-${project.status}`}>{project.status.toUpperCase()}</span>
        )}
        {created ? (
          <>
            <span style={{ width: 1, height: 14, background: 'var(--gray-300)' }} />
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--gray-500)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              CREATED · <strong style={{ color: 'var(--gray-900)', fontWeight: 600 }}>{created.iso}</strong>{' '}
              ({created.rel})
            </span>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  meta,
}: {
  label: string;
  value: React.ReactNode;
  meta: string;
}) {
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

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
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
        {title}
      </h2>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{meta}</div>
    </div>
  );
}

function ExternalLinkRow({
  projectName,
  webUrl,
  designHistoryUrl,
}: {
  projectName: string;
  webUrl?: string;
  designHistoryUrl?: string;
}) {
  const links: { label: string; href: string }[] = [];
  if (designHistoryUrl) links.push({ label: 'UI 디자인 히스토리', href: designHistoryUrl });
  if (webUrl) links.push({ label: projectName.toUpperCase(), href: webUrl });
  if (links.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--sp-2)',
        flexWrap: 'wrap',
        marginBottom: 'var(--sp-5)',
      }}
    >
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--text-2xs)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wide)',
            color: 'var(--black)',
            background: 'var(--white)',
            border: '1px solid var(--gray-900)',
            padding: '6px 10px',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {l.label}
          <span aria-hidden style={{ fontSize: 11, opacity: 0.6 }}>↗</span>
        </a>
      ))}
    </div>
  );
}

function PlaceholderPanel({ name }: { name: string }) {
  return (
    <div
      style={{
        background: 'var(--white)',
        border: 'var(--border-1)',
        padding: 'var(--sp-12) var(--sp-10)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-2xs)',
          fontWeight: 700,
          letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase',
          color: 'var(--gray-400)',
          marginBottom: 'var(--sp-3)',
        }}
      >
        WORK DATA NOT COLLECTED YET
      </div>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--gray-700)',
          lineHeight: 'var(--leading-relaxed)',
          maxWidth: 480,
          margin: '0 auto var(--sp-4)',
        }}
      >
        <strong style={{ color: 'var(--gray-900)' }}>{name}</strong> 의 3-컬럼 작업 패널은
        프로젝트 데이터(<code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>data/projects/[id].json</code>) 가
        수집된 후에 표시됩니다.
      </p>
      <p
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-500)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Currently populated: 061 · 091 · 51 · 062 · 32
      </p>
    </div>
  );
}
