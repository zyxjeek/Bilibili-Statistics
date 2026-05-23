"use client";

import { HistoryTable } from "@/components/history-table";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { needsLongVideoReview } from "@/lib/watch-metrics";

export default function ReviewPage() {
  const data = useDashboardData();
  const rows = data.rows.filter(needsLongVideoReview);

  return (
    <HistoryTable
      rows={rows}
      title="待审核长视频"
      description="这些视频时长至少 20 分钟，且进度距离结尾不超过 1 分钟；请确认是否计入统计。"
      emptyMessage="没有待审核的长视频。"
      showFilters={false}
    />
  );
}
