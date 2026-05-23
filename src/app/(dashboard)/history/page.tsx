"use client";

import { HistoryTable } from "@/components/history-table";
import { useDashboardData } from "@/components/dashboard-data-provider";

export default function HistoryPage() {
  return <HistoryTable rows={useDashboardData().rows} />;
}
