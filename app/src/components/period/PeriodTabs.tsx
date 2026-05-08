import Link from 'next/link';

interface Props {
  active: 'week' | 'month';
  weekHref: string;
  monthHref: string;
}

/** Diary 패턴의 주/월 탭 (v0.6) — 인라인 style (Tailwind v4 reset 우회) */
export default function PeriodTabs({ active, weekHref, monthHref }: Props) {
  return (
    <nav
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--gray-200)',
        marginBottom: 'var(--sp-6)',
      }}
    >
      <Tab href={weekHref} label="주" isActive={active === 'week'} />
      <Tab href={monthHref} label="월" isActive={active === 'month'} />
    </nav>
  );
}

function Tab({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: '14px 0',
        marginRight: 'var(--sp-10)',
        fontSize: 'var(--text-base)',
        fontWeight: 600,
        color: isActive ? 'var(--black)' : 'var(--gray-400)',
        textDecoration: 'none',
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-wide)',
        borderBottom: '2px solid',
        borderBottomColor: isActive ? 'var(--black)' : 'transparent',
        marginBottom: -1,
      }}
    >
      {label}
    </Link>
  );
}
