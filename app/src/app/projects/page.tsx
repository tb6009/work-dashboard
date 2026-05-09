import PageShell from '@/components/layout/PageShell';
import ActiveProjectsGrid from '@/components/projects/ActiveProjectsGrid';
import { PROJECTS, loadWeek, getCurrentWeekId } from '@/lib/data';
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/projectTypes';
import type { ProjectMeta, ProjectContribution, LabelStatus, ProjectType } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string }>;
}

/** ID 오름차순 정렬 — 숫자 부분 기준, 동일하면 알파벳 (03a < 03b) */
function sortByIdAscending(a: ProjectMeta, b: ProjectMeta): number {
  const numA = parseInt(a.id, 10);
  const numB = parseInt(b.id, 10);
  if (numA !== numB) return numA - numB;
  return a.id.localeCompare(b.id);
}

export default async function ProjectsIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = (sp.status as LabelStatus | 'all' | undefined) ?? 'all';
  const typeFilter = (sp.type as ProjectType | 'all' | undefined) ?? 'all';

  // 00 제외 (privacy)
  const visible = PROJECTS.filter(p => p.id !== '00').sort(sortByIdAscending);
  let filtered = filter === 'all'
    ? visible
    : visible.filter(p => p.status === filter);
  if (typeFilter !== 'all') {
    filtered = filtered.filter(p => p.type === typeFilter);
  }

  // 현재 주 contribution lookup
  const currentWeekId = await getCurrentWeekId();
  const week = await loadWeek(currentWeekId);
  const contribMap = new Map<string, ProjectContribution>(
    (week?.projects ?? []).map(p => [p.id, p]),
  );

  // counts
  const counts = {
    all: visible.length,
    active: visible.filter(p => p.status === 'active').length,
    new: visible.filter(p => p.status === 'new').length,
    paused: visible.filter(p => p.status === 'paused').length,
    archived: visible.filter(p => p.status === 'archived').length,
  };

  // type counts
  const typeCounts: Record<string, number> = { all: visible.length };
  for (const t of Object.keys(TYPE_COLOR)) {
    typeCounts[t] = visible.filter(p => p.type === t).length;
  }

  return (
    <PageShell active="projects">
      {/* HERO */}
      <section style={{ marginBottom: 'var(--sp-8)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 'var(--sp-8)',
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
              PROJECTS · ASCENDING BY ID
            </div>
            <h1
              style={{
                fontSize: 50,
                fontWeight: 300,
                color: 'var(--black)',
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1,
                margin: '0 0 var(--sp-2) 0',
              }}
            >
              전체 프로젝트
            </h1>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--gray-500)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {visible.length} visible · 1 hidden (00 personal) · 2026 active workspace
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: 'var(--black)',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              {filtered.length}
            </div>
            <div
              style={{
                fontSize: 'var(--text-2xs)',
                color: 'var(--gray-400)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wide)',
                marginTop: 'var(--sp-2)',
              }}
            >
              PROJECTS
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <FilterChips active={filter} counts={counts} />
      <TypeFilterChips active={typeFilter} counts={typeCounts} statusParam={filter} />

      {/* SECTION HEAD */}
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
          {filter === 'all' ? 'All Projects' : `${labelOf(filter)} Projects`}
        </h2>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
          {filtered.length}개 · 카드 클릭 → 상세
        </div>
      </div>

      {/* GRID — v0.2 패턴 (외부 2열 + 내부 2열) */}
      {filtered.length > 0 ? (
        <ActiveProjectsGrid projects={filtered} contributions={contribMap} />
      ) : (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--gray-400)',
            fontSize: 'var(--text-sm)',
            padding: 'var(--sp-16) 0',
            background: 'var(--white)',
            border: 'var(--border-1)',
          }}
        >
          {labelOf(filter)} 상태 프로젝트 없음.
        </div>
      )}
    </PageShell>
  );
}

function labelOf(s: string): string {
  switch (s) {
    case 'all':      return 'All';
    case 'active':   return 'Active';
    case 'new':      return 'New';
    case 'paused':   return 'Paused';
    case 'archived': return 'Archived';
    default:         return s;
  }
}

interface FilterChipsProps {
  active: string;
  counts: Record<string, number>;
}

function FilterChips({ active, counts }: FilterChipsProps) {
  const tabs = [
    { key: 'all',      label: '전체',     icon: '' },
    { key: 'active',   label: 'Active',   icon: '🟢' },
    { key: 'new',      label: 'New',      icon: '🆕' },
    { key: 'paused',   label: 'Paused',   icon: '🟡' },
    { key: 'archived', label: 'Archived', icon: '⚪' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-2)',
        flexWrap: 'wrap',
        marginBottom: 'var(--sp-5)',
      }}
    >
      {tabs.map(t => {
        const isOn = t.key === active;
        const count = counts[t.key] ?? 0;
        const href = t.key === 'all' ? '/projects' : `/projects?status=${t.key}`;
        return (
          <a
            key={t.key}
            href={href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: isOn ? 'var(--white)' : 'var(--gray-500)',
              background: isOn ? 'var(--black)' : 'var(--white)',
              border: '1px solid',
              borderColor: isOn ? 'var(--black)' : 'var(--gray-300)',
              textDecoration: 'none',
            }}
          >
            {t.icon} {t.label}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-2xs)',
                opacity: 0.7,
              }}
            >
              {count}
            </span>
          </a>
        );
      })}
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-400)',
          marginLeft: 'auto',
        }}
      >
        ID 오름차순 · 카드 클릭 → 상세
      </span>
    </div>
  );
}

interface TypeFilterChipsProps {
  active: string;
  counts: Record<string, number>;
  statusParam: string;
}

function TypeFilterChips({ active, counts, statusParam }: TypeFilterChipsProps) {
  const types = Object.keys(TYPE_COLOR) as ProjectType[];
  const baseHref = statusParam === 'all' ? '/projects' : `/projects?status=${statusParam}`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-2)',
        flexWrap: 'wrap',
        marginBottom: 'var(--sp-5)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-2xs)',
          fontWeight: 600,
          color: 'var(--gray-400)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
          marginRight: 'var(--sp-1)',
        }}
      >
        TYPE
      </span>
      {/* 전체 */}
      <a
        href={baseHref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          fontSize: 'var(--text-2xs)',
          fontWeight: 600,
          color: active === 'all' ? 'var(--white)' : 'var(--gray-500)',
          background: active === 'all' ? 'var(--black)' : 'var(--white)',
          border: '1px solid',
          borderColor: active === 'all' ? 'var(--black)' : 'var(--gray-300)',
          textDecoration: 'none',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
        }}
      >
        ALL
        <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
          {counts.all ?? 0}
        </span>
      </a>
      {types.map(type => {
        const isOn = type === active;
        const count = counts[type] ?? 0;
        if (count === 0) return null;
        const sep = statusParam === 'all' ? '?' : '&';
        const href = statusParam === 'all'
          ? `/projects?type=${type}`
          : `/projects?status=${statusParam}&type=${type}`;
        return (
          <a
            key={type}
            href={href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              color: isOn ? 'var(--white)' : 'var(--gray-600)',
              background: isOn ? TYPE_COLOR[type] : 'var(--white)',
              border: '1px solid',
              borderColor: isOn ? TYPE_COLOR[type] : 'var(--gray-300)',
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                background: isOn ? 'var(--white)' : TYPE_COLOR[type],
                flexShrink: 0,
              }}
            />
            {TYPE_LABEL[type]}
            <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
              {count}
            </span>
          </a>
        );
      })}
    </div>
  );
}
