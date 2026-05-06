interface Props {
  buildAt?: string;
  nextRefresh?: string;
}

export default function Footer({ buildAt = '2026-05-05 14:00 KST', nextRefresh = '2026-05-11 09:00 (Mon)' }: Props) {
  return (
    <footer style={{ marginTop: 'var(--sp-16)', paddingTop: 'var(--sp-6)', borderTop: 'var(--border-1)' }}>
      <div
        className="flex justify-between"
        style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}
      >
        <div>
          <div style={{ marginBottom: 4 }}>Data sources</div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--gray-700)' }}>
            docs/logs/*.md · PROJECTS.md · file mtime · git log
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 4 }}>Build · {buildAt}</div>
          <div>Next refresh · {nextRefresh}</div>
        </div>
      </div>
      <div
        style={{
          fontSize: 'var(--text-2xs)',
          color: 'var(--gray-400)',
          marginTop: 'var(--sp-4)',
        }}
      >
        Personal data (00_personal/data, reports/daily~monthly) excluded by allowlist filter.
        Foundation: <code>src/styles/tokens.css</code> (062 v0.2 derived).
      </div>
    </footer>
  );
}
