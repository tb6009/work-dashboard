'use client';

import { signIn } from 'next-auth/react';
import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn('credentials', {
        password: pw,
        redirect: false,
      });
      if (res?.error) {
        setError('비밀번호가 올바르지 않습니다.');
      } else if (res?.ok) {
        window.location.href = next;
      }
    });
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-8)',
        background: 'var(--gray-100)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--white)',
          border: 'var(--border-1)',
          padding: 'var(--sp-10)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--gray-400)',
            marginBottom: 'var(--sp-2)',
          }}
        >
          WORK DASHBOARD
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 300,
            color: 'var(--black)',
            letterSpacing: 'var(--tracking-tight)',
            lineHeight: 1.1,
            marginBottom: 'var(--sp-2)',
          }}
        >
          로그인
        </h1>
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            lineHeight: 'var(--leading-relaxed)',
            marginBottom: 'var(--sp-8)',
          }}
        >
          세부 페이지는 인증된 사용자만 볼 수 있습니다. 메인 대시보드는{' '}
          <a href="/" style={{ color: 'var(--gray-900)', textDecoration: 'underline' }}>
            홈
          </a>
          에서 공개로 확인 가능합니다.
        </p>

        {/* B안 — GitHub OAuth */}
        <button
          onClick={() => signIn('github', { callbackUrl: next })}
          style={{
            width: '100%',
            padding: 'var(--sp-3) var(--sp-5)',
            background: 'var(--black)',
            color: 'var(--white)',
            border: 'none',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            letterSpacing: 'var(--tracking-wide)',
            cursor: 'pointer',
            marginBottom: 'var(--sp-5)',
          }}
        >
          GitHub으로 로그인 →
        </button>

        {/* divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-3)',
            margin: 'var(--sp-5) 0',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
          <span
            style={{
              fontSize: 'var(--text-2xs)',
              color: 'var(--gray-400)',
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
            }}
          >
            또는
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
        </div>

        {/* A안 — 비밀번호 */}
        <form onSubmit={handlePassword}>
          <label
            htmlFor="pw"
            style={{
              display: 'block',
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              color: 'var(--gray-500)',
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              marginBottom: 'var(--sp-2)',
            }}
          >
            비밀번호
          </label>
          <input
            id="pw"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: '100%',
              padding: 'var(--sp-3) var(--sp-4)',
              border: 'var(--border-2)',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-mono)',
              background: 'var(--white)',
              color: 'var(--gray-900)',
              outline: 'none',
              marginBottom: 'var(--sp-3)',
            }}
          />
          {error && (
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--warm-700)',
                marginBottom: 'var(--sp-3)',
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isPending || !pw}
            style={{
              width: '100%',
              padding: 'var(--sp-3) var(--sp-5)',
              background: pw ? 'var(--gray-900)' : 'var(--gray-300)',
              color: 'var(--white)',
              border: 'none',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              letterSpacing: 'var(--tracking-wide)',
              cursor: pw ? 'pointer' : 'not-allowed',
            }}
          >
            {isPending ? '확인 중…' : '비밀번호 로그인 →'}
          </button>
        </form>
      </div>
    </main>
  );
}
