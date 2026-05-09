'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { TYPE_COLOR, WARM_GRAY, GREY } from '@/lib/projectTypes';
import type { DailyActivity, ProjectType } from '@/types/dashboard';

interface Props {
  daily: DailyActivity[];
  /** 프로젝트 ID → type 매핑. 대표 프로젝트 유형 색상으로 바를 칠함. */
  projectTypeMap?: Record<string, ProjectType>;
}

/** ECharts daily activity bar.
 *  - 대표 프로젝트 유형 색상으로 바 표시. 매핑 없으면 warm-gray fallback.
 *  - Inits on mount, disposes on unmount, resizes on window resize. */
export default function DailyActivityBar({ daily, projectTypeMap }: Props) {
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

  return <div ref={ref} style={{ width: '100%', height: 260 }} />;
}
