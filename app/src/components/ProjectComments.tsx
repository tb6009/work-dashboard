'use client';

import { useEffect, useState, useRef } from 'react';
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
  weekStart: string;
  weekEnd: string;
  projectTypeMap: Record<string, ProjectType>;
}

export default function ProjectComments({ weekStart, weekEnd, projectTypeMap }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (editingId !== null && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [editingId]);

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditText(c.comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: number) => {
    if (!editText.trim()) return;
    await supabase.from('project_comments').update({ comment: editText.trim() }).eq('id', id);
    setComments(prev => prev.map(c => c.id === id ? { ...c, comment: editText.trim() } : c));
    setEditingId(null);
    setEditText('');
  };

  const deleteComment = async (id: number) => {
    await supabase.from('project_comments').delete().eq('id', id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  if (loading) return null;
  if (comments.length === 0) return null;

  const byProject = new Map<string, Comment[]>();
  for (const c of comments) {
    if (!byProject.has(c.project_id)) byProject.set(c.project_id, []);
    byProject.get(c.project_id)!.push(c);
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
            const isEditing = editingId === c.id;

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
                    border: isEditing ? `1px solid ${color}` : 'var(--border-1)',
                    borderLeft: `3px solid ${color}`,
                    padding: 'var(--sp-4)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--sp-2)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'var(--text-2xs)',
                        fontWeight: 600,
                        color: color,
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--tracking-wide)',
                      }}
                    >
                      {c.project_name || c.project_id}
                    </div>
                    {!isEditing && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => startEdit(c)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 11,
                            color: 'var(--gray-400)',
                            padding: '2px 4px',
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteComment(c.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 11,
                            color: 'var(--gray-400)',
                            padding: '2px 4px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        ref={editRef}
                        value={editText}
                        onChange={(e) => {
                          setEditText(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(c.id); }
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        style={{
                          width: '100%',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--gray-700)',
                          lineHeight: 'var(--leading-relaxed)',
                          border: 'none',
                          outline: 'none',
                          resize: 'none',
                          overflow: 'hidden',
                          fontFamily: 'inherit',
                          padding: 0,
                          background: 'transparent',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-2)' }}>
                        <button
                          onClick={() => saveEdit(c.id)}
                          style={{
                            background: 'var(--black)',
                            color: 'var(--white)',
                            border: 'none',
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '3px 10px',
                            cursor: 'pointer',
                            letterSpacing: 'var(--tracking-wide)',
                          }}
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            background: 'none',
                            color: 'var(--gray-400)',
                            border: '1px solid var(--gray-300)',
                            fontSize: 10,
                            padding: '3px 10px',
                            cursor: 'pointer',
                          }}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
