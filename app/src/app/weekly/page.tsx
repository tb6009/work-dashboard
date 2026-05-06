import PageShell from '@/components/layout/PageShell';
import { getProject } from '@/lib/data';
import { TYPE_COLOR } from '@/lib/projectTypes';

type WeekStatus = 'past' | 'current' | 'future';

interface WeekData {
  files: number;
  range: string;
  topProjectIds?: string[];
  status: WeekStatus;
}

const WEEKLY_DATA: Record<string, WeekData> = {
  '2026-W1':  { files: 0,   range: '12-29 ~ 01-04', status: 'past' },
  '2026-W2':  { files: 0,   range: '01-05 ~ 01-11', status: 'past' },
  '2026-W3':  { files: 0,   range: '01-12 ~ 01-18', status: 'past' },
  '2026-W4':  { files: 5,   range: '01-19 ~ 01-25', status: 'past' },
  '2026-W5':  { files: 8,   range: '01-26 ~ 02-01', status: 'past' },
  '2026-W6':  { files: 12,  range: '02-02 ~ 02-08', status: 'past' },
  '2026-W7':  { files: 15,  range: '02-09 ~ 02-15', status: 'past' },
  '2026-W8':  { files: 20,  range: '02-16 ~ 02-22', status: 'past' },
  '2026-W9':  { files: 18,  range: '02-23 ~ 03-01', status: 'past' },
  '2026-W10': { files: 22,  range: '03-02 ~ 03-08', status: 'past' },
  '2026-W11': { files: 45,  range: '03-09 ~ 03-15', status: 'past', topProjectIds: ['05', '21'] },
  '2026-W12': { files: 38,  range: '03-16 ~ 03-22', status: 'past', topProjectIds: ['05'] },
  '2026-W13': { files: 50,  range: '03-23 ~ 03-29', status: 'past', topProjectIds: ['05', '21'] },
  '2026-W14': { files: 12,  range: '04-06 ~ 04-12', status: 'past', topProjectIds: ['03a'] },
  '2026-W15': { files: 38,  range: '04-13 ~ 04-19', status: 'past', topProjectIds: ['05', '21'] },
  '2026-W16': { files: 95,  range: '04-20 ~ 04-26', status: 'past', topProjectIds: ['51', '10'] },
  '2026-W17': { files: 68,  range: '04-27 ~ 05-03', status: 'past', topProjectIds: ['32', '00'] },
  '2026-W18': { files: 142, range: '04-27 ~ 05-03', status: 'current', topProjectIds: ['061', '51', '091'] },
};

interface MonthDef {
  num: string;
  label: string;
  name: string;
  weeks: Array<{ id: string; range: string }>;
  future?: boolean;
}

