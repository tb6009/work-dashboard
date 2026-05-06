'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { TYPE_COLOR, GREY, WARM_GRAY } from '@/lib/projectTypes';
import type { ProjectType } from '@/types/dashboard';

export interface TypeSlice {
  name: ProjectType;
  value: number;
}

interface Props {
  data: TypeSlice[];
  height?: number;
}

/** ECharts donut — % by project type for the month. */
export default function TypeBreakdownPie({ data, height = 280 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: WARM_GRAY[900],
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter' },
        formatter: '{b}<br/>{c}%',
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: GREY[500], fontSize: 10, fontFamily: 'Inter' },
      },
      animation: false,
      series: [
        {
          type: 'pie',
          radius: ['52%', '76%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: data.map(d => ({
            value: d.value,
            name: d.name,
            itemStyle: { color: TYPE_COLOR[d.name] },
          })),
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
