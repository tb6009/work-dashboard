'use client';

import { useState, useEffect } from 'react';
import type { DailyImage } from '@/types/dashboard';

interface Props {
  images: DailyImage[];
}

/** 썸네일 strip + 클릭 시 풀스크린 lightbox 모달.
 *  하단에 날짜·제작 상황·사용 목적 표시. */
export default function ImageGallery({ images }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (selectedIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIdx(null);
      if (e.key === 'ArrowLeft') setSelectedIdx((i) => (i === null ? null : (i - 1 + images.length) % images.length));
      if (e.key === 'ArrowRight') setSelectedIdx((i) => (i === null ? null : (i + 1) % images.length));
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedIdx, images.length]);

  if (!images || images.length === 0) return null;

  const visible = images.slice(0, 8);
  const overflow = images.length - visible.length;

  return (
    <>
      {/* Thumbnail strip */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 10,
          flexWrap: 'wrap',
        }}
      >
        {visible.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedIdx(i); }}
            style={{
              width: 80,
              height: 80,
              padding: 0,
              border: '1px solid var(--gray-300)',
              background: `var(--gray-50) url(${img.publicPath}) center/cover no-repeat`,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title={img.filename}
          />
        ))}
        {overflow > 0 ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedIdx(visible.length); }}
            style={{
              width: 80,
              height: 80,
              border: '1px solid var(--gray-300)',
              background: 'var(--gray-100)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--gray-700)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            +{overflow}
          </button>
        ) : null}
      </div>

      {/* Lightbox modal */}
      {selectedIdx !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedIdx(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedIdx(null); }}
            aria-label="닫기"
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '4px 12px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              letterSpacing: 'var(--tracking-wider)',
            }}
          >
            ESC ✕
          </button>

          {/* Nav */}
          {images.length > 1 ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedIdx((i) => (i! - 1 + images.length) % images.length); }}
                aria-label="이전"
                style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', color: '#fff', border: 'none', fontSize: 36, cursor: 'pointer', padding: '20px 12px' }}
              >‹</button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedIdx((i) => (i! + 1) % images.length); }}
                aria-label="다음"
                style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', color: '#fff', border: 'none', fontSize: 36, cursor: 'pointer', padding: '20px 12px' }}
              >›</button>
            </>
          ) : null}

          {/* Main image */}
          <img
            src={images[selectedIdx].publicPath}
            alt={images[selectedIdx].filename}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '85vw', maxHeight: '70vh', objectFit: 'contain', background: 'var(--gray-100)' }}
          />

          {/* Meta panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 16,
              background: '#fff',
              padding: '14px 18px',
              maxWidth: 720,
              width: '85vw',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--gray-700)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>
                <span style={{ color: 'var(--gray-400)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>📅</span>
                <strong style={{ color: 'var(--gray-900)' }}>{images[selectedIdx].mtime.slice(0, 16).replace('T', ' ')}</strong>
                <span style={{ color: 'var(--gray-400)', marginLeft: 12, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                  {selectedIdx + 1} / {images.length} · {images[selectedIdx].filename}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--gray-400)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>📁</span>
                <span>{images[selectedIdx].folderContext}</span>
              </div>
              {images[selectedIdx].caption ? (
                <div>
                  <span style={{ color: 'var(--gray-400)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>📝</span>
                  <span>{images[selectedIdx].caption}</span>
                </div>
              ) : null}
              {images[selectedIdx].purpose ? (
                <div>
                  <span style={{ color: 'var(--gray-400)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>🎯</span>
                  <span>{images[selectedIdx].purpose}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
