'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { TYPE_COLOR, TYPE_LABEL, GREY, WARM_GRAY } from '@/lib/projectTypes';
import type { ProjectType } from '@/types/dashboard';

interface Props {
  /** 12-month series per type. Index 0 = Jan, 11 = Dec. */
  composition: Record<ProjectType, number[]>;
  months: string[];
}

/** Stacked area chart showing project-type composition by month.
 *  Months without activity render as zeros (still visible in the axis). */
export default function TypeStackedArea({ composition, months }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const types = Object.keys(TYPE_COLOR) as ProjectType[];

    chart.setOption({
      grid: { top: 24, right: 24, bottom: 36, left: 44 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: WARM_GRAY[900],
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter' },
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: GREY[300] } },
        axisTick: { show: false },
        axisLabel: { color: GREY[500], fontSize: 11, fontFamily: 'Inter' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: GREY[100] } },
        axisLabel: { color: GREY[400], fontSize: 10, fontFamily: 'Inter' },
      },
      animation: false,
      series: types.map(type => ({
        name: TYPE_LABEL[type],
        type: 'line',
        stack: 'total',
        smooth: 0.2,
        symbol: 'none',
        areaStyle: { color: TYPE_COLOR[type], opacity: 0.85 },
        lineStyle: { width: 0 },
        emphasis: { focus: 'series' },
        data: composition[type],
      })),
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [composition, months]);

  return <div ref={ref} style={{ width: '100%', height: 320 }} />;
}
