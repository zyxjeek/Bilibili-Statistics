import {
  BarChart3,
  CalendarClock,
  ChartNoAxesCombined,
  Clapperboard,
  LayoutDashboard,
  Tags,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { DashboardData } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { OverviewCharts } from "./overview-charts";
import { TrendCharts } from "./trend-charts";
import { CategoryView } from "./category-view";
import { CreatorView } from "./creator-view";
import { HistoryTable } from "./history-table";

type DashboardView = "overview" | "trends" | "categories" | "creators" | "history";

type DashboardShellProps = {
  data: DashboardData;
  activeView: DashboardView;
};

const navItems = [
  { href: "/overview", label: "总览", icon: LayoutDashboard, view: "overview" },
  { href: "/trends", label: "趋势", icon: ChartNoAxesCombined, view: "trends" },
  { href: "/categories", label: "分类", icon: Tags, view: "categories" },
  { href: "/creators", label: "UP主", icon: UserRound, view: "creators" },
  { href: "/history", label: "明细", icon: Clapperboard, view: "history" },
] satisfies Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  view: DashboardView;
}>;

const viewTitles: Record<DashboardView, { title: string; description: string }> = {
  overview: {
    title: "观看统计",
    description: "按观看时长、分类和 UP 主追踪你的 Bilibili 内容习惯。",
  },
  trends: {
    title: "观看趋势",
    description: "查看每日、每周、每月和年度观看时长变化。",
  },
  categories: {
    title: "内容分类",
    description: "按 Bilibili 历史记录中的分类标签统计视频时长和数量。",
  },
  creators: {
    title: "UP 主排行",
    description: "找出你投入最多观看时间的创作者。",
  },
  history: {
    title: "观看明细",
    description: "按日期、分类和 UP 主筛选最近观看记录。",
  },
};

export function DashboardShell({ data, activeView }: DashboardShellProps) {
  const totalSeconds = data.statCards.find((card) => card.key === "year")?.seconds ?? 0;
  const title = viewTitles[activeView];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/overview" className="brand" aria-label="回到总览">
          <span className="brand-mark">B</span>
          <span>
            <strong>Bili Stats</strong>
            <small>个人观看记录</small>
          </span>
        </Link>

        <nav className="nav-list" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={item.view === activeView ? "nav-item active" : "nav-item"}
              >
                <Icon size={18} strokeWidth={2.1} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-label">今年累计</div>
          <div className="mini-value">{formatDuration(totalSeconds)}</div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>{title.title}</h1>
            <p>{title.description}</p>
          </div>
          <div className="sync-chip" title={data.lastSync?.error_message ?? undefined}>
            <CalendarClock size={17} />
            <span>
              {data.isDemo
                ? "演示数据"
                : data.lastSync?.finished_at
                  ? `同步于 ${formatDateTime(data.lastSync.finished_at)}`
                  : "等待首次同步"}
            </span>
          </div>
        </header>

        {data.isDemo ? (
          <div className="notice">
            当前展示演示数据。配置 Supabase 环境变量并运行同步脚本后，页面会自动切换到真实观看记录。
          </div>
        ) : null}

        {activeView === "overview" ? <Overview data={data} /> : null}
        {activeView === "trends" ? <TrendCharts data={data} /> : null}
        {activeView === "categories" ? <CategoryView data={data} /> : null}
        {activeView === "creators" ? <CreatorView data={data} /> : null}
        {activeView === "history" ? <HistoryTable rows={data.rows} /> : null}
      </main>
    </div>
  );
}

function Overview({ data }: { data: DashboardData }) {
  return (
    <div className="dashboard-grid">
      <section className="kpi-grid" aria-label="核心统计">
        {data.statCards.map((card) => (
          <article key={card.key} className="metric-card">
            <div className="metric-icon">
              <BarChart3 size={18} />
            </div>
            <span>{card.label}</span>
            <strong>{formatDuration(card.seconds)}</strong>
            <small>
              {card.videos} 个视频 / {card.creators} 位 UP 主
            </small>
          </article>
        ))}
      </section>
      <OverviewCharts data={data} />
      <HistoryTable rows={data.rows.slice(0, 12)} compact />
    </div>
  );
}
