"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData, SeriesPoint } from "@/lib/types";
import { formatCompactDuration, formatDuration } from "@/lib/format";
import { useMounted } from "./use-mounted";

type RangeKey = "daily" | "weekly" | "monthly" | "yearly";

const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: "daily", label: "每日" },
  { key: "weekly", label: "每周" },
  { key: "monthly", label: "每月" },
  { key: "yearly", label: "每年" },
];

export function TrendCharts({ data }: { data: DashboardData }) {
  const mounted = useMounted();
  const [range, setRange] = useState<RangeKey>("daily");
  const series = useMemo<SeriesPoint[]>(() => {
    if (range === "weekly") return data.weeklySeries;
    if (range === "monthly") return data.monthlySeries;
    if (range === "yearly") return data.yearlySeries;
    return data.dailySeries;
  }, [data.dailySeries, data.monthlySeries, data.weeklySeries, data.yearlySeries, range]);

  return (
    <section className="stack">
      <div className="segmented" role="tablist" aria-label="趋势周期">
        {ranges.map((item) => (
          <button
            key={item.key}
            type="button"
            className={range === item.key ? "active" : ""}
            onClick={() => setRange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <article className="panel tall">
        <div className="panel-heading">
          <div>
            <h2>观看时长趋势</h2>
            <p>当前周期：{ranges.find((item) => item.key === range)?.label}</p>
          </div>
        </div>
        <div className="chart-box tall">
          {mounted ? <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 14, right: 24, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCompactDuration} tickLine={false} axisLine={false} width={54} />
              <Tooltip formatter={(value) => formatDuration(Number(value))} />
              <Line
                type="monotone"
                dataKey="seconds"
                stroke="#fb7299"
                strokeWidth={3}
                dot={{ r: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer> : null}
        </div>
      </article>

      <article className="panel tall">
        <div className="panel-heading">
          <div>
            <h2>视频数量趋势</h2>
            <p>同周期内观看过的视频条目数</p>
          </div>
        </div>
        <div className="chart-box tall">
          {mounted ? <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 14, right: 24, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={44} />
              <Tooltip />
              <Bar dataKey="videos" fill="#15b8a6" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer> : null}
        </div>
      </article>
    </section>
  );
}
