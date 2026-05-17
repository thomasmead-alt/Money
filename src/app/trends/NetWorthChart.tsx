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
  Legend,
} from "recharts";
import type { NetWorthPoint } from "@/lib/finance/trends";
import { formatGBP, formatGBPCompact } from "@/lib/money";

export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeOpacity={0.2} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(d + "-01").toLocaleDateString("en-GB", {
                month: "short",
                year: "2-digit",
              })
            }
            tick={{ fontSize: 11 }}
            minTickGap={24}
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
              new Date(String(label) + "-01").toLocaleDateString("en-GB", {
                month: "long",
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
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Net worth"
          />
          <Line
            type="monotone"
            dataKey="liquid"
            stroke="var(--color-positive)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
            name="Liquid"
          />
          <Line
            type="monotone"
            dataKey="debts"
            stroke="var(--color-negative)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
            name="Debts"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
