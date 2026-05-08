import type { ProjectMeta, ProjectContribution } from '@/types/dashboard';
import ActiveProjectTile from './ActiveProjectTile';

interface Props {
  projects: ProjectMeta[];
  /** 이번 주 기여도 lookup (id → contribution) */
  contributions?: Map<string, ProjectContribution>;
}

/** v0.2 패턴 — 외부 2열 + 내부 2열 (메타 / 액션) 그리드. */
export default function ActiveProjectsGrid({ projects, contributions }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: 10,
        rowGap: 1,
        background: 'var(--gray-200)',
      }}
    >
      {projects.map(p => {
        const c = contributions?.get(p.id);
        return <ActiveProjectTile key={p.id} project={p} contribution={c} />;
      })}
    </div>
  );
}
