"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { MetricHistory } from "@/types/agent";

interface MiniSparklineProps {
  data: MetricHistory[];
  dataKey: keyof MetricHistory;
  color?: string;
  height?: number;
}

export function MiniSparkline({ data, dataKey, color = "#00d4ff", height = 40 }: MiniSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey as string}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${dataKey}-${color.replace("#", "")})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
