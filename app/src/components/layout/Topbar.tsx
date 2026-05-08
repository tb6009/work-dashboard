import Link from 'next/link';

type NavKey = 'current' | 'weekly' | 'monthly' | 'yearly' | 'projects';

// 현재 월/연도 (Topbar 링크용)
function nowMonthId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function nowYear(): string {
  return String(new Date().getFullYear());
}

const NAV_ITEMS: Array<{ key: NavKey; label: string; href: string }> = [
  { key: 'current',  label: '현재',     href: '/' },
  { key: 'weekly',   label: '주간',     href: '/weekly' },
  { key: 'monthly',  label: '월간',     href: `/monthly/${nowMonthId()}` },
  { key: 'yearly',   label: '연간',     href: `/yearly/${nowYear()}` },
  { key: 'projects', label: '프로젝트', href: '/projects' },
];

interface Props {
  active: NavKey;
  buildAt?: string;
  nextRefresh?: string;
  userLabel?: string | null;
  signOutAction?: () => Promise<void>;
}

export default function Topbar({
  active,
  buildAt = '2026-05-05 14:00',
  nextRefresh = '2026-05-11 09:00 (Mon)',
  userLabel = null,
  signOutAction,
}: Props) {
  return (
    <header
      className="sticky top-0 z-30"
      style={{
        background: 'var(--white)',
        borderBottom: 'var(--border-1)',
      }}
    >
      <div
        className="mx-auto flex items-center justify-between"
        style={{ maxWidth: 1280, padding: 'var(--sp-4) var(--sp-8)' }}
      >
        <Link href="/" className="flex items-center" style={{ gap: 'var(--sp-3)', textDecoration: 'none' }}>
          <div
            className="grid place-items-center"
            style={{
              width: 28, height: 28,
              background: 'var(--black)', color: 'var(--white)',
              fontSize: 'var(--text-xs)', fontWeight: 700,
            }}
          >
            朴
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--black)' }}>
              박진현 Work Dashboard
            </div>
            <div
              style={{
                fontSize: 'var(--text-2xs)', color: 'var(--gray-400)',
                letterSpacing: 'var(--tracking-wide)', marginTop: 2,
              }}
            >
              CLOUDE_CODE · 27 PROJECTS
            </div>
          </div>
        </Link>

        <nav className="flex" style={{ gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                style={{
                  padding: '6px 14px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--white)' : 'var(--gray-500)',
                  background: isActive ? 'var(--black)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* right cluster: build info + auth */}
        <div className="flex items-center" style={{ gap: 'var(--sp-4)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', textAlign: 'right' }}>
            Build · {buildAt}
            <br />
            <span style={{ color: 'var(--gray-300)' }}>Next · {nextRefresh}</span>
          </div>

          {userLabel && signOutAction ? (
            <form action={signOutAction}>
              <button
                type="submit"
                title={`Logged in as ${userLabel}`}
                style={{
                  padding: '4px 10px',
                  fontSize: 'var(--text-2xs)',
                  fontWeight: 600,
                  letterSpacing: 'var(--tracking-wide)',
                  color: 'var(--gray-700)',
                  background: 'var(--gray-100)',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {userLabel} · LOGOUT
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '4px 10px',
                fontSize: 'var(--text-2xs)',
                fontWeight: 600,
                letterSpacing: 'var(--tracking-wide)',
                color: 'var(--gray-500)',
                background: 'transparent',
                border: 'var(--border-1)',
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}
            >
              LOGIN
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
