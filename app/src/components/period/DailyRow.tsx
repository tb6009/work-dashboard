'use client';

import Link from 'next/link';
import type { DailyActivity } from '@/types/dashboard';
import { lookupProject } from '@/lib/projects';
import { TYPE_COLOR, TYPE_LABEL } from '@/lib/projectTypes';

export interface DailyRowComment {
  id: number;
  project_id: string;
  project_name: string | null;
  comment: string;
  date: string;
}

interface Props {
  day: DailyActivity;
  isToday?: boolean;
  comments?: DailyRowComment[];
}

/** 일간 행 — 왼쪽 날짜 + 오른쪽 프로젝트별 작업 내용 스택.
 *  PeriodProjectTile 의 day-scoped 변형. */
export default function DailyRow({ day, isToday, comments = [] }: Props) {
  const dateObj = new Date(day.date + 'T00:00:00+09:00');
  const dayNum = dateObj.getDate();
  const monthNum = dateObj.getMonth() + 1;
  const entries = day.entries ?? [];

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr',
        background: 'var(--white)',
        borderBottom: '1px solid var(--gray-200)',
        borderLeft: isToday ? '3px solid var(--black)' : '3px solid transparent',
      }}
    >
      {/* LEFT — 날짜 */}
      <div
        style={{
          padding: '18px 18px 18px 16px',
          borderRight: '1px solid var(--gray-200)',
          background: 'var(--gray-50, #fafafa)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--gray-400)',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase',
          }}
        >
          {monthNum}월
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: isToday ? 'var(--black)' : 'var(--gray-900)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 'var(--tracking-tight)',
            marginTop: 4,
          }}
        >
          {dayNum}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--gray-500)',
            marginTop: 4,
            letterSpacing: 'var(--tracking-wide)',
          }}
        >
          {day.weekday}요일
          {isToday ? (
            <span
              style={{
                marginLeft: 6,
                background: 'var(--black)',
                color: 'var(--white)',
                padding: '0 4px',
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
                letterSpacing: 'var(--tracking-wider)',
              }}
            >
              TODAY
            </span>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--gray-400)',
            marginTop: 'var(--sp-3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {day.filesChanged} files
        </div>
      </div>

      {/* RIGHT — 프로젝트별 작업 */}
      <div>
        {entries.length === 0 ? (
          <div
            style={{
              padding: '18px 22px',
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-400)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            no entries — top: {day.topProjectIds.join(' · ') || '—'}
          </div>
        ) : (
          entries.map((entry, i) => {
            const meta = lookupProject(entry.projectId);
            if (!meta) {
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px 22px',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--gray-400)',
                  }}
                >
                  [{entry.projectId}] (unknown project) — {entry.did}
                </div>
              );
            }
            const color = TYPE_COLOR[meta.type];
            const typeLabel = TYPE_LABEL[meta.type];
            return (
              <Link
                key={i}
                href={`/projects/${entry.projectId}`}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 160px) minmax(0, 1fr)',
                  gap: 'var(--sp-5)',
                  alignItems: 'flex-start',
                  padding: '14px 22px 14px 24px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--gray-100)',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: color,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--gray-400)',
                      fontWeight: 700,
                      letterSpacing: 'var(--tracking-wider)',
                    }}
                  >
                    {entry.projectId}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      color: 'var(--gray-900)',
                      letterSpacing: 'var(--tracking-tight)',
                      lineHeight: 1.25,
                    }}
                  >
                    {meta.name}
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      alignSelf: 'flex-start',
                      fontSize: 8,
                      fontWeight: 700,
                      color: 'var(--white)',
                      background: color,
                      padding: '1px 5px',
                      letterSpacing: 'var(--tracking-wide)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {typeLabel}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gray-700)',
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  {entry.did}
                </div>
              </Link>
            );
          })
        )}

        {/* COMMENTS — LifeOS project_comments 그 날짜분 */}
        {comments.length > 0 ? (
          <div
            style={{
              borderTop: '1px dashed var(--gray-300)',
              background: 'var(--gray-50, #fafafa)',
              padding: '10px 22px 14px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: 'var(--gray-400)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-wider)',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              COMMENTS · {comments.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {comments.map((c) => {
                const meta = lookupProject(c.project_id);
                const color = meta ? TYPE_COLOR[meta.type] : 'var(--gray-500)';
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 160px) minmax(0, 1fr)',
                      gap: 'var(--sp-5)',
                      alignItems: 'baseline',
                      paddingLeft: 2,
                      borderLeft: `3px solid ${color}`,
                      paddingTop: 2,
                      paddingBottom: 2,
                      paddingRight: 0,
                      marginLeft: -2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: color,
                        fontWeight: 700,
                        paddingLeft: 8,
                        letterSpacing: 'var(--tracking-wide)',
                      }}
                    >
                      {c.project_name || meta?.name || c.project_id}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--gray-700)',
                        lineHeight: 'var(--leading-relaxed)',
                      }}
                    >
                      {c.comment}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
