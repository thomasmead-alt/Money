"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { CategorySpendRow } from "@/lib/finance/trends";
import { formatGBP, formatGBPCompact } from "@/lib/money";

const COLOURS = [
  "var(--color-accent)",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#eab308",
];

interface ChartRow {
  month: string;
  [category: string]: number | string;
}

export function SpendByCategoryChart({ data }: { data: CategorySpendRow[] }) {
  if (data.length === 0) return null;

  const months = data[0].months.map((m) => m.month);
  const rows: ChartRow[] = months.map((m) => {
    const row: ChartRow = { month: m };
    for (const cat of data) {
      const cell = cat.months.find((x) => x.month === m);
      row[cat.categoryName] = cell ? cell.spend : 0;
    }
    return row;
  });

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeOpacity={0.2} vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(d: string) =>
              new Date(d + "-01").toLocaleDateString("en-GB", {
                month: "short",
                year: "2-digit",
              })
            }
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatGBPCompact(Number(v))}
            width={56}
          />
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
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {data.map((cat, i) => (
            <Bar
              key={cat.categoryId ?? "uncategorised"}
              dataKey={cat.categoryName}
              stackId="spend"
              fill={COLOURS[i % COLOURS.length]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
