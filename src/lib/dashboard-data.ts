import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { sampleRows } from "./sample-data";
import { getWatchedSeconds, hasWatchedSeconds, normalizeHistoryRow } from "./watch-metrics";
import type {
  CategoryStat,
  CreatorStat,
  DashboardData,
  PeriodKey,
  SeriesPoint,
  StatCard,
  WatchHistoryRow,
} from "./types";

type SyncRunRow = DashboardData["lastSync"];

export async function getDashboardData(): Promise<DashboardData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return buildDashboardData(sampleRows, null, true);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const since = subMonths(new Date(), 13).toISOString();
  const [historyResult, syncResult] = await Promise.all([
    supabase
      .from("watch_history")
      .select("*")
      .gte("view_at", since)
      .order("view_at", { ascending: false })
      .limit(10000),
    supabase
      .from("sync_runs")
      .select("status, started_at, finished_at, fetched_count, error_message")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (historyResult.error) {
    console.error("Failed to load watch_history", historyResult.error);
    return buildDashboardData(sampleRows, null, true);
  }

  const rows = (historyResult.data ?? []) as WatchHistoryRow[];
  const syncRun = (syncResult.data ?? null) as SyncRunRow;

  return buildDashboardData(rows, syncRun, false);
}

function buildDashboardData(
  inputRows: WatchHistoryRow[],
  lastSync: SyncRunRow,
  isDemo: boolean,
): DashboardData {
  const rows = inputRows
    .filter((row) => row.view_at)
    .map(normalizeHistoryRow)
    .sort((a, b) => new Date(b.view_at).getTime() - new Date(a.view_at).getTime());

  return {
    rows,
    statCards: buildStatCards(rows),
    dailySeries: buildDailySeries(rows),
    weeklySeries: buildRollingWeekSeries(rows),
    monthlySeries: buildMonthlySeries(rows),
    yearlySeries: buildYearlySeries(rows),
    categories: buildCategoryStats(rows),
    creators: buildCreatorStats(rows),
    lastSync,
    isDemo,
  };
}

function rowSeconds(row: WatchHistoryRow) {
  return getWatchedSeconds(row);
}

function buildStatCards(rows: WatchHistoryRow[]): StatCard[] {
  const now = new Date();
  const periods: Array<{ key: PeriodKey; label: string; start: Date; end: Date }> = [
    { key: "today", label: "今日观看", start: startOfDay(now), end: endOfDay(now) },
    {
      key: "week",
      label: "本周观看",
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    },
    { key: "month", label: "本月观看", start: startOfMonth(now), end: endOfMonth(now) },
    { key: "year", label: "今年观看", start: startOfYear(now), end: endOfYear(now) },
  ];

  return periods.map((period) => {
    const scoped = rows.filter((row) => {
      const viewedAt = new Date(row.view_at);
      return viewedAt >= period.start && viewedAt <= now && hasWatchedSeconds(row);
    });

    return {
      key: period.key,
      label: period.label,
      seconds: scoped.reduce((sum, row) => sum + rowSeconds(row), 0),
      videos: scoped.length,
      creators: new Set(scoped.map((row) => row.author_mid ?? row.author_name)).size,
      from: period.start.toISOString(),
      to: period.end.toISOString(),
    };
  });
}

function buildDailySeries(rows: WatchHistoryRow[]): SeriesPoint[] {
  const start = startOfDay(subDays(new Date(), 29));
  const end = endOfDay(new Date());
  const days = eachDayOfInterval({ start, end });

  return days.map((day) => {
    const label = format(day, "MM-dd");
    const scoped = rows.filter((row) => format(new Date(row.view_at), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
    return toPoint(label, scoped, startOfDay(day), endOfDay(day));
  });
}

function buildRollingWeekSeries(rows: WatchHistoryRow[]): SeriesPoint[] {
  return Array.from({ length: 12 }).map((_, index) => {
    const end = endOfDay(subDays(new Date(), (11 - index) * 7));
    const start = startOfDay(subDays(end, 6));
    const scoped = rows.filter((row) => {
      const viewedAt = new Date(row.view_at);
      return viewedAt >= start && viewedAt <= end;
    });

    return toPoint(format(start, "MM-dd"), scoped, start, end);
  });
}

function buildMonthlySeries(rows: WatchHistoryRow[]): SeriesPoint[] {
  const months = eachMonthOfInterval({
    start: startOfMonth(subMonths(new Date(), 11)),
    end: startOfMonth(new Date()),
  });

  return months.map((month) => {
    const scoped = rows.filter((row) => format(new Date(row.view_at), "yyyy-MM") === format(month, "yyyy-MM"));
    return toPoint(format(month, "yyyy-MM"), scoped, startOfMonth(month), endOfMonth(month));
  });
}

function buildYearlySeries(rows: WatchHistoryRow[]): SeriesPoint[] {
  const map = new Map<string, WatchHistoryRow[]>();

  rows.forEach((row) => {
    const key = format(new Date(row.view_at), "yyyy");
    map.set(key, [...(map.get(key) ?? []), row]);
  });

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, scoped]) => {
      const start = startOfYear(new Date(Number(label), 0, 1));
      return toPoint(label, scoped, start, endOfYear(start));
    });
}

function toPoint(label: string, rows: WatchHistoryRow[], from: Date, to: Date): SeriesPoint {
  const scoped = rows.filter(hasWatchedSeconds);
  return {
    label,
    seconds: scoped.reduce((sum, row) => sum + rowSeconds(row), 0),
    videos: scoped.length,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function buildCategoryStats(rows: WatchHistoryRow[]): CategoryStat[] {
  const map = new Map<string, CategoryStat>();

  rows.filter(hasWatchedSeconds).forEach((row) => {
    const name = row.tag_name || "未分类";
    const current = map.get(name) ?? { name, seconds: 0, videos: 0 };
    current.seconds += rowSeconds(row);
    current.videos += 1;
    map.set(name, current);
  });

  return [...map.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 12);
}

function buildCreatorStats(rows: WatchHistoryRow[]): CreatorStat[] {
  const map = new Map<string, CreatorStat>();

  rows.filter(hasWatchedSeconds).forEach((row) => {
    const key = String(row.author_mid ?? row.author_name ?? "unknown");
    const current = map.get(key) ?? {
      mid: row.author_mid,
      name: row.author_name || "未知 UP 主",
      seconds: 0,
      videos: 0,
    };
    current.seconds += rowSeconds(row);
    current.videos += 1;
    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 20);
}
