'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { WARM_GRAY, GREY } from '@/lib/projectTypes';

interface Props {
  /** Weekly file change values, length 5. Use null for future weeks. */
  data: Array<number | null>;
  weeks?: string[];
  height?: number;
}

/** ECharts line — monthly weekly trend.
 *  - W18 (idx 0) is highlighted (warm-900, larger symbol, label).
 *  - Future weeks (idx > 0) shown as warm-500.
 *  - markArea on W19~W22 to indicate planned/future. */
export default function WeeklyTrendLine({
  data,
  weeks = ['W18', 'W19', 'W20', 'W21', 'W22'],
  height = 280,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    chart.setOption({
      grid: { top: 30, right: 20, bottom: 36, left: 40 },
      xAxis: {
        type: 'category',
        data: weeks,
        axisLine: { lineStyle: { color: GREY[300] } },
        axisTick: { show: false },
        axisLabel: {
          color: GREY[500],
          fontSize: 11,
          fontFamily: 'Inter',
          formatter: (v: string, idx: number) =>
            idx === 0 ? '{a|' + v + '}' : v,
          rich: { a: { color: GREY.black, fontWeight: 700 } },
        },
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
        formatter: (params: Array<{ name: string; value: number | null }>) => {
          const p = params[0];
          const v = p.value;
          return `${p.name}<br/>${
            v === null || v === undefined ? '— (미래)' : v + ' files'
          }`;
        },
      },
      animation: false,
      series: [
        {
          type: 'line',
          data,
          connectNulls: false,
          smooth: false,
          symbol: 'circle',
          symbolSize: (_val: unknown, p: { dataIndex: number }) =>
            p.dataIndex === 0 ? 12 : 6,
          itemStyle: {
            color: (p: { dataIndex: number }) =>
              p.dataIndex === 0 ? WARM_GRAY[900] : WARM_GRAY[500],
          },
          lineStyle: { color: WARM_GRAY[500], width: 2 },
          label: {
            show: true,
            position: 'top',
            color: WARM_GRAY[700],
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'Inter',
            formatter: (p: { value: number | null }) =>
              p.value !== null && p.value !== undefined ? String(p.value) : '',
          },
          markArea: {
            silent: true,
            itemStyle: { color: 'rgba(140, 119, 101, 0.04)' },
            data: [[{ xAxis: 'W19' }, { xAxis: 'W22' }]],
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
  }, [data, weeks]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
