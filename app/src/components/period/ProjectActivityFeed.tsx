import type { ProjectDailyActivity } from '@/lib/data';
import ImageGallery from './ImageGallery';

interface Props {
  activities: ProjectDailyActivity[];
}

/** 프로젝트 페이지 내 일간 활동 feed.
 *  /daily 의 DailyRow와 같은 시각 정체성, 단 단일 프로젝트 컨텍스트. */
export default function ProjectActivityFeed({ activities }: Props) {
  if (!activities || activities.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--sp-8)',
          background: 'var(--white)',
          border: 'var(--border-1)',
          color: 'var(--gray-500)',
          fontSize: 'var(--text-sm)',
          textAlign: 'center',
        }}
      >
        아직 일간 활동 기록 없음 — extract-images 또는 fs scan 실행 후 표시됨.
      </div>
    );
  }

  return (
    <div style={{ border: 'var(--border-1)', background: 'var(--white)' }}>
      {activities.map((a, i) => {
        const dateObj = new Date(a.date + 'T00:00:00+09:00');
        const dayNum = dateObj.getDate();
        const monthNum = dateObj.getMonth() + 1;
        return (
          <article
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr',
              borderBottom: i === activities.length - 1 ? 'none' : '1px solid var(--gray-200)',
            }}
          >
            {/* 날짜 */}
            <div
              style={{
                padding: '18px 18px 18px 16px',
                borderRight: '1px solid var(--gray-200)',
                background: 'var(--gray-50, #fafafa)',
              }}
            >
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--gray-400)', fontWeight: 700, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>
                {monthNum}월
              </div>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: 'var(--tracking-tight)',
                  marginTop: 4,
                }}
              >
                {dayNum}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', marginTop: 4 }}>
                {a.weekday}요일
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--gray-400)',
                  marginTop: 'var(--sp-3)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {a.weekId} · {a.filesChanged}f
              </div>
            </div>

            {/* 작업 내용 */}
            <div style={{ padding: '14px 22px' }}>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--gray-700)',
                  lineHeight: 'var(--leading-relaxed)',
                }}
              >
                {a.did}
              </div>
              {a.images && a.images.length > 0 ? <ImageGallery images={a.images} /> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
