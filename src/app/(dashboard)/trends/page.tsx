"use client";

import { TrendCharts } from "@/components/trend-charts";
import { useDashboardData } from "@/components/dashboard-data-provider";

export default function TrendsPage() {
  return <TrendCharts data={useDashboardData()} />;
}
