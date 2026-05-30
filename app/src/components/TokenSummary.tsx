import { formatNumber, totalTokens, USD_KRW, type AggregatedTokens } from '@/lib/tokens';

interface Props {
  tokens: AggregatedTokens;
  /** 페이지 단위 라벨 — '이번 주', '이번 달', '2026', '061 LifeOS' 등 */
  scopeLabel?: string;
}

// 모델 표시명 단축
function shortModel(m: string): string {
  return m
    .replace(/^claude-/, '')
    .replace(/-(\d{8})$/, ''); // date suffix 제거
}

function modelShare(tokens: AggregatedTokens): { model: string; pct: number; cost: number }[] {
  const rows = Object.entries(tokens.byModel).map(([model, v]) => ({
    model: shortModel(model),
    cost: v.costUSD,
    total: v.in + v.out + v.cache_read + v.cache_write,
  }));
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  if (grandTotal === 0) return [];
  return rows
    .map(r => ({ model: r.model, pct: (r.total / grandTotal) * 100, cost: r.cost }))
    .sort((a, b) => b.pct - a.pct);
}

export default function TokenSummary({ tokens, scopeLabel }: Props) {
  const total = totalTokens(tokens);
  if (total === 0) {
    return (
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-400)',
          fontVariantNumeric: 'tabular-nums',
          marginTop: 'var(--sp-2)',
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
        }}
      >
        AI · 데이터 없음
      </div>
    );
  }
  const krw = Math.round(tokens.costUSD * USD_KRW);
  const shares = modelShare(tokens);

  return (
    <div
      style={{
        marginTop: 'var(--sp-3)',
        paddingTop: 'var(--sp-3)',
        borderTop: '1px solid var(--gray-200)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--sp-4)',
        alignItems: 'baseline',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-500)',
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase',
            marginRight: 'var(--sp-2)',
          }}
        >
          AI 토큰{scopeLabel ? ` · ${scopeLabel}` : ''}
        </span>
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--gray-900)' }}>
          {formatNumber(total)}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginLeft: 4 }}>
          tokens
        </span>
      </div>

      <div>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-500)',
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase',
            marginRight: 'var(--sp-2)',
          }}
        >
          비용
        </span>
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--gray-900)' }}>
          ${tokens.costUSD.toFixed(2)}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginLeft: 6 }}>
          ≈ ₩{krw.toLocaleString()}
        </span>
      </div>

      {shares.length > 0 ? (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
          <span
            style={{
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              marginRight: 'var(--sp-2)',
            }}
          >
            모델
          </span>
          {shares.map((s, i) => (
            <span key={s.model} style={{ marginRight: 8 }}>
              <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{s.model}</span>{' '}
              <span style={{ color: 'var(--gray-500)' }}>{s.pct.toFixed(0)}%</span>
              {i < shares.length - 1 ? <span style={{ color: 'var(--gray-300)', marginLeft: 8 }}>·</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--gray-400)',
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
          marginLeft: 'auto',
        }}
      >
        in {formatNumber(tokens.in)} · out {formatNumber(tokens.out)} · cache r{formatNumber(tokens.cache_read)}/w{formatNumber(tokens.cache_write)}
      </div>
    </div>
  );
}