const MONTHS: MonthDef[] = [
  {
    num: '01', label: 'JAN', name: '1월',
    weeks: [
      { id: '2026-W1',  range: '12-29 ~ 01-04' },
      { id: '2026-W2',  range: '01-05 ~ 01-11' },
      { id: '2026-W3',  range: '01-12 ~ 01-18' },
      { id: '2026-W4',  range: '01-19 ~ 01-25' },
    ],
  },
  {
    num: '02', label: 'FEB', name: '2월',
    weeks: [
      { id: '2026-W5', range: '01-26 ~ 02-01' },
      { id: '2026-W6', range: '02-02 ~ 02-08' },
      { id: '2026-W7', range: '02-09 ~ 02-15' },
      { id: '2026-W8', range: '02-16 ~ 02-22' },
    ],
  },
  {
    num: '03', label: 'MAR', name: '3월',
    weeks: [
      { id: '2026-W9',  range: '02-23 ~ 03-01' },
      { id: '2026-W10', range: '03-02 ~ 03-08' },
      { id: '2026-W11', range: '03-09 ~ 03-15' },
      { id: '2026-W12', range: '03-16 ~ 03-22' },
      { id: '2026-W13', range: '03-23 ~ 03-29' },
    ],
  },
  {
    num: '04', label: 'APR', name: '4월',
    weeks: [
      { id: '2026-W14', range: '04-06 ~ 04-12' },
      { id: '2026-W15', range: '04-13 ~ 04-19' },
      { id: '2026-W16', range: '04-20 ~ 04-26' },
      { id: '2026-W17', range: '04-27 ~ 05-03' },
    ],
  },
  {
    num: '05', label: 'MAY', name: '5월',
    weeks: [
      { id: '2026-W18', range: '04-27 ~ 05-03' },
      { id: '2026-W19', range: '05-04 ~ 05-10' },
      { id: '2026-W20', range: '05-11 ~ 05-17' },
      { id: '2026-W21', range: '05-18 ~ 05-24' },
      { id: '2026-W22', range: '05-25 ~ 05-31' },
    ],
  },
  {
    num: '06', label: 'JUN', name: '6월', future: true,
    weeks: [
      { id: '2026-W23', range: '06-01 ~ 06-07' },
      { id: '2026-W24', range: '06-08 ~ 06-14' },
      { id: '2026-W25', range: '06-15 ~ 06-21' },
      { id: '2026-W26', range: '06-22 ~ 06-28' },
    ],
  },
  {
    num: '07', label: 'JUL', name: '7월', future: true,
    weeks: [
      { id: '2026-W27', range: '06-29 ~ 07-05' },
      { id: '2026-W28', range: '07-06 ~ 07-12' },
      { id: '2026-W29', range: '07-13 ~ 07-19' },
      { id: '2026-W30', range: '07-20 ~ 07-26' },
    ],
  },
  {
    num: '08', label: 'AUG', name: '8월', future: true,
    weeks: [
      { id: '2026-W31', range: '07-27 ~ 08-02' },
      { id: '2026-W32', range: '08-03 ~ 08-09' },
      { id: '2026-W33', range: '08-10 ~ 08-16' },
      { id: '2026-W34', range: '08-17 ~ 08-23' },
      { id: '2026-W35', range: '08-24 ~ 08-30' },
    ],
  },
  {
    num: '09', label: 'SEP', name: '9월', future: true,
    weeks: [
      { id: '2026-W36', range: '08-31 ~ 09-06' },
      { id: '2026-W37', range: '09-07 ~ 09-13' },
      { id: '2026-W38', range: '09-14 ~ 09-20' },
      { id: '2026-W39', range: '09-21 ~ 09-27' },
    ],
  },
  {
    num: '10', label: 'OCT', name: '10월', future: true,
    weeks: [
      { id: '2026-W40', range: '09-28 ~ 10-04' },
      { id: '2026-W41', range: '10-05 ~ 10-11' },
      { id: '2026-W42', range: '10-12 ~ 10-18' },
      { id: '2026-W43', range: '10-19 ~ 10-25' },
    ],
  },
  {
    num: '11', label: 'NOV', name: '11월', future: true,
    weeks: [
      { id: '2026-W44', range: '10-26 ~ 11-01' },
      { id: '2026-W45', range: '11-02 ~ 11-08' },
      { id: '2026-W46', range: '11-09 ~ 11-15' },
      { id: '2026-W47', range: '11-16 ~ 11-22' },
    ],
  },
  {
    num: '12', label: 'DEC', name: '12월', future: true,
    weeks: [
      { id: '2026-W48', range: '11-23 ~ 11-29' },
      { id: '2026-W49', range: '11-30 ~ 12-06' },
      { id: '2026-W50', range: '12-07 ~ 12-13' },
      { id: '2026-W51', range: '12-14 ~ 12-20' },
      { id: '2026-W52', range: '12-21 ~ 12-27' },
    ],
  },
];

function chipLabel(id: string): string {
  const p = getProject(id);
  if (!p) return id;
  return `${id} ${p.name}`;
}

function chipColor(id: string): string {
  const p = getProject(id);
  if (!p) return 'var(--gray-400)';
  return TYPE_COLOR[p.type];
}

function WeekCard({ id, fallbackRange }: { id: string; fallbackRange: string }) {
  const data = WEEKLY_DATA[id];
  const range = data?.range ?? fallbackRange;

  // Future / no-data
  if (!data || data.status === 'future') {
    return (
      <div
        style={{
          background: 'var(--gray-50)',
          border: 'var(--border-1)',
          borderColor: 'var(--gray-200)',
          padding: 'var(--sp-4)',
          minHeight: 132,
          position: 'relative',
          pointerEvents: 'none',
          cursor: 'default',
          display: 'block',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--gray-300)',
            marginBottom: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {id}
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--gray-300)',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            marginBottom: 'var(--sp-3)',
          }}
        >
          {range}
        </div>
        <div
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 300,
            color: 'var(--gray-300)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          —
        </div>
      </div>
    );
  }

  const isCurrent = data.status === 'current';

  const cardStyle: React.CSSProperties = isCurrent
    ? {
        background: 'var(--black)',
        color: 'var(--white)',
        borderColor: 'var(--black)',
        border: '1px solid var(--black)',
        padding: 'var(--sp-4)',
        minHeight: 132,
        position: 'relative',
        textDecoration: 'none',
        display: 'block',
      }
    : {
        background: 'var(--white)',
        border: 'var(--border-1)',
        padding: 'var(--sp-4)',
        minHeight: 132,
        position: 'relative',
        textDecoration: 'none',
        display: 'block',
      };

  const idColor = isCurrent ? 'var(--gray-300)' : 'var(--gray-500)';
  const rangeColor = isCurrent ? 'var(--white)' : 'var(--gray-700)';
  const rangeOpacity = isCurrent ? 0.85 : 1;
  const filesColor = isCurrent ? 'var(--white)' : 'var(--black)';
  const unitColor = isCurrent ? 'var(--gray-300)' : 'var(--gray-400)';

  const chips = data.topProjectIds ?? [];

  return (
    <a href="#" style={cardStyle}>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          color: idColor,
          marginBottom: 2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {id}
      </div>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: rangeColor,
          opacity: rangeOpacity,
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 'var(--sp-3)',
        }}
      >
        {range}
      </div>
      <div
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: filesColor,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 'var(--tracking-tight)',
        }}
      >
        {data.files}
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: unitColor,
            fontWeight: 400,
            marginLeft: 4,
            letterSpacing: 0,
          }}
        >
          files
        </span>
      </div>

      {chips.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 'var(--sp-3)',
          }}
        >
          {chips.map((pid) => (
            <span
              key={pid}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                color: isCurrent ? 'var(--white)' : 'var(--gray-700)',
                background: isCurrent ? 'rgba(255,255,255,0.1)' : 'var(--gray-100)',
                letterSpacing: 0,
                textTransform: 'none',
                borderLeft: `2px solid ${chipColor(pid)}`,
                lineHeight: 1.4,
              }}
            >
              {chipLabel(pid)}
            </span>
          ))}
        </div>
      )}

      {isCurrent && (
        <span
          style={{
            display: 'inline-block',
            fontSize: 9,
            fontWeight: 700,
            background: 'var(--white)',
            color: 'var(--black)',
            padding: '1px 6px',
            letterSpacing: 'var(--tracking-wide)',
            position: 'absolute',
            top: 'var(--sp-4)',
            right: 'var(--sp-4)',
          }}
        >
          CURRENT
        </span>
      )}
    </a>
  );
}

