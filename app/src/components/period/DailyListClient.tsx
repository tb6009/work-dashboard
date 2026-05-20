'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DailyRow, { type DailyRowComment } from './DailyRow';
import type { DailyActivity } from '@/types/dashboard';

interface Props {
  activeDays: DailyActivity[];
  weekStart: string;     // YYYY-MM-DD
  weekEnd: string;       // YYYY-MM-DD
  todayDate: string;     // YYYY-MM-DD
}

/** 일간 리스트 — 한 번의 Supabase fetch로 주차 코멘트 받아 날짜별 묶음 전달 */
export default function DailyListClient({ activeDays, weekStart, weekEnd, todayDate }: Props) {
  const [commentsByDate, setCommentsByDate] = useState<Record<string, DailyRowComment[]>>({});

  useEffect(() => {
    supabase
      .from('project_comments')
      .select('*')
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const grouped: Record<string, DailyRowComment[]> = {};
        for (const c of (data ?? []) as DailyRowComment[]) {
          if (!grouped[c.date]) grouped[c.date] = [];
          grouped[c.date].push(c);
        }
        setCommentsByDate(grouped);
      });
  }, [weekStart, weekEnd]);

  return (
    <section style={{ border: 'var(--border-1)' }}>
      {activeDays.map((day) => (
        <DailyRow
          key={day.date}
          day={day}
          isToday={day.date === todayDate}
          comments={commentsByDate[day.date] ?? []}
        />
      ))}
    </section>
  );
}
