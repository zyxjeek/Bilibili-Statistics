export type WatchHistoryRow = {
  id: string;
  business: string | null;
  kid: string | null;
  title: string;
  bvid: string | null;
  author_mid: number | null;
  author_name: string | null;
  tag_name: string | null;
  duration: number | null;
  progress: number | null;
  view_at: string;
  cover: string | null;
  uri: string | null;
  raw: unknown;
  created_at?: string;
  updated_at?: string;
};

export type PeriodKey = "today" | "week" | "month" | "year";

export type StatCard = {
  key: PeriodKey;
  label: string;
  seconds: number;
  videos: number;
  creators: number;
};

export type SeriesPoint = {
  label: string;
  seconds: number;
  videos: number;
};

export type CategoryStat = {
  name: string;
  seconds: number;
  videos: number;
};

export type CreatorStat = {
  mid: number | null;
  name: string;
  seconds: number;
  videos: number;
};

export type DashboardData = {
  rows: WatchHistoryRow[];
  statCards: StatCard[];
  dailySeries: SeriesPoint[];
  weeklySeries: SeriesPoint[];
  monthlySeries: SeriesPoint[];
  yearlySeries: SeriesPoint[];
  categories: CategoryStat[];
  creators: CreatorStat[];
  lastSync: {
    status: string;
    started_at: string | null;
    finished_at: string | null;
    fetched_count: number | null;
    error_message: string | null;
  } | null;
  isDemo: boolean;
};
