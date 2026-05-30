/**
 * Token aggregation helpers.
 * Weekly JSON에 이미 합산된 tokens 필드가 있고,
 * 일·프로젝트별은 daily[].entries[].tokens를 합산해 계산한다.
 */

import type { WeeklySnapshot, DailyActivity, TokenUsage } from '@/types/dashboard';

export interface AggregatedTokens {
  in: number;
  out: number;
  cache_read: number;
  cache_write: number;
  messages: number;
  costUSD: number;
  byModel: Record<string, { in: number; out: number; cache_read: number; cache_write: number; messages: number; costUSD: number }>;
}

const EMPTY: AggregatedTokens = {
  in: 0, out: 0, cache_read: 0, cache_write: 0, messages: 0, costUSD: 0, byModel: {},
};

export function emptyTokens(): AggregatedTokens {
  return { in: 0, out: 0, cache_read: 0, cache_write: 0, messages: 0, costUSD: 0, byModel: {} };
}

function mergeOne(acc: AggregatedTokens, t: TokenUsage): void {
  acc.in          += t.total.in;
  acc.out         += t.total.out;
  acc.cache_read  += t.total.cache_read;
  acc.cache_write += t.total.cache_write;
  acc.messages    += t.total.messages || 0;
  acc.costUSD     += t.costUSD;
  for (const [model, v] of Object.entries(t.byModel || {})) {
    const m = acc.byModel[model] || { in: 0, out: 0, cache_read: 0, cache_write: 0, messages: 0, costUSD: 0 };
    m.in          += v.in;
    m.out         += v.out;
    m.cache_read  += v.cache_read;
    m.cache_write += v.cache_write;
    m.messages    += v.messages;
    m.costUSD     += v.costUSD;
    acc.byModel[model] = m;
  }
}

/** Aggregate one day's entries (all projects on that day). */
export function aggregateDay(day: DailyActivity): AggregatedTokens {
  const acc = emptyTokens();
  for (const e of day.entries || []) {
    if (e.tokens) mergeOne(acc, e.tokens);
  }
  return acc;
}

/** Aggregate a whole week. Prefer weekly.tokens summary; fall back to daily merge. */
export function aggregateWeek(week: WeeklySnapshot): AggregatedTokens {
  const acc = emptyTokens();
  for (const day of week.daily || []) {
    for (const e of day.entries || []) {
      if (e.tokens) mergeOne(acc, e.tokens);
    }
  }
  return acc;
}

/** Aggregate multiple weeks (for monthly/yearly). */
export function aggregateWeeks(weeks: WeeklySnapshot[]): AggregatedTokens {
  const acc = emptyTokens();
  for (const w of weeks) {
    const wTok = aggregateWeek(w);
    acc.in          += wTok.in;
    acc.out         += wTok.out;
    acc.cache_read  += wTok.cache_read;
    acc.cache_write += wTok.cache_write;
    acc.messages    += wTok.messages;
    acc.costUSD     += wTok.costUSD;
    for (const [model, v] of Object.entries(wTok.byModel)) {
      const m = acc.byModel[model] || { in: 0, out: 0, cache_read: 0, cache_write: 0, messages: 0, costUSD: 0 };
      m.in          += v.in;
      m.out         += v.out;
      m.cache_read  += v.cache_read;
      m.cache_write += v.cache_write;
      m.messages    += v.messages;
      m.costUSD     += v.costUSD;
      acc.byModel[model] = m;
    }
  }
  return acc;
}

/** Aggregate one project across weeks. */
export function aggregateProject(weeks: WeeklySnapshot[], projectId: string): AggregatedTokens {
  const acc = emptyTokens();
  for (const w of weeks) {
    for (const day of w.daily || []) {
      for (const e of day.entries || []) {
        if (e.projectId === projectId && e.tokens) mergeOne(acc, e.tokens);
      }
    }
  }
  return acc;
}

export const USD_KRW = 1470;

export function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return n.toLocaleString();
}

export function totalTokens(t: AggregatedTokens): number {
  return t.in + t.out + t.cache_read + t.cache_write;
}
