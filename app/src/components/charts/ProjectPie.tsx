'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { TYPE_COLOR, WARM_GRAY, GREY } from '@/lib/projectTypes';
import type { ProjectMeta } from '@/types/dashboard';

export interface PieSlice {
  id: string;
  name: string;
  value: number;
  type: ProjectMeta['type'];
}

interface Props {
  /** Top-N project slices for the donut. */
  slices: PieSlice[];
}

/** ECharts donut for project share by type-color. */
export default function ProjectPie({ slices }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const data = slices.map(s => ({
      value: s.value,
      name: `${s.id} ${s.name}`,
      itemStyle: { color: TYPE_COLOR[s.type] },
    }));

    chart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: WARM_GRAY[900],
        borderWidth: 0,
        textStyle: { color: '#fff', fontSize: 12, fontFamily: 'Inter' },
        formatter: '{b}<br/>{c}% · {d}%',
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
          data,
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [slices]);

  return <div ref={ref} style={{ width: '100%', height: 260 }} />;
}
