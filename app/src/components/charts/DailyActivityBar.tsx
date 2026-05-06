'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { WARM_GRAY, GREY } from '@/lib/projectTypes';
import type { DailyActivity } from '@/types/dashboard';

interface Props {
  daily: DailyActivity[];
}

/** ECharts daily activity bar.
 *  - Warm-gray bars; 토요일(milestone day) gets warm-900.
 *  - Inits on mount, disposes on unmount, resizes on window resize. */
export default function DailyActivityBar({ daily }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const labels = daily.map(d => `${d.date.slice(5)}\n${d.weekday}`);
    const values = daily.map(d => d.filesChanged);
    const milestoneIdx = daily.findIndex(d => d.weekday === '토');

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
          data: values,
          barWidth: 28,
          itemStyle: {
            color: (p: { dataIndex: number }) =>
              p.dataIndex === milestoneIdx ? WARM_GRAY[900] : WARM_GRAY[500],
          },
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
  }, [daily]);

  return <div ref={ref} style={{ width: '100%', height: 260 }} />;
}
