'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { TYPE_COLOR, TYPE_LABEL, GREY, WARM_GRAY } from '@/lib/projectTypes';
import type { ProjectType } from '@/types/dashboard';

export interface GanttRow {
  /** y-axis index (0 = top) */
  yIndex: number;
  /** Start month as float in 0–12 (e.g. 3 = April start) */
  start: number;
  /** End month as float in 0–12 (e.g. 4.2 = mid-May) */
  end: number;
  /** Project display name */
  name: string;
  type: ProjectType;
}

interface Props {
  rows: GanttRow[];
  /** Vertical "today" marker position on x-axis (e.g. 4.15 for May 5) */
  todayX: number;
  /** Today label, e.g. "TODAY 5/5" */
  todayLabel: string;
  months: string[];
}

/** Gantt chart via ECharts custom series.
 *  Each row = one project; bar spans `start`→`end` on a 0–12 month axis.
 *  Bar color = project type color. Vertical markLine = today. */
export default function ProjectGantt({ rows, todayX, todayLabel, months }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    type Tuple = [number, number, number, string, ProjectType];
    const data: Tuple[] = rows.map(r => [r.yIndex, r.start, r.end, r.name, r.type]);

    chart.setOption({
      grid: { top: 20, right: 32, bottom: 32, left: 140 },
      tooltip: {
        backgroundColor: WARM_GRAY[900],
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter' },
        formatter: (p: { data: Tuple }) => {
          const d = p.data;
          const startIdx = Math.max(0, Math.min(11, Math.floor(d[1])));
          return `${d[3]}<br/>${TYPE_LABEL[d[4]]} · ${months[startIdx]} ~ active`;
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 12,
        interval: 1,
        axisLine: { lineStyle: { color: GREY[300] } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: GREY[100] } },
        axisLabel: {
          color: GREY[500],
          fontSize: 10,
          fontFamily: 'Inter',
          formatter: (v: number) => (v >= 1 && v <= 12 ? `${v}월` : ''),
        },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: rows.map(r => r.name),
        axisLine: { lineStyle: { color: GREY[300] } },
        axisTick: { show: false },
        axisLabel: {
          color: GREY[700],
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: 500,
        },
      },
      animation: false,
      series: [
        {
          type: 'custom',
          renderItem: (
            _params: unknown,
            api: {
              value: (i: number) => number | string;
              coord: (pt: [number, number]) => [number, number];
              size: (pt: [number, number]) => [number, number];
            },
          ) => {
            const yVal = api.value(0) as number;
            const start = api.coord([api.value(1) as number, yVal]);
            const end = api.coord([api.value(2) as number, yVal]);
            const height = api.size([0, 1])[1] * 0.55;
            const type = api.value(4) as ProjectType;
            return {
              type: 'rect',
              shape: {
                x: start[0],
                y: start[1] - height / 2,
                width: Math.max(end[0] - start[0], 2),
                height,
              },
              style: { fill: TYPE_COLOR[type], opacity: 0.9 },
            };
          },
          encode: { x: [1, 2], y: 0, tooltip: [3, 4] },
          data,
          markLine: {
            symbol: 'none',
            label: {
              show: true,
              position: 'end',
              formatter: todayLabel,
              color: GREY.black,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'Inter',
            },
            lineStyle: { color: GREY.black, width: 1, type: 'solid' },
            data: [{ xAxis: todayX }],
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
  }, [rows, todayX, todayLabel, months]);

  return <div ref={ref} style={{ width: '100%', height: 480 }} />;
}
