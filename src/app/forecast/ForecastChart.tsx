"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { ForecastPoint } from "@/lib/finance/forecast";
import { formatGBP, formatGBPCompact } from "@/lib/money";

export function ForecastChart({
  data,
  compact,
}: {
  data: ForecastPoint[];
  compact?: boolean;
}) {
  return (
    <div style={{ width: "100%", height: compact ? 160 : 280 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
        >
          <CartesianGrid strokeOpacity={0.2} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(d).toLocaleDateString("en-GB", {
                month: "short",
                year: "2-digit",
              })
            }
            tick={{ fontSize: 11 }}
            minTickGap={32}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatGBPCompact(Number(v))}
            width={56}
          />
          <ReferenceLine y={0} strokeOpacity={0.4} />
          <Tooltip
            formatter={(value) => formatGBP(Number(value))}
            labelFormatter={(label) =>
              new Date(String(label)).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            }
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
            }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
