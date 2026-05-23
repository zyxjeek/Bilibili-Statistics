"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData } from "@/lib/types";
import { formatCompactDuration, formatDuration } from "@/lib/format";
import { buildHistoryHref } from "@/lib/history-filters";
import { useMounted } from "./use-mounted";

const colors = ["#fb7299", "#15b8a6", "#f59e0b", "#6366f1", "#ef4444", "#22c55e"];

export function OverviewCharts({ data }: { data: DashboardData }) {
  const mounted = useMounted();
  const router = useRouter();
  const categoryData = data.categories.slice(0, 6);
  const creatorData = data.creators.slice(0, 8);

  function openPayload(payload: unknown) {
    const row = getActivePayload<{ from?: string; to?: string }>(payload);
    if (row?.from && row.to) {
      router.push(buildHistoryHref({ from: row.from, to: row.to }));
    }
  }

  return (
    <section className="chart-layout">
      <article className="panel panel-large">
        <div className="panel-heading">
          <div>
            <h2>最近 30 天趋势</h2>
            <p>每日已计入完播时长和视频数量</p>
          </div>
        </div>
        <div className="chart-box clickable-chart">
          {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
            <LineChart data={data.dailySeries} margin={{ top: 10, right: 18, left: 0, bottom: 0 }} onClick={openPayload}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={formatCompactDuration}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                width={44}
              />
              <Tooltip formatter={(value) => formatDuration(Number(value))} />
              <Line type="monotone" dataKey="seconds" stroke="#fb7299" strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer> : null}
        </div>
      </article>

      <article className="panel">
        <div className="panel-heading">
          <div>
            <h2>分类分布</h2>
            <p>按已计入完播时长统计</p>
          </div>
        </div>
        <div className="donut-wrap">
          {mounted ? <ResponsiveContainer width="100%" height={230} minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="seconds"
                nameKey="name"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={4}
                isAnimationActive={false}
                onClick={(entry) => router.push(buildHistoryHref({ category: entry.name }))}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatDuration(Number(value))} />
            </PieChart>
          </ResponsiveContainer> : <div style={{ height: 230 }} />}
          <div className="legend-list">
            {categoryData.map((item, index) => (
              <Link key={item.name} href={buildHistoryHref({ category: item.name })}>
                <i style={{ background: colors[index % colors.length] }} />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </article>

      <article className="panel panel-wide">
        <div className="panel-heading">
          <div>
            <h2>UP 主排行</h2>
            <p>Top 8 已计入完播时长</p>
          </div>
        </div>
        <div className="chart-box short clickable-chart">
          {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
            <BarChart
              data={creatorData}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 20, bottom: 4 }}
              onClick={(payload) => {
                const creator = getActivePayload<{ mid?: number | null; name?: string }>(payload);
                if (creator) {
                  router.push(buildHistoryHref({ creator: creator.name, creatorMid: creator.mid }));
                }
              }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 23, 42, 0.08)" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCompactDuration} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={94} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatDuration(Number(value))} />
              <Bar dataKey="seconds" fill="#15b8a6" radius={[0, 8, 8, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer> : null}
        </div>
      </article>
    </section>
  );
}

function getActivePayload<T>(payload: unknown) {
  return (payload as { activePayload?: Array<{ payload?: T }> })?.activePayload?.[0]?.payload;
}
