"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData } from "@/lib/types";
import { resolveChartDatum } from "@/lib/chart-drilldown";
import { formatCompactDuration, formatDuration } from "@/lib/format";
import { buildHistoryHref } from "@/lib/history-filters";
import { useMounted } from "./use-mounted";

const colors = ["#fb7299", "#15b8a6", "#f59e0b", "#6366f1", "#ef4444", "#22c55e"];

export function CategoryView({ data }: { data: DashboardData }) {
  const mounted = useMounted();
  const router = useRouter();

  return (
    <section className="stack">
      <article className="panel tall">
        <div className="panel-heading">
          <div>
            <h2>分类观看时长</h2>
            <p>只统计已计入的完播视频</p>
          </div>
        </div>
        <div className="chart-box tall clickable-chart">
          {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
            <BarChart
              data={data.categories}
              margin={{ top: 14, right: 20, left: 0, bottom: 4 }}
              onClick={(payload) => {
                const category = resolveChartDatum(payload, data.categories);
                if (category?.name) {
                  router.push(buildHistoryHref({ category: category.name }));
                }
              }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCompactDuration} tickLine={false} axisLine={false} width={52} />
              <Tooltip formatter={(value) => formatDuration(Number(value))} />
              <Bar
                dataKey="seconds"
                radius={[8, 8, 0, 0]}
                isAnimationActive={false}
                onClick={(entry) => {
                  const category = resolveChartDatum(entry, data.categories);
                  if (category?.name) {
                    router.push(buildHistoryHref({ category: category.name }));
                  }
                }}
              >
                {data.categories.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer> : null}
        </div>
      </article>

      <div className="rank-grid">
        {data.categories.map((item, index) => (
          <Link key={item.name} href={buildHistoryHref({ category: item.name })} className="rank-card">
            <span>#{index + 1}</span>
            <strong>{item.name}</strong>
            <small>
              {formatDuration(item.seconds)} / {item.videos} 个视频
            </small>
          </Link>
        ))}
      </div>
    </section>
  );
}
