/**
 * calendar.ts — ISO 주차 + 월별 그룹핑 유틸
 *
 * 규칙:
 *   - ISO 8601 주차 사용 (월요일 시작)
 *   - 주차 → 월 매핑: "그 주의 목요일이 속한 월" (ISO 표준)
 *     → 4월(2026)은 W14~W18 = 5주 (W14 Thu=04-02, W18 Thu=04-30 모두 4월)
 *   - 한국어 월 표기는 'YYYY-MM' 형식 (예: '2026-04')
 *   - 주차 ID는 'YYYY-WXX' 형식 (예: '2026-W18')
 */

const WEEKDAY_KO = ['월', '화', '수', '목', '금', '토', '일'] as const;

/* ─────────────────────────────────────────────────────────────
   1. 기본 ISO 주차 계산
   ───────────────────────────────────────────────────────────── */

/** Date → ISO 주 번호 (1~53) */
export function getISOWeekNumber(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Date → ISO 주차 연도 (12월 말일이 W1로 들어가면 다음 해) */
export function getISOWeekYear(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  return t.getUTCFullYear();
}

/** ISO 주차 ID 생성 (예: '2026-W18') */
export function toWeekId(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** 'YYYY-WXX' → { year, week } */
export function parseWeekId(id: string): { year: number; week: number } | null {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(id);
  if (!m) return null;
  return { year: Number(m[1]), week: Number(m[2]) };
}

/* ─────────────────────────────────────────────────────────────
   2. ISO 주차 → 월~일 날짜 범위
   ───────────────────────────────────────────────────────────── */

/** ISO 주차의 월요일 Date 객체 반환 (UTC) */
export function getISOWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const monday = new Date(week1Mon);
  monday.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  return monday;
}

export interface WeekRange {
  weekId: string;
  monday: Date;
  thursday: Date;
  sunday: Date;
  /** 'YYYY-MM-DD' */
  fromISO: string;
  toISO: string;
  /** 'MM-DD' (display only) */
  fromShort: string;
  toShort: string;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const shortDate = (d: Date) => d.toISOString().slice(5, 10);

export function getWeekRange(year: number, week: number): WeekRange {
  const monday = getISOWeekMonday(year, week);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    weekId: toWeekId(year, week),
    monday,
    thursday,
    sunday,
    fromISO: isoDate(monday),
    toISO: isoDate(sunday),
    fromShort: shortDate(monday),
    toShort: shortDate(sunday),
  };
}

/* ─────────────────────────────────────────────────────────────
   3. 주차 ↔ 월 매핑 (Thursday rule, ISO 표준)
   ───────────────────────────────────────────────────────────── */

/** 주차의 목요일이 속한 월 ID 반환 (예: '2026-04')
 *  ISO 표준: 한 주의 대표 요일은 목요일 — 그 목요일의 월이 그 주의 월. */
export function getMonthOfWeek(weekId: string): string | null {
  const parsed = parseWeekId(weekId);
  if (!parsed) return null;
  const range = getWeekRange(parsed.year, parsed.week);
  const y = range.thursday.getUTCFullYear();
  const m = String(range.thursday.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** 'YYYY-MM' → 그 달에 속한 ISO 주차 ID 배열
 *  Thursday rule: 그 주의 목요일이 해당 월에 있는 주차들. */
export function getWeeksOfMonth(monthId: string): string[] {
  const m = /^(\d{4})-(\d{2})$/.exec(monthId);
  if (!m) return [];
  const year = Number(m[1]);
  const month = Number(m[2]);

  const weeks: string[] = [];
  // 월의 모든 날짜 순회하며 ISO 주차 수집 (중복 제거)
  const seen = new Set<string>();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); // 해당 월 마지막 날
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const wkYear = getISOWeekYear(date);
    const wkNum = getISOWeekNumber(date);
    const wkId = toWeekId(wkYear, wkNum);
    if (seen.has(wkId)) continue;
    // 해당 주의 목요일이 이 달에 있는지 확인 (Thursday rule)
    const range = getWeekRange(wkYear, wkNum);
    const thuMonth = range.thursday.getUTCMonth() + 1;
    const thuYear = range.thursday.getUTCFullYear();
    if (thuYear === year && thuMonth === month) {
      weeks.push(wkId);
      seen.add(wkId);
    }
  }
  // 주차 번호 순 정렬
  return weeks.sort((a, b) => {
    const pa = parseWeekId(a)!;
    const pb = parseWeekId(b)!;
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.week - pb.week;
  });
}

/** 그 달이 5-주 케이스인지 (4월 2026 = W14~W18 = 5 주) */
export function is5WeekMonth(monthId: string): boolean {
  return getWeeksOfMonth(monthId).length === 5;
}

/* ─────────────────────────────────────────────────────────────
   4. 월 ID 유틸
   ───────────────────────────────────────────────────────────── */

/** 'YYYY-MM' → 월 번호(1-12), 연도 분리 */
export function parseMonthId(id: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(id);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

const MONTH_LABELS = [
  { num: '01', label: 'JAN', name: '1월' },
  { num: '02', label: 'FEB', name: '2월' },
  { num: '03', label: 'MAR', name: '3월' },
  { num: '04', label: 'APR', name: '4월' },
  { num: '05', label: 'MAY', name: '5월' },
  { num: '06', label: 'JUN', name: '6월' },
  { num: '07', label: 'JUL', name: '7월' },
  { num: '08', label: 'AUG', name: '8월' },
  { num: '09', label: 'SEP', name: '9월' },
  { num: '10', label: 'OCT', name: '10월' },
  { num: '11', label: 'NOV', name: '11월' },
  { num: '12', label: 'DEC', name: '12월' },
];

export interface MonthLabel {
  num: string;
  label: string; // 'APR'
  name: string;  // '4월'
}

export function getMonthLabel(monthId: string): MonthLabel | null {
  const parsed = parseMonthId(monthId);
  if (!parsed) return null;
  return MONTH_LABELS[parsed.month - 1] ?? null;
}

/** 'YYYY-MM' 가 'YYYY-MM' 보다 최신인가 (최신순 정렬용) */
export function compareMonthDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

/* ─────────────────────────────────────────────────────────────
   5. 오늘 기준 유틸
   ───────────────────────────────────────────────────────────── */

/** 오늘 날짜의 ISO 주차 ID */
export function getCurrentWeekId(now: Date = new Date()): string {
  return toWeekId(getISOWeekYear(now), getISOWeekNumber(now));
}

/** 오늘 날짜의 월 ID */
export function getCurrentMonthId(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export { WEEKDAY_KO };
