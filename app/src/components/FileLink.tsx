import type { FileKind } from '@/types/projectWork';

interface Props {
  filePath: string;          // absolute filesystem path
  fileKind?: FileKind;
  label?: string;            // override link text; defaults to basename
  className?: string;
  showIcon?: boolean;
}

/** Open a local file in the user's IDE via the vscode:// scheme.
 *  Click → VS Code opens the file. Title attr shows full path for copy. */
export default function FileLink({ filePath, fileKind, label, className, showIcon = true }: Props) {
  const basename = filePath.split('/').pop() ?? filePath;
  const text = label ?? basename;
  const kind = fileKind ?? inferKind(filePath);
  const vscodeHref = `vscode://file${filePath}`;

  return (
    <a
      href={vscodeHref}
      title={`${filePath}\n(클릭 → VS Code)`}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        color: 'var(--gray-700)',
        textDecoration: 'none',
        borderBottom: '1px dashed var(--gray-300)',
        paddingBottom: 1,
        maxWidth: '100%',
      }}
    >
      {showIcon && <FileIcon kind={kind} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {text}
      </span>
    </a>
  );
}

function inferKind(path: string): FileKind {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  if (ext === 'md') return 'md';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'json') return 'json';
  if (ext === 'tsx') return 'tsx';
  if (ext === 'ts') return 'ts';
  if (ext === 'css') return 'css';
  return 'other';
}

const KIND_LABEL: Record<FileKind, string> = {
  md: 'MD', html: 'HTML', image: 'IMG', pdf: 'PDF',
  json: 'JSON', tsx: 'TSX', ts: 'TS', css: 'CSS', other: 'FILE',
};

function FileIcon({ kind }: { kind: FileKind }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 'var(--tracking-wide)',
        padding: '1px 5px',
        background: 'var(--gray-100)',
        color: 'var(--gray-700)',
        flexShrink: 0,
      }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}