function MonthSection({ month }: { month: MonthDef }) {
  const recordedWeeks = month.weeks.filter((w) => {
    const d = WEEKLY_DATA[w.id];
    return d && d.status !== 'future';
  });
  const totalFiles = recordedWeeks.reduce(
    (s, w) => s + (WEEKLY_DATA[w.id]?.files ?? 0),
    0
  );
  const hasData = recordedWeeks.length > 0;
  const isFuture = !!month.future;

  const numColor = isFuture ? 'var(--gray-300)' : 'var(--black)';
  const labelColor = isFuture ? 'var(--gray-300)' : 'var(--gray-500)';
  const headBorder = isFuture
    ? '1px solid var(--gray-200)'
    : '1px solid var(--gray-300)';

  return (
    <section style={{ marginBottom: 'var(--sp-10)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingBottom: 'var(--sp-3)',
          borderBottom: headBorder,
          marginBottom: 'var(--sp-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)' }}>
          <span
            style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 300,
              color: numColor,
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {month.num}
          </span>
          <span
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: labelColor,
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wider)',
            }}
          >
            {month.label} · {month.name}
          </span>
        </div>
        {hasData ? (
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-400)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <strong
              style={{
                color: 'var(--gray-700)',
                fontWeight: 600,
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              {totalFiles}
            </strong>{' '}
            files · {recordedWeeks.length} / {month.weeks.length} weeks
          </div>
        ) : (
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-400)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            future · {month.weeks.length} weeks
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--sp-3)',
        }}
      >
        {month.weeks.map((w) => (
          <WeekCard key={w.id} id={w.id} fallbackRange={w.range} />
        ))}
      </div>
    </section>
  );
}

export default function WeeklyPage() {
  return (
    <PageShell active="weekly">
      {/* Hero */}
      <section style={{ marginBottom: 'var(--sp-12)' }}>
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
          WEEKLY ARCHIVE
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
          모든 주간
        </h1>
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--gray-500)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          2026년 1월 ~ 12월 · 누적 기록
        </div>
      </section>

      {/* Year Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          border: 'var(--border-1)',
          background: 'var(--white)',
          marginBottom: 'var(--sp-12)',
          width: 'fit-content',
        }}
      >
        <a
          href="#"
          style={{
            padding: 'var(--sp-3) var(--sp-6)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            background: 'var(--black)',
            color: 'var(--white)',
            textDecoration: 'none',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 'var(--tracking-tight)',
            borderRight: 'var(--border-1)',
          }}
        >
          2026
          <span
            style={{
              display: 'block',
              fontSize: 9,
              fontWeight: 500,
              color: 'inherit',
              opacity: 0.6,
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            CURRENT
          </span>
        </a>
        <a
          href="#"
          style={{
            padding: 'var(--sp-3) var(--sp-6)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-300)',
            background: 'var(--gray-50)',
            textDecoration: 'none',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 'var(--tracking-tight)',
            borderRight: 'var(--border-1)',
            cursor: 'not-allowed',
            pointerEvents: 'none',
          }}
        >
          2025
          <span
            style={{
              display: 'block',
              fontSize: 9,
              fontWeight: 500,
              color: 'inherit',
              opacity: 0.6,
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            NO DATA
          </span>
        </a>
        <a
          href="#"
          style={{
            padding: 'var(--sp-3) var(--sp-6)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--gray-300)',
            background: 'var(--gray-50)',
            textDecoration: 'none',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 'var(--tracking-tight)',
            cursor: 'not-allowed',
            pointerEvents: 'none',
          }}
        >
          2024
          <span
            style={{
              display: 'block',
              fontSize: 9,
              fontWeight: 500,
              color: 'inherit',
              opacity: 0.6,
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            NO DATA
          </span>
        </a>
      </div>

      {/* Month sections */}
      <div>
        {MONTHS.map((m) => (
          <MonthSection key={m.num} month={m} />
        ))}
      </div>
    </PageShell>
  );
}
