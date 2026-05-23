"use client";

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
import { formatCompactDuration, formatDuration } from "@/lib/format";
import { useMounted } from "./use-mounted";

export function CreatorView({ data }: { data: DashboardData }) {
  const mounted = useMounted();

  return (
    <section className="stack">
      <article className="panel tall">
        <div className="panel-heading">
          <div>
            <h2>Top UP 主观看时长</h2>
            <p>按近一年有效观看进度聚合</p>
          </div>
        </div>
        <div className="chart-box tall">
          {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
            <BarChart data={data.creators.slice(0, 15)} layout="vertical" margin={{ top: 14, right: 24, left: 32, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(15, 23, 42, 0.08)" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCompactDuration} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatDuration(Number(value))} />
              <Bar dataKey="seconds" fill="#fb7299" radius={[0, 8, 8, 0]} isAnimationActive={false} />
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
                <tr key={`${creator.mid}-${creator.name}`}>
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
