import type { ExternalAIUsage as Usage } from '@/types/dashboard';

const usd = (n: number) => `$${n.toFixed(2)}`;

/** Claude 외 AI(Codex·Gemini) 비용과 생성 이미지 장수 — API 정가 환산 */
export default function ExternalAIUsage({ usage, claudeUSD }: { usage?: Usage; claudeUSD: number }) {
  if (!usage) return null;
  const items = [
    { label: 'Claude', value: usd(claudeUSD) },
    { label: 'Codex (OpenAI)', value: usd(usage.codex.costUSD) },
    { label: 'Gemini', value: `${usd(usage.gemini.costUSD)}${usage.gemini.estimated ? ' (추정)' : ''}` },
    { label: '생성 이미지', value: `${usage.codex.images}장` },
  ];
  return (
    <div style={{ marginTop: 'var(--sp-2)', fontVariantNumeric: 'tabular-nums' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)', alignItems: 'baseline' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>
          AI 비용 합계
        </span>
        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--gray-900)' }}>
          {usd(usage.totalUSD)}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>≈ ₩{usage.totalKRW.toLocaleString('ko-KR')}</span>
        {items.map(i => (
          <span key={i.label} style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-600)' }}>
            {i.label} <b style={{ color: 'var(--gray-900)' }}>{i.value}</b>
          </span>
        ))}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 4 }}>
        {usage.note} 출처: {usage.pricingSource}
      </div>
    </div>
  );
}
