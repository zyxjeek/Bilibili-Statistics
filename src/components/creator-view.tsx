"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

export function CreatorView({ data }: { data: DashboardData }) {
  const mounted = useMounted();
  const router = useRouter();
  const chartData = data.creators.slice(0, 15);

  return (
    <section className="stack">
      <article className="panel tall">
        <div className="panel-heading">
          <div>
            <h2>Top UP 主观看时长</h2>
            <p>按近一年已计入的完播视频聚合</p>
          </div>
        </div>
        <div className="chart-box tall clickable-chart">
          {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 14, right: 24, left: 32, bottom: 4 }}
              onClick={(payload) => {
                const creator = resolveChartDatum(payload, chartData);
                if (creator) {
                  router.push(buildHistoryHref({ creator: creator.name, creatorMid: creator.mid }));
                }
              }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 23, 42, 0.08)" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCompactDuration} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatDuration(Number(value))} />
              <Bar
                dataKey="seconds"
                fill="#fb7299"
                radius={[0, 8, 8, 0]}
                isAnimationActive={false}
                onClick={(entry) => {
                  const creator = resolveChartDatum(entry, chartData);
                  if (creator) {
                    router.push(buildHistoryHref({ creator: creator.name, creatorMid: creator.mid }));
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer> : null}
        </div>
      </article>

      <article className="panel">
        <div className="panel-heading">
          <div>
            <h2>排行明细</h2>
            <p>观看时长、视频数量和 MID</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>UP 主</th>
                <th>观看时长</th>
                <th>视频数</th>
                <th>MID</th>
              </tr>
            </thead>
            <tbody>
              {data.creators.map((creator, index) => (
                <tr
                  key={`${creator.mid}-${creator.name}`}
                  className="clickable-row"
                  onClick={() => router.push(buildHistoryHref({ creator: creator.name, creatorMid: creator.mid }))}
                >
                  <td>#{index + 1}</td>
                  <td>{creator.name}</td>
                  <td>{formatDuration(creator.seconds)}</td>
                  <td>{creator.videos}</td>
                  <td>{creator.mid ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
