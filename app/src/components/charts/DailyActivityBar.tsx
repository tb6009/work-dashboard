'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { TYPE_COLOR, WARM_GRAY, GREY } from '@/lib/projectTypes';
import { aggregateDay, formatNumber } from '@/lib/tokens';
import type { DailyActivity, ProjectType } from '@/types/dashboard';

interface Props {
  daily: DailyActivity[];
  /** 프로젝트 ID → type 매핑. 대표 프로젝트 유형 색상으로 바를 칠함. */
  projectTypeMap?: Record<string, ProjectType>;
  /** 차트 컨테이너 높이 (기본 260). 홈 페이지는 130으로 컴팩트. */
  height?: number;
}

/** ECharts daily activity bar.
 *  - 대표 프로젝트 유형 색상으로 바 표시. 매핑 없으면 warm-gray fallback.
 *  - Inits on mount, disposes on unmount, resizes on window resize. */
export default function DailyActivityBar({ daily, projectTypeMap, height = 260 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const labels = daily.map(d => `${d.date.slice(5)}\n${d.weekday}`);
    const values = daily.map(d => d.filesChanged);

    /** 각 날짜의 대표 프로젝트 유형 색상 결정 */
    const barColors = daily.map(d => {
      if (!projectTypeMap || !d.topProjectIds?.length) return WARM_GRAY[500];
      const topId = d.topProjectIds[0];
      const type = projectTypeMap[topId];
      return type ? TYPE_COLOR[type] : WARM_GRAY[500];
    });

    chart.setOption({
      grid: { top: 24, right: 16, bottom: 36, left: 36 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: GREY[300] } },
        axisTick: { show: false },
        axisLabel: { color: GREY[500], fontSize: 10, lineHeight: 13, fontFamily: 'Inter' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: GREY[100] } },
        axisLabel: { color: GREY[400], fontSize: 10, fontFamily: 'Inter' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: WARM_GRAY[900],
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter' },
      },
      animation: false,
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: barColors[i] },
          })),
          barWidth: 28,
          label: {
            show: true,
            position: 'top',
            color: WARM_GRAY[700],
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Inter',
            formatter: (p: { value: number }) => (p.value > 0 ? String(p.value) : ''),
          },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [daily, projectTypeMap]);

  const dailyTokens = daily.map(d => aggregateDay(d));
  const hasTokens = dailyTokens.some(t => t.costUSD > 0);

  return (
    <div>
      <div ref={ref} style={{ width: '100%', height }} />
      {hasTokens && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `36px repeat(${daily.length}, 1fr) 16px`,
            marginTop: 2,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div />
          {dailyTokens.map((t, i) => (
            <div
              key={daily[i].date}
              style={{ textAlign: 'center', padding: '2px 0' }}
            >
              {t.costUSD > 0 ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: WARM_GRAY[700], lineHeight: '14px' }}>
                    ${t.costUSD.toFixed(0)}
                  </div>
                  <div style={{ fontSize: 9, color: GREY[400], lineHeight: '13px' }}>
                    {formatNumber(t.messages)}m
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 9, color: GREY[300], lineHeight: '14px' }}>—</div>
              )}
            </div>
          ))}
          <div />
        </div>
      )}
    </div>
  );
}
