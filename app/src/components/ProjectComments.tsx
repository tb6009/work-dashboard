'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TYPE_COLOR } from '@/lib/projectTypes';
import type { ProjectType } from '@/types/dashboard';

interface Comment {
  id: number;
  project_id: string;
  project_name: string | null;
  comment: string;
  date: string;
  created_at: string;
}

interface Props {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  projectTypeMap: Record<string, ProjectType>;
}

export default function ProjectComments({ weekStart, weekEnd, projectTypeMap }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('project_comments')
      .select('*')
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments(data ?? []);
        setLoading(false);
      });
  }, [weekStart, weekEnd]);

  if (loading) return null;
  if (comments.length === 0) return null;

  // 프로젝트별 그룹
  const byProject = new Map<string, Comment[]>();
  for (const c of comments) {
    const key = c.project_id;
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(c);
  }

  return (
    <section style={{ marginBottom: 'var(--sp-12)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--sp-5)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--black)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          프로젝트 코멘트
        </h2>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
          {comments.length}건 · {byProject.size}개 프로젝트 · 가로 스크롤
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 30,
            height: 1,
            background: 'var(--gray-200)',
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: 'var(--sp-4)',
            overflowX: 'auto',
            paddingBottom: 'var(--sp-4)',
            position: 'relative',
          }}
        >
          {comments.map((c) => {
            const dateObj = new Date(c.date + 'T00:00:00+09:00');
            const wd = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
            const datePart = c.date.slice(5);
            const type = projectTypeMap[c.project_id];
            const color = type ? TYPE_COLOR[type] : 'var(--gray-500)';

            return (
              <article key={c.id} style={{ flexShrink: 0, width: 248 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      background: color,
                      boxShadow: '0 0 0 4px var(--gray-100)',
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--gray-500)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {datePart} ({wd})
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--white)',
                    border: 'var(--border-1)',
                    borderLeft: `3px solid ${color}`,
                    padding: 'var(--sp-4)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 600,
                      color: color,
                      textTransform: 'uppercase',
                      letterSpacing: 'var(--tracking-wide)',
                      marginBottom: 'var(--sp-2)',
                    }}
                  >
                    {c.project_name || c.project_id}
                  </div>
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--gray-700)',
                      lineHeight: 'var(--leading-relaxed)',
                      margin: 0,
                    }}
                  >
                    {c.comment}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
