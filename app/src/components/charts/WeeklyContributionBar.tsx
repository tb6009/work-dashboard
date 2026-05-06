'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { WARM_GRAY, GREY } from '@/lib/projectTypes';

interface WeekDatum {
  week: string;       // 'W14'
  pct: number;        // 0-100
  current?: boolean;  // current week → warm-900
}

interface Props {
  data: WeekDatum[];
  max?: number;
}

/** ECharts weekly contribution bar.
 *  - Empty weeks (pct = 0) rendered as gray-200.
 *  - Current week rendered as warm-900.
 *  - Other populated weeks rendered as warm-500. */
export default function WeeklyContributionBar({ data, max = 50 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    chart.setOption({
      grid: { top: 28, right: 16, bottom: 40, left: 40 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.week),
        axisLine: { lineStyle: { color: GREY[300] } },
        axisTick: { show: false },
        axisLabel: {
          color: GREY[500],
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: 500,
        },
      },
      yAxis: {
        type: 'value',
        max,
        splitLine: { lineStyle: { color: GREY[100] } },
        axisLabel: {
          color: GREY[400],
          fontSize: 10,
          fontFamily: 'Inter',
          formatter: '{value}%',
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: WARM_GRAY[900],
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter' },
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0];
          if (p.value === 0) return `${p.name}<br/>프로젝트 시작 전`;
          return `${p.name}<br/>${p.value}% contribution`;
        },
      },
      animation: false,
      series: [
        {
          type: 'bar',
          data: data.map(d => ({
            value: d.pct,
            itemStyle: {
              color: d.pct === 0
                ? GREY[200]
                : d.current
                  ? WARM_GRAY[900]
                  : WARM_GRAY[500],
            },
          })),
          barWidth: 44,
          label: {
            show: true,
            position: 'top',
            color: WARM_GRAY[700],
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Inter',
            formatter: (p: { value: number }) =>
              p.value > 0 ? `${p.value}%` : '',
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
  }, [data, max]);

  return <div ref={ref} style={{ width: '100%', height: 260 }} />;
}
